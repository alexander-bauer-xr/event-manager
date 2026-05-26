import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';

interface EditableLocation {
  title: string;
  lat: string;
  lng: string;
  address: string;
  note: string;
}

export function LocationsEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const locations = useStore((s) => s.locations);
  const saveLocationsAction = useStore((s) => s.saveLocationsAction);
  const loading = useStore((s) => s.loading);

  const [editLocations, setEditLocations] = useState<EditableLocation[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setEditLocations(
        locations.map((loc) => ({
          title: loc.title,
          lat: loc.lat?.toString() || '',
          lng: loc.lng?.toString() || '',
          address: loc.address || '',
          note: loc.note || '',
        }))
      );
    }
  }, [locations, editing]);

  const handleAdd = () => {
    setEditLocations([...editLocations, { title: '', lat: '', lng: '', address: '', note: '' }]);
    setEditing(true);
  };

  const handleRemove = (index: number) => {
    setEditLocations(editLocations.filter((_, i) => i !== index));
    setEditing(true);
  };

  const handleChange = (index: number, field: keyof EditableLocation, value: string) => {
    const updated = [...editLocations];
    updated[index] = { ...updated[index], [field]: value };
    setEditLocations(updated);
    setEditing(true);
  };

  const validateLocation = (loc: EditableLocation): { error: string | null; warning: string | null } => {
    if (!loc.title.trim()) {
      return { error: t('locationsEditor.titleRequired'), warning: null };
    }

    const hasLat = loc.lat.trim() !== '';
    const hasLng = loc.lng.trim() !== '';

    if (hasLat !== hasLng) {
      return { error: t('locationsEditor.bothCoordsRequired'), warning: null };
    }

    if (hasLat && hasLng) {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return { error: t('locationsEditor.invalidCoords'), warning: null };
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { error: t('locationsEditor.coordsOutOfRange'), warning: null };
      }
    } else {
      return { error: null, warning: t('locationsEditor.noMapWarning') };
    }

    return { error: null, warning: null };
  };

  const handleSave = async () => {
    if (!slug) return;

    // Validate all locations
    const validations = editLocations.map(validateLocation);
    const hasErrors = validations.some(v => v.error !== null);

    if (hasErrors) {
      toast.error(t('locationsEditor.fixErrors'));
      return;
    }

    const locationsToSave = editLocations.map((loc) => ({
      title: loc.title,
      lat: loc.lat ? parseFloat(loc.lat) : null,
      lng: loc.lng ? parseFloat(loc.lng) : null,
      address: loc.address || null,
      note: loc.note || null,
    }));

    try {
      await saveLocationsAction(slug, locationsToSave);
      setEditing(false);
      toast.success(t('locationsEditor.saveSuccess'));
    } catch (err) {
      console.error('Failed to save locations:', err);
      toast.error(t('locationsEditor.saveError'));
    }
  };

  const handleCancel = () => {
    setEditLocations(
      locations.map((loc) => ({
        title: loc.title,
        lat: loc.lat?.toString() || '',
        lng: loc.lng?.toString() || '',
        address: loc.address || '',
        note: loc.note || '',
      }))
    );
    setEditing(false);
  };

  return (
    <div className="locations-editor">
      <div className="editor-header">
        <h2>{t('locationsEditor.title')}</h2>
        <button onClick={handleAdd} className="btn btn-secondary">
          {t('locationsEditor.addLocation')}
        </button>
      </div>

      <div className="editor-list">
        {editLocations.map((loc, index) => {
          const validation = validateLocation(loc);
          return (
            <div key={index} className="editor-item">
              <div className="editor-item-controls">
                <button onClick={() => handleRemove(index)} className="btn-icon btn-danger" title={t('locationsEditor.remove')}>
                  ✕
                </button>
              </div>
              <div className="editor-item-fields">
                <input
                  type="text"
                  value={loc.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder={t('locationsEditor.titlePlaceholder')}
                  className={`form-input ${!loc.title.trim() ? 'input-error' : ''}`}
                />
                <div className="coords-group">
                  <input
                    type="number"
                    step="any"
                    value={loc.lat}
                    onChange={(e) => handleChange(index, 'lat', e.target.value)}
                    placeholder={t('locationsEditor.latPlaceholder')}
                    className="form-input"
                  />
                  <input
                    type="number"
                    step="any"
                    value={loc.lng}
                    onChange={(e) => handleChange(index, 'lng', e.target.value)}
                    placeholder={t('locationsEditor.lngPlaceholder')}
                    className="form-input"
                  />
                </div>
                <input
                  type="text"
                  value={loc.address}
                  onChange={(e) => handleChange(index, 'address', e.target.value)}
                  placeholder={t('locationsEditor.addressPlaceholder')}
                  className="form-input"
                />
                <textarea
                  value={loc.note}
                  onChange={(e) => handleChange(index, 'note', e.target.value)}
                  placeholder={t('locationsEditor.notePlaceholder')}
                  className="form-textarea"
                  rows={2}
                />
                {validation.error && (
                  <div className="validation-error">{validation.error}</div>
                )}
                {validation.warning && (
                  <div className="validation-warning">{validation.warning}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="editor-actions">
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">
            {loading ? t('locationsEditor.saving') : t('locationsEditor.saveLocations')}
          </button>
          <button onClick={handleCancel} disabled={loading} className="btn btn-secondary">
            {t('locationsEditor.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
