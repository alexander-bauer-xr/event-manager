import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Countdown } from './Countdown';

export function NowNextBanner() {
  const { t, i18n } = useTranslation();
  const event = useStore((s) => s.event);
  const agenda = useStore((s) => s.agenda);
  const state = useStore((s) => s.state);

  const currentSlot = agenda.find((slot) => slot.id === state?.currentSlotId);
  const currentIndex = agenda.findIndex((slot) => slot.id === state?.currentSlotId);
  const nextSlot = currentIndex >= 0 ? agenda[currentIndex + 1] : agenda[0];

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const eventEnded = currentIndex >= 0 && currentIndex === agenda.length - 1 && !nextSlot;

  const getEventCountdownLabel = () => {
    if (!event?.startsAt) return null;
    const startsAt = new Date(event.startsAt);
    const now = new Date();
    if (now >= startsAt) {
      return eventEnded ? t('nowNext.eventEnded') : t('nowNext.inProgress');
    }
    return null;
  };

  const eventCountdownExpiredLabel = getEventCountdownLabel();

  return (
    <div className="now-next-banner">
      {event?.startsAt && (
        <div className="now-next-event-countdown" style={{ gridColumn: '1 / -1' }}>
          <Countdown
            targetTime={event.startsAt}
            label={t('nowNext.eventStartsIn')}
            expiredLabel={eventCountdownExpiredLabel || undefined}
            variant="banner"
          />
        </div>
      )}
      <div className="now-next-section">
        <div className="now-next-label">{t('nowNext.now')}</div>
        <div className="now-next-content">
          {currentSlot ? (
            <>
              <div className="now-next-title">{currentSlot.title}</div>
              {currentSlot.startTime && (
                <div className="now-next-time">{formatTime(currentSlot.startTime)}</div>
              )}
            </>
          ) : (
            <div className="now-next-empty">{t('nowNext.notStarted')}</div>
          )}
        </div>
      </div>
      <div className="now-next-divider"></div>
      <div className="now-next-section">
        <div className="now-next-label">{t('nowNext.next')}</div>
        <div className="now-next-content">
          {nextSlot ? (
            <>
              <div className="now-next-title">{nextSlot.title}</div>
              {nextSlot.startTime ? (
                <>
                  <div className="now-next-time">{formatTime(nextSlot.startTime)}</div>
                  <div className="now-next-countdown">
                    <Countdown
                      targetTime={nextSlot.startTime}
                      label={t('nowNext.startsIn')}
                      variant="compact"
                      hideWhenExpired
                    />
                  </div>
                </>
              ) : (
                <div className="now-next-time">{t('nowNext.timeTBD')}</div>
              )}
            </>
          ) : (
            <div className="now-next-empty">{t('nowNext.noMoreItems')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
