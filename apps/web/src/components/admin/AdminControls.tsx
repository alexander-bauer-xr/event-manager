import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';

export function AdminControls() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [announcementText, setAnnouncementText] = useState('');
  const event = useStore((s) => s.event);
  const adminNextAction = useStore((s) => s.adminNextAction);
  const adminAnnounceAction = useStore((s) => s.adminAnnounceAction);
  const updateEventAction = useStore((s) => s.updateEventAction);
  const error = useStore((s) => s.error);

  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    if (event) {
      setStartsAt(event.startsAt ? toLocalDateTimeString(event.startsAt) : '');
      setEndsAt(event.endsAt ? toLocalDateTimeString(event.endsAt) : '');
    }
  }, [event]);

  const toLocalDateTimeString = (isoString: string) => {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  const handleNext = async () => {
    if (!slug) return;
    try {
      await adminNextAction(slug);
      toast.success(t('adminControls.advancedSuccess'));
    } catch (err) {
      toast.error(t('adminControls.advancedError'));
    }
  };

  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !announcementText.trim()) return;

    try {
      await adminAnnounceAction(slug, announcementText);
      setAnnouncementText('');
      toast.success(t('adminControls.announceSuccess'));
    } catch (err) {
      toast.error(t('adminControls.announceError'));
    }
  };

  const handleSaveEventSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    try {
      await updateEventAction(slug, {
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      toast.success(t('adminControls.eventSettingsSaved'));
    } catch (err) {
      toast.error(t('adminControls.eventSettingsError'));
    }
  };

  return (
    <div className="admin-controls">
      <h2>{t('adminControls.title')}</h2>

      <div className="admin-control-section">
        <h3>{t('adminControls.eventSettings')}</h3>
        <form onSubmit={handleSaveEventSettings}>
          <div className="form-group">
            <label htmlFor="startsAt">{t('adminControls.eventStartTime')}</label>
            <input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="endsAt">{t('adminControls.eventEndTime')}</label>
            <input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="form-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {t('adminControls.saveEventSettings')}
          </button>
        </form>
      </div>

      <div className="admin-control-section">
        <h3>{t('adminControls.timelineControl')}</h3>
        <button onClick={handleNext} className="btn btn-primary">
          {t('adminControls.advanceToNext')}
        </button>
      </div>

      <div className="admin-control-section">
        <h3>{t('adminControls.announce')}</h3>
        <form onSubmit={handleAnnounce}>
          <div className="form-group">
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder={t('adminControls.announcePlaceholder')}
              className="form-textarea"
              rows={3}
              maxLength={500}
            />
          </div>
          <button type="submit" disabled={!announcementText.trim()} className="btn btn-primary">
            {t('adminControls.postAnnouncement')}
          </button>
        </form>
      </div>

      {error && <div className="admin-error">{t(error as any)}</div>}
    </div>
  );
}
