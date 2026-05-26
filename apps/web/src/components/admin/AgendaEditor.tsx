import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';

interface EditableSlot {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  locationId: string;
}

export function AgendaEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
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
          description: slot.description || '',
          startTime: toDatetimeLocal(slot.startTime),
          endTime: toDatetimeLocal(slot.endTime),
          locationId: slot.locationId || '',
        }))
      );
    }
  }, [agenda, editing]);

  const handleAdd = () => {
    setSlots([...slots, { title: '', description: '', startTime: '', endTime: '', locationId: '' }]);
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
      return t('agendaEditor.titleRequired');
    }
    if (slot.startTime && slot.endTime) {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      if (end <= start) {
        return t('agendaEditor.endAfterStart');
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
      toast.error(t('agendaEditor.fixErrors'));
      return;
    }

    const slotsToSave = slots.map((slot) => ({
      title: slot.title,
      description: slot.description || null,
      startTime: slot.startTime ? new Date(slot.startTime).toISOString() : null,
      endTime: slot.endTime ? new Date(slot.endTime).toISOString() : null,
      locationId: slot.locationId || null,
    }));

    try {
      await saveAgendaAction(slug, slotsToSave);
      setEditing(false);
      toast.success(t('agendaEditor.saveSuccess'));
    } catch (err) {
      console.error('Failed to save agenda:', err);
      toast.error(t('agendaEditor.saveError'));
    }
  };

  const handleCancel = () => {
    setSlots(
      agenda.map((slot) => ({
        title: slot.title,
        description: slot.description || '',
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
        <h2>{t('agendaEditor.title')}</h2>
        <button onClick={handleAdd} className="btn btn-secondary">
          {t('agendaEditor.addSlot')}
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
                  title={t('agendaEditor.moveUp')}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === slots.length - 1}
                  className="btn-icon"
                  title={t('agendaEditor.moveDown')}
                >
                  ↓
                </button>
                <button onClick={() => handleRemove(index)} className="btn-icon btn-danger" title={t('agendaEditor.remove')}>
                  ✕
                </button>
              </div>
              <div className="editor-item-fields">
                <input
                  type="text"
                  value={slot.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder={t('agendaEditor.titlePlaceholder')}
                  className={`form-input ${!slot.title.trim() ? 'input-error' : ''}`}
                />
                <textarea
                  value={slot.description}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  placeholder={t('agendaEditor.descriptionPlaceholder')}
                  className="form-input"
                  rows={2}
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
                  <option value="">{t('agendaEditor.noLocation')}</option>
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
            {loading ? t('agendaEditor.saving') : t('agendaEditor.saveAgenda')}
          </button>
          <button onClick={handleCancel} disabled={loading} className="btn btn-secondary">
            {t('agendaEditor.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
