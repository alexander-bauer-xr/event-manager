import { useStore } from '../store/useStore';

export function NowNextBanner() {
  const agenda = useStore((s) => s.agenda);
  const state = useStore((s) => s.state);

  const currentSlot = agenda.find((slot) => slot.id === state?.currentSlotId);
  const currentIndex = agenda.findIndex((slot) => slot.id === state?.currentSlotId);
  const nextSlot = currentIndex >= 0 ? agenda[currentIndex + 1] : agenda[0];

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="now-next-banner">
      <div className="now-next-section">
        <div className="now-next-label">Now</div>
        <div className="now-next-content">
          {currentSlot ? (
            <>
              <div className="now-next-title">{currentSlot.title}</div>
              {currentSlot.startTime && (
                <div className="now-next-time">{formatTime(currentSlot.startTime)}</div>
              )}
            </>
          ) : (
            <div className="now-next-empty">Not started</div>
          )}
        </div>
      </div>
      <div className="now-next-divider"></div>
      <div className="now-next-section">
        <div className="now-next-label">Next</div>
        <div className="now-next-content">
          {nextSlot ? (
            <>
              <div className="now-next-title">{nextSlot.title}</div>
              {nextSlot.startTime && (
                <div className="now-next-time">{formatTime(nextSlot.startTime)}</div>
              )}
            </>
          ) : (
            <div className="now-next-empty">No more items</div>
          )}
        </div>
      </div>
    </div>
  );
}
