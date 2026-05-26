import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Countdown } from './Countdown';

const DESCRIPTION_THRESHOLD = 120;

function ReadMore({ text }: { text: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > DESCRIPTION_THRESHOLD;
  return (
    <div className="agenda-item-description">
      <p className={`agenda-item-description-text ${needsToggle && !expanded ? 'clamped' : ''}`}>{text}</p>
      {needsToggle && (
        <button className="agenda-read-more-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? t('agenda.showLess') : t('agenda.readMore')}
        </button>
      )}
    </div>
  );
}

export function AgendaList() {
  const { t, i18n } = useTranslation();
  const agenda = useStore((s) => s.agenda);
  const state = useStore((s) => s.state);
  const locations = useStore((s) => s.locations);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const getLocation = (locationId: string | null) => {
    if (!locationId) return null;
    return locations.find((loc) => loc.id === locationId) ?? null;
  };

  const calculateDuration = (startTime: string | null, endTime: string | null): string | null => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  const calculateTimeRemaining = (endTime: string | null): string | null => {
    if (!endTime) return null;
    const end = new Date(endTime);
    const diffMs = end.getTime() - currentTime.getTime();

    if (diffMs <= 0) return t('agenda.endingSoon');

    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      const secs = Math.floor(diffMs / 1000);
      return t('agenda.secondsLeft', { count: secs });
    } else if (diffMins < 60) {
      return t('agenda.minutesLeft', { count: diffMins });
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0
        ? t('agenda.hoursMinutesLeft', { hours, minutes: mins })
        : t('agenda.hoursLeft', { count: hours });
    }
  };

  const getItemStatus = (index: number): 'past' | 'current' | 'upcoming' => {
    const currentIndex = agenda.findIndex((slot) => slot.id === state?.currentSlotId);

    if (currentIndex === -1) {
      // No current item set, all are upcoming
      return 'upcoming';
    }

    if (index < currentIndex) return 'past';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  const calculateProgress = (): number => {
    if (agenda.length === 0) return 0;
    const currentIndex = agenda.findIndex((slot) => slot.id === state?.currentSlotId);

    if (currentIndex === -1) return 0;

    // Progress is based on completed items (not including current)
    return Math.round((currentIndex / agenda.length) * 100);
  };

  const completedCount = agenda.findIndex((slot) => slot.id === state?.currentSlotId);
  const progress = calculateProgress();

  return (
    <div className="agenda-list">
      {agenda.length === 0 ? (
        <div className="empty-state">{t('agenda.empty')}</div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="agenda-progress">
            <div className="agenda-progress-header">
              <span className="agenda-progress-label">{t('agenda.progress')}</span>
              <span className="agenda-progress-stats">
                {t('agenda.stats', { completed: completedCount >= 0 ? completedCount : 0, total: agenda.length })}
              </span>
            </div>
            <div className="agenda-progress-bar">
              <div
                className="agenda-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Agenda Items */}
          {agenda.map((slot, index) => {
            const status = getItemStatus(index);
            const duration = calculateDuration(slot.startTime, slot.endTime);
            const timeRemaining = status === 'current' ? calculateTimeRemaining(slot.endTime) : null;
            const isFirstUpcoming = status === 'upcoming' && index === 0 && completedCount < 0;
            const location = getLocation(slot.locationId);

            return (
              <div
                key={slot.id}
                className={`agenda-item agenda-item-${status}`}
              >
                <div className="agenda-item-status-indicator" />

                <div className="agenda-item-content">
                  <div className="agenda-item-header">
                    <div className="agenda-item-title">{slot.title}</div>
                    {status === 'current' && <div className="current-badge">{t('agenda.badgeNow')}</div>}
                    {status === 'past' && <div className="past-badge">{t('agenda.badgeCompleted')}</div>}
                  </div>

                  <div className="agenda-item-meta">
                    {slot.startTime && slot.endTime && (
                      <div className="agenda-item-time">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        {duration && <span className="agenda-item-duration">({duration})</span>}
                      </div>
                    )}
                    {location && (
                      <div className="agenda-item-location">
                        📍 {location.title}
                      </div>
                    )}
                  </div>

                  {slot.description && <ReadMore text={slot.description} />}
                  {location?.note && <ReadMore text={location.note} />}

                  {status === 'current' && timeRemaining && (
                    <div className="agenda-item-countdown">
                      ⏱ {timeRemaining}
                    </div>
                  )}

                  {isFirstUpcoming && slot.startTime && (
                    <div className="agenda-next-countdown">
                      <Countdown
                        targetTime={slot.startTime}
                        label={t('agenda.startsIn')}
                        variant="inline"
                        hideWhenExpired
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
