import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { getTravelHub } from '../api/http';
import { NotePageDTO, TravelHubDTO, TravelPlaceDTO, TravelStopDTO } from '../types';
import { MarkdownNote } from './MarkdownNote';

interface TravelHubPanelProps {
  slug: string;
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'No time set';
  const startText = start ? new Date(start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Open start';
  const endText = end ? new Date(end).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Open end';
  return `${startText} → ${endText}`;
}

function getNote(notes: NotePageDTO[], ownerType: NotePageDTO['ownerType'], ownerId: string) {
  return notes.find((note) => note.ownerType === ownerType && note.ownerId === ownerId);
}

function getPosition(item: { lat: number | null; lng: number | null }): [number, number] | null {
  if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return null;
  return [item.lat, item.lng];
}

export function TravelHubPanel({ slug }: TravelHubPanelProps) {
  const [hub, setHub] = useState<TravelHubDTO | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getTravelHub(slug)
      .then((data) => {
        setHub(data);
        setSelectedStopId(data.stops[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load travel hub'))
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedStop = useMemo(() => {
    if (!hub || !selectedStopId) return null;
    return hub.stops.find((stop) => stop.id === selectedStopId) ?? null;
  }, [hub, selectedStopId]);

  const selectedPlace = useMemo(() => {
    if (!hub || !selectedPlaceId) return null;
    return hub.places.find((place) => place.id === selectedPlaceId) ?? null;
  }, [hub, selectedPlaceId]);

  const visiblePlaces = useMemo(() => {
    if (!hub) return [];
    if (!selectedStop) return hub.places;
    return hub.places.filter((place) => place.stopId === selectedStop.id || selectedStop.steps.some((step) => step.stepPlaces.some((stepPlace) => stepPlace.placeId === place.id)));
  }, [hub, selectedStop]);

  const routePositions = useMemo(() => {
    if (!selectedStop) return [];
    const positions: [number, number][] = [];

    selectedStop.steps.forEach((step) => {
      step.stepPlaces
        .filter((stepPlace) => stepPlace.routeStop)
        .forEach((stepPlace) => {
          const position = getPosition(stepPlace.place);
          if (position) positions.push(position);
        });
    });

    return positions;
  }, [selectedStop]);

  const mapCenter = useMemo<[number, number]>(() => {
    const stopPosition = selectedStop ? getPosition(selectedStop) : null;
    if (stopPosition) return stopPosition;
    const firstPlace = visiblePlaces.find((place) => getPosition(place));
    return firstPlace ? getPosition(firstPlace)! : [35.6762, 139.6503];
  }, [selectedStop, visiblePlaces]);

  if (loading) {
    return <div className="travel-empty">Loading travel structure...</div>;
  }

  if (error) {
    return <div className="form-error">{error}</div>;
  }

  if (!hub) {
    return <div className="travel-empty">No travel data available.</div>;
  }

  const eventNote = getNote(hub.notes, 'event', hub.event.id);

  return (
    <section className="travel-hub">
      <div className="travel-overview-card">
        <div>
          <p className="section-kicker">Travel Hub</p>
          <h2>{hub.event.title}</h2>
        </div>
        <div className="travel-stats">
          <span>{hub.stops.length} stops</span>
          <span>{hub.places.length} places</span>
          <span>{hub.notes.length} notes</span>
        </div>
      </div>

      {eventNote && (
        <article className="travel-note-card">
          <h3>{eventNote.title}</h3>
          <MarkdownNote markdown={eventNote.markdown} />
        </article>
      )}

      <div className="travel-layout">
        <aside className="travel-stop-list">
          <h3>Stops</h3>
          {hub.stops.length === 0 && <p className="travel-muted">No stops yet. Add Tokyo, Osaka, Hiroshima...</p>}
          {hub.stops.map((stop: TravelStopDTO) => (
            <button
              key={stop.id}
              className={`travel-stop-button ${selectedStopId === stop.id ? 'active' : ''}`}
              onClick={() => setSelectedStopId(stop.id)}
            >
              <strong>{stop.title}</strong>
              <span>{formatDateRange(stop.startsAt, stop.endsAt)}</span>
            </button>
          ))}
        </aside>

        <div className="travel-main">
          <div className="travel-map-card">
            <MapContainer center={mapCenter} zoom={selectedStop ? 12 : 6} className="travel-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {hub.stops.map((stop) => {
                const position = getPosition(stop);
                if (!position) return null;
                return (
                  <Marker key={stop.id} position={position} eventHandlers={{ click: () => setSelectedStopId(stop.id) }}>
                    <Popup>{stop.title}</Popup>
                  </Marker>
                );
              })}
              {visiblePlaces.map((place: TravelPlaceDTO) => {
                const position = getPosition(place);
                if (!position) return null;
                return (
                  <Marker key={place.id} position={position} eventHandlers={{ click: () => setSelectedPlaceId(place.id) }}>
                    <Popup>
                      <strong>{place.title}</strong>
                      {place.category && <><br />{place.category}</>}
                    </Popup>
                  </Marker>
                );
              })}
              {routePositions.length > 1 && <Polyline positions={routePositions} />}
            </MapContainer>
          </div>

          {selectedStop && (
            <article className="travel-detail-card">
              <p className="section-kicker">Selected Stop</p>
              <h2>{selectedStop.title}</h2>
              <p className="travel-muted">{formatDateRange(selectedStop.startsAt, selectedStop.endsAt)}</p>
              {selectedStop.summary && <p>{selectedStop.summary}</p>}
              {getNote(hub.notes, 'stop', selectedStop.id) && (
                <MarkdownNote markdown={getNote(hub.notes, 'stop', selectedStop.id)!.markdown} />
              )}

              <div className="travel-step-list">
                {selectedStop.steps.map((step) => (
                  <div key={step.id} className="travel-step-card">
                    <div>
                      <h3>{step.title}</h3>
                      <p className="travel-muted">{formatDateRange(step.startsAt, step.endsAt)}</p>
                      {step.summary && <p>{step.summary}</p>}
                    </div>
                    {step.stepPlaces.length > 0 && (
                      <div className="travel-place-chips">
                        {step.stepPlaces.map((stepPlace) => (
                          <button key={stepPlace.id} className="travel-chip" onClick={() => setSelectedPlaceId(stepPlace.placeId)}>
                            {stepPlace.place.title}
                            {stepPlace.role && <span>{stepPlace.role}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {getNote(hub.notes, 'step', step.id) && (
                      <MarkdownNote markdown={getNote(hub.notes, 'step', step.id)!.markdown} />
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}

          {selectedPlace && (
            <article className="travel-detail-card">
              <p className="section-kicker">Selected Place</p>
              <h2>{selectedPlace.title}</h2>
              <p className="travel-muted">{[selectedPlace.category, selectedPlace.address].filter(Boolean).join(' · ')}</p>
              {selectedPlace.summary && <p>{selectedPlace.summary}</p>}
              {getNote(hub.notes, 'place', selectedPlace.id) && (
                <MarkdownNote markdown={getNote(hub.notes, 'place', selectedPlace.id)!.markdown} />
              )}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
