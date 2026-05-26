import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

export function AnnouncementsPanel() {
  const { t } = useTranslation();
  const announcements = useStore((s) => s.announcements);

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t('announcements.justNow');
    if (minutes < 60) return t('announcements.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('announcements.hoursAgo', { count: hours });
    return date.toLocaleDateString();
  };

  return (
    <div className="announcements-panel">
      {announcements.length === 0 ? (
        <div className="empty-state">{t('announcements.empty')}</div>
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
