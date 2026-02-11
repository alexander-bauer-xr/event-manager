import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

interface EditableSlot {
  title: string;
  startTime: string;
  endTime: string;
  locationId: string;
}

export function AgendaEditor() {
  const { slug } = useParams<{ slug: string }>();
  const agenda = useStore((s) => s.agenda);
  const locations = useStore((s) => s.locations);
  const saveAgendaAction = useStore((s) => s.saveAgendaAction);
  const loading = useStore((s) => s.loading);

  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [editing, setEditing] = useState(false);

  // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (isoString: string | null): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (!editing) {
      setSlots(
        agenda.map((slot) => ({
          title: slot.title,
          startTime: toDatetimeLocal(slot.startTime),
          endTime: toDatetimeLocal(slot.endTime),
          locationId: slot.locationId || '',
        }))
      );
    }
  }, [agenda, editing]);

  const handleAdd = () => {
    setSlots([...slots, { title: '', startTime: '', endTime: '', locationId: '' }]);
    setEditing(true);
  };

  const handleRemove = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
    setEditing(true);
  };

  const handleChange = (index: number, field: keyof EditableSlot, value: string) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
    setEditing(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...slots];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSlots(updated);
    setEditing(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === slots.length - 1) return;
    const updated = [...slots];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSlots(updated);
    setEditing(true);
  };

  const validateSlot = (slot: EditableSlot): string | null => {
    if (!slot.title.trim()) {
      return 'Title is required';
    }
    if (slot.startTime && slot.endTime) {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      if (end <= start) {
        return 'End time must be after start time';
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!slug) return;

    // Validate all slots
    const errors = slots.map(validateSlot);
    const hasErrors = errors.some(error => error !== null);

    if (hasErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    const slotsToSave = slots.map((slot) => ({
      title: slot.title,
      startTime: slot.startTime ? new Date(slot.startTime).toISOString() : null,
      endTime: slot.endTime ? new Date(slot.endTime).toISOString() : null,
      locationId: slot.locationId || null,
    }));

    try {
      await saveAgendaAction(slug, slotsToSave);
      setEditing(false);
      toast.success('Agenda saved successfully!');
    } catch (err) {
      console.error('Failed to save agenda:', err);
      toast.error('Failed to save agenda. Please try again.');
    }
  };

  const handleCancel = () => {
    setSlots(
      agenda.map((slot) => ({
        title: slot.title,
        startTime: toDatetimeLocal(slot.startTime),
        endTime: toDatetimeLocal(slot.endTime),
        locationId: slot.locationId || '',
      }))
    );
    setEditing(false);
  };

  return (
    <div className="agenda-editor">
      <div className="editor-header">
        <h2>Agenda Editor</h2>
        <button onClick={handleAdd} className="btn btn-secondary">
          Add Slot
        </button>
      </div>

      <div className="editor-list">
        {slots.map((slot, index) => {
          const validationError = validateSlot(slot);
          return (
            <div key={index} className="editor-item">
              <div className="editor-item-controls">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="btn-icon"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === slots.length - 1}
                  className="btn-icon"
                  title="Move down"
                >
                  ↓
                </button>
                <button onClick={() => handleRemove(index)} className="btn-icon btn-danger" title="Remove">
                  ✕
                </button>
              </div>
              <div className="editor-item-fields">
                <input
                  type="text"
                  value={slot.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder="Title"
                  className={`form-input ${!slot.title.trim() ? 'input-error' : ''}`}
                />
                <input
                  type="datetime-local"
                  value={slot.startTime}
                  onChange={(e) => handleChange(index, 'startTime', e.target.value)}
                  className="form-input"
                />
                <input
                  type="datetime-local"
                  value={slot.endTime}
                  onChange={(e) => handleChange(index, 'endTime', e.target.value)}
                  className="form-input"
                />
                <select
                  value={slot.locationId}
                  onChange={(e) => handleChange(index, 'locationId', e.target.value)}
                  className="form-select"
                >
                  <option value="">No location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.title}
                    </option>
                  ))}
                </select>
                {validationError && (
                  <div className="validation-error">{validationError}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="editor-actions">
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : 'Save Agenda'}
          </button>
          <button onClick={handleCancel} disabled={loading} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
