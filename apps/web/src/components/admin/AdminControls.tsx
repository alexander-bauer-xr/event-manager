import { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

export function AdminControls() {
  const { slug } = useParams<{ slug: string }>();
  const [announcementText, setAnnouncementText] = useState('');
  const adminNextAction = useStore((s) => s.adminNextAction);
  const adminAnnounceAction = useStore((s) => s.adminAnnounceAction);
  const error = useStore((s) => s.error);

  const handleNext = async () => {
    if (!slug) return;
    try {
      await adminNextAction(slug);
      toast.success('Advanced to next agenda item!');
    } catch (err) {
      toast.error('Failed to advance timeline');
    }
  };

  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !announcementText.trim()) return;

    try {
      await adminAnnounceAction(slug, announcementText);
      setAnnouncementText('');
      toast.success('Announcement posted!');
    } catch (err) {
      toast.error('Failed to post announcement');
    }
  };

  return (
    <div className="admin-controls">
      <h2>Admin Controls</h2>

      <div className="admin-control-section">
        <h3>Timeline Control</h3>
        <button onClick={handleNext} className="btn btn-primary">
          Advance to Next
        </button>
      </div>

      <div className="admin-control-section">
        <h3>Announce</h3>
        <form onSubmit={handleAnnounce}>
          <div className="form-group">
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Type your announcement..."
              className="form-textarea"
              rows={3}
              maxLength={500}
            />
          </div>
          <button type="submit" disabled={!announcementText.trim()} className="btn btn-primary">
            Post Announcement
          </button>
        </form>
      </div>

      {error && <div className="admin-error">{error}</div>}
    </div>
  );
}
