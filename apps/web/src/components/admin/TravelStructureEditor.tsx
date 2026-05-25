import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAdminTravelHub, saveNotePage, saveTravelStructure } from '../../api/http';
import { NoteOwnerType, TravelHubDTO, TravelStructureInput } from '../../types';
import { useStore } from '../../store/useStore';

interface TravelStructureEditorProps {
  slug: string;
}

type EditablePlace = TravelStructureInput['places'][number];
type EditableStop = TravelStructureInput['stops'][number];
type EditableStep = EditableStop['steps'][number];

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function emptyPlace(): EditablePlace {
  return {
    id: null,
    stopId: null,
    parentId: null,
    title: '',
    lat: null,
    lng: null,
    address: '',
    category: '',
    summary: '',
  };
}

function emptyStep(): EditableStep {
  return {
    id: null,
    title: '',
    startsAt: null,
    endsAt: null,
    summary: '',
    routeMode: 'walk',
    places: [],
  };
}

function emptyStop(): EditableStop {
  return {
    id: null,
    title: '',
    startsAt: null,
    endsAt: null,
    lat: null,
    lng: null,
    summary: '',
    steps: [],
  };
}

function hubToInput(hub: TravelHubDTO): TravelStructureInput {
  return {
    places: hub.places.map((place) => ({
      id: place.id,
      stopId: place.stopId,
      parentId: place.parentId,
      title: place.title,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      category: place.category,
      summary: place.summary,
    })),
    stops: hub.stops.map((stop) => ({
      id: stop.id,
      title: stop.title,
      startsAt: stop.startsAt,
      endsAt: stop.endsAt,
      lat: stop.lat,
      lng: stop.lng,
      summary: stop.summary,
      steps: stop.steps.map((step) => ({
        id: step.id,
        title: step.title,
        startsAt: step.startsAt,
        endsAt: step.endsAt,
        summary: step.summary,
        routeMode: step.routeMode,
        places: step.stepPlaces.map((stepPlace) => ({
          placeId: stepPlace.placeId,
          role: stepPlace.role,
          routeStop: stepPlace.routeStop,
        })),
      })),
    })),
  };
}

export function TravelStructureEditor({ slug }: TravelStructureEditorProps) {
  const jwt = useStore((s) => s.jwt);
  const [hub, setHub] = useState<TravelHubDTO | null>(null);
  const [draft, setDraft] = useState<TravelStructureInput>({ stops: [], places: [] });
  const [selectedNote, setSelectedNote] = useState<{ ownerType: NoteOwnerType; ownerId: string; title: string; markdown: string; isSensitive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jwt) return;
    getAdminTravelHub(slug, jwt)
      .then((data) => {
        setHub(data);
        setDraft(hubToInput(data));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load travel structure'))
      .finally(() => setLoading(false));
  }, [slug, jwt]);

  const placeOptions = useMemo(() => draft.places.filter((place) => place.id && place.title.trim()), [draft.places]);

  const updatePlace = (index: number, updates: Partial<EditablePlace>) => {
    setDraft((current) => ({
      ...current,
      places: current.places.map((place, placeIndex) => placeIndex === index ? { ...place, ...updates } : place),
    }));
  };

  const updateStop = (index: number, updates: Partial<EditableStop>) => {
    setDraft((current) => ({
      ...current,
      stops: current.stops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...updates } : stop),
    }));
  };

  const updateStep = (stopIndex: number, stepIndex: number, updates: Partial<EditableStep>) => {
    setDraft((current) => ({
      ...current,
      stops: current.stops.map((stop, currentStopIndex) => {
        if (currentStopIndex !== stopIndex) return stop;
        return {
          ...stop,
          steps: stop.steps.map((step, currentStepIndex) => currentStepIndex === stepIndex ? { ...step, ...updates } : step),
        };
      }),
    }));
  };

  const save = async () => {
    if (!jwt) return;
    setSaving(true);
    try {
      const saved = await saveTravelStructure(slug, jwt, draft);
      setHub(saved);
      setDraft(hubToInput(saved));
      toast.success('Travel structure saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save travel structure');
    } finally {
      setSaving(false);
    }
  };

  const openNote = (ownerType: NoteOwnerType, ownerId: string, fallbackTitle: string) => {
    const existing = hub?.notes.find((note) => note.ownerType === ownerType && note.ownerId === ownerId);
    setSelectedNote({
      ownerType,
      ownerId,
      title: existing?.title ?? fallbackTitle,
      markdown: existing?.markdown ?? `# ${fallbackTitle}\n\n## Notes\n- `,
      isSensitive: existing?.isSensitive ?? false,
    });
  };

  const saveNote = async () => {
    if (!jwt || !selectedNote) return;
    try {
      await saveNotePage(slug, jwt, selectedNote);
      const refreshed = await getAdminTravelHub(slug, jwt);
      setHub(refreshed);
      toast.success('Note saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save note');
    }
  };

  if (loading) {
    return <div className="travel-empty">Loading travel editor...</div>;
  }

  return (
    <section className="travel-editor">
      <div className="travel-overview-card">
        <div>
          <p className="section-kicker">Travel Structure</p>
          <h2>Stops, Steps, Places and Markdown Notes</h2>
        </div>
        <div className="travel-editor-actions">
          {hub && <button className="btn btn-secondary" onClick={() => openNote('event', hub.event.id, hub.event.title)}>Event note</button>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save structure'}</button>
        </div>
      </div>

      <div className="travel-editor-grid">
        <div className="travel-editor-panel">
          <div className="travel-editor-panel-header">
            <h3>Places</h3>
            <button className="btn btn-secondary" onClick={() => setDraft((current) => ({ ...current, places: [...current.places, emptyPlace()] }))}>Add place</button>
          </div>
          {draft.places.map((place, index) => (
            <div className="travel-editor-card" key={place.id ?? `place-${index}`}>
              <input className="form-input" value={place.title} onChange={(event) => updatePlace(index, { title: event.target.value })} placeholder="Hotel, station, restaurant..." />
              <div className="travel-editor-row">
                <input className="form-input" value={place.category ?? ''} onChange={(event) => updatePlace(index, { category: event.target.value })} placeholder="hotel, food, station" />
                <select className="form-select" value={place.stopId ?? ''} onChange={(event) => updatePlace(index, { stopId: event.target.value || null })}>
                  <option value="">Global place</option>
                  {draft.stops.map((stop, stopIndex) => <option key={stop.id ?? stopIndex} value={stop.id ?? ''}>{stop.title || `Stop ${stopIndex + 1}`}</option>)}
                </select>
              </div>
              <div className="travel-editor-row">
                <input className="form-input" type="number" step="any" value={place.lat ?? ''} onChange={(event) => updatePlace(index, { lat: event.target.value ? Number(event.target.value) : null })} placeholder="Latitude" />
                <input className="form-input" type="number" step="any" value={place.lng ?? ''} onChange={(event) => updatePlace(index, { lng: event.target.value ? Number(event.target.value) : null })} placeholder="Longitude" />
              </div>
              <input className="form-input" value={place.address ?? ''} onChange={(event) => updatePlace(index, { address: event.target.value })} placeholder="Address" />
              <textarea className="form-textarea" value={place.summary ?? ''} onChange={(event) => updatePlace(index, { summary: event.target.value })} placeholder="Short place summary" />
              <div className="travel-editor-actions">
                {place.id && <button className="btn btn-secondary" onClick={() => openNote('place', place.id!, place.title || 'Place note')}>Markdown note</button>}
                <button className="btn btn-danger" onClick={() => setDraft((current) => ({ ...current, places: current.places.filter((_, placeIndex) => placeIndex !== index) }))}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="travel-editor-panel">
          <div className="travel-editor-panel-header">
            <h3>Stops and Steps</h3>
            <button className="btn btn-secondary" onClick={() => setDraft((current) => ({ ...current, stops: [...current.stops, emptyStop()] }))}>Add stop</button>
          </div>
          {draft.stops.map((stop, stopIndex) => (
            <div className="travel-editor-card" key={stop.id ?? `stop-${stopIndex}`}>
              <input className="form-input" value={stop.title} onChange={(event) => updateStop(stopIndex, { title: event.target.value })} placeholder="Tokyo, Osaka, Hiroshima..." />
              <div className="travel-editor-row">
                <input className="form-input" type="datetime-local" value={toDatetimeLocal(stop.startsAt)} onChange={(event) => updateStop(stopIndex, { startsAt: fromDatetimeLocal(event.target.value) })} />
                <input className="form-input" type="datetime-local" value={toDatetimeLocal(stop.endsAt)} onChange={(event) => updateStop(stopIndex, { endsAt: fromDatetimeLocal(event.target.value) })} />
              </div>
              <div className="travel-editor-row">
                <input className="form-input" type="number" step="any" value={stop.lat ?? ''} onChange={(event) => updateStop(stopIndex, { lat: event.target.value ? Number(event.target.value) : null })} placeholder="Stop latitude" />
                <input className="form-input" type="number" step="any" value={stop.lng ?? ''} onChange={(event) => updateStop(stopIndex, { lng: event.target.value ? Number(event.target.value) : null })} placeholder="Stop longitude" />
              </div>
              <textarea className="form-textarea" value={stop.summary ?? ''} onChange={(event) => updateStop(stopIndex, { summary: event.target.value })} placeholder="Short stop summary" />
              <div className="travel-editor-actions">
                {stop.id && <button className="btn btn-secondary" onClick={() => openNote('stop', stop.id!, stop.title || 'Stop note')}>Stop note</button>}
                <button className="btn btn-secondary" onClick={() => updateStop(stopIndex, { steps: [...stop.steps, emptyStep()] })}>Add step</button>
                <button className="btn btn-danger" onClick={() => setDraft((current) => ({ ...current, stops: current.stops.filter((_, currentStopIndex) => currentStopIndex !== stopIndex) }))}>Remove stop</button>
              </div>

              {stop.steps.map((step, stepIndex) => (
                <div className="travel-editor-step" key={step.id ?? `step-${stepIndex}`}>
                  <input className="form-input" value={step.title} onChange={(event) => updateStep(stopIndex, stepIndex, { title: event.target.value })} placeholder="Hotel stay, breakfast, train..." />
                  <div className="travel-editor-row">
                    <input className="form-input" type="datetime-local" value={toDatetimeLocal(step.startsAt)} onChange={(event) => updateStep(stopIndex, stepIndex, { startsAt: fromDatetimeLocal(event.target.value) })} />
                    <input className="form-input" type="datetime-local" value={toDatetimeLocal(step.endsAt)} onChange={(event) => updateStep(stopIndex, stepIndex, { endsAt: fromDatetimeLocal(event.target.value) })} />
                  </div>
                  <textarea className="form-textarea" value={step.summary ?? ''} onChange={(event) => updateStep(stopIndex, stepIndex, { summary: event.target.value })} placeholder="Short step summary" />
                  <div className="travel-place-chips">
                    {step.places.map((stepPlace, placeIndex) => (
                      <button className="travel-chip" key={`${stepPlace.placeId}-${placeIndex}`} onClick={() => updateStep(stopIndex, stepIndex, { places: step.places.filter((_, currentPlaceIndex) => currentPlaceIndex !== placeIndex) })}>
                        {placeOptions.find((place) => place.id === stepPlace.placeId)?.title ?? 'Unknown place'}
                        <span>{stepPlace.role || 'route'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="travel-editor-row">
                    <select className="form-select" onChange={(event) => {
                      if (!event.target.value) return;
                      updateStep(stopIndex, stepIndex, { places: [...step.places, { placeId: event.target.value, role: 'primary', routeStop: true }] });
                      event.currentTarget.value = '';
                    }}>
                      <option value="">Attach place...</option>
                      {placeOptions.map((place) => <option key={place.id} value={place.id!}>{place.title}</option>)}
                    </select>
                    {step.id && <button className="btn btn-secondary" onClick={() => openNote('step', step.id!, step.title || 'Step note')}>Step note</button>}
                    <button className="btn btn-danger" onClick={() => updateStop(stopIndex, { steps: stop.steps.filter((_, currentStepIndex) => currentStepIndex !== stepIndex) })}>Remove step</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {selectedNote && (
        <div className="travel-note-editor">
          <div className="travel-editor-panel-header">
            <h3>{selectedNote.title}</h3>
            <label className="travel-sensitive-toggle">
              <input type="checkbox" checked={selectedNote.isSensitive} onChange={(event) => setSelectedNote({ ...selectedNote, isSensitive: event.target.checked })} />
              Sensitive/admin-only
            </label>
          </div>
          <input className="form-input" value={selectedNote.title} onChange={(event) => setSelectedNote({ ...selectedNote, title: event.target.value })} />
          <textarea className="form-textarea travel-markdown-editor" value={selectedNote.markdown} onChange={(event) => setSelectedNote({ ...selectedNote, markdown: event.target.value })} />
          <div className="travel-editor-actions">
            <button className="btn btn-primary" onClick={saveNote}>Save note</button>
            <button className="btn btn-secondary" onClick={() => setSelectedNote(null)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
