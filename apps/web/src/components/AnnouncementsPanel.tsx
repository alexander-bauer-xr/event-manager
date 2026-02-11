import { useStore } from '../store/useStore';

export function AnnouncementsPanel() {
  const announcements = useStore((s) => s.announcements);

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="announcements-panel">
      {announcements.length === 0 ? (
        <div className="empty-state">No announcements yet</div>
      ) : (
        announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-item">
            <div className="announcement-text">{announcement.text}</div>
            <div className="announcement-time">{formatTime(announcement.createdAt)}</div>
          </div>
        ))
      )}
    </div>
  );
}
