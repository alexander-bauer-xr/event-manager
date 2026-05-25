import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

interface EditableLocation {
  id: string | null;
  title: string;
  lat: string;
  lng: string;
  address: string;
  note: string;
}

const emptyLocation = (): EditableLocation => ({
  id: null,
  title: '',
  lat: '',
  lng: '',
  address: '',
  note: '',
});

export function LocationsEditor() {
  const { slug } = useParams<{ slug: string }>();
  const locations = useStore((s) => s.locations);
  const saveLocationsAction = useStore((s) => s.saveLocationsAction);
  const loading = useStore((s) => s.loading);

  const [editLocations, setEditLocations] = useState<EditableLocation[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setEditLocations(
        locations.map((loc) => ({
          id: loc.id,
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
    setEditLocations([...editLocations, emptyLocation()]);
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
      return { error: 'Title is required', warning: null };
    }

    const hasLat = loc.lat.trim() !== '';
    const hasLng = loc.lng.trim() !== '';

    if (hasLat !== hasLng) {
      return { error: 'Both latitude and longitude are required', warning: null };
    }

    if (hasLat && hasLng) {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return { error: 'Invalid coordinates', warning: null };
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { error: 'Coordinates out of valid range', warning: null };
      }
    } else {
      return { error: null, warning: 'Location will not appear on map without coordinates' };
    }

    return { error: null, warning: null };
  };

  const handleSave = async () => {
    if (!slug) return;

    // Validate all locations
    const validations = editLocations.map(validateLocation);
    const hasErrors = validations.some(v => v.error !== null);

    if (hasErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    const locationsToSave = editLocations.map((loc) => ({
      id: loc.id,
      title: loc.title,
      lat: loc.lat ? parseFloat(loc.lat) : null,
      lng: loc.lng ? parseFloat(loc.lng) : null,
      address: loc.address || null,
      note: loc.note || null,
    }));

    try {
      await saveLocationsAction(slug, locationsToSave);
      setEditing(false);
      toast.success('Locations saved successfully!');
    } catch (err) {
      console.error('Failed to save locations:', err);
      toast.error('Failed to save locations. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditLocations(
      locations.map((loc) => ({
        id: loc.id,
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
        <h2>Locations Editor</h2>
        <button onClick={handleAdd} className="btn btn-secondary">
          Add Location
        </button>
      </div>

      <div className="editor-list">
        {editLocations.map((loc, index) => {
          const validation = validateLocation(loc);
          return (
            <div key={loc.id ?? `new-${index}`} className="editor-item">
              <div className="editor-item-controls">
                <button onClick={() => handleRemove(index)} className="btn-icon btn-danger" title="Remove">
                  ✕
                </button>
              </div>
              <div className="editor-item-fields">
                <input
                  type="text"
                  value={loc.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder="Title"
                  className={`form-input ${!loc.title.trim() ? 'input-error' : ''}`}
                />
                <div className="coords-group">
                  <input
                    type="number"
                    step="any"
                    value={loc.lat}
                    onChange={(e) => handleChange(index, 'lat', e.target.value)}
                    placeholder="Latitude"
                    className="form-input"
                  />
                  <input
                    type="number"
                    step="any"
                    value={loc.lng}
                    onChange={(e) => handleChange(index, 'lng', e.target.value)}
                    placeholder="Longitude"
                    className="form-input"
                  />
                </div>
                <input
                  type="text"
                  value={loc.address}
                  onChange={(e) => handleChange(index, 'address', e.target.value)}
                  placeholder="Address (optional)"
                  className="form-input"
                />
                <textarea
                  value={loc.note}
                  onChange={(e) => handleChange(index, 'note', e.target.value)}
                  placeholder="Note (optional)"
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
            {loading ? 'Saving...' : 'Save Locations'}
          </button>
          <button onClick={handleCancel} disabled={loading} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}