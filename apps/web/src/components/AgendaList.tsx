import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function AgendaList() {
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
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getLocationTitle = (locationId: string | null) => {
    if (!locationId) return null;
    return locations.find((loc) => loc.id === locationId)?.title;
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

    if (diffMs <= 0) return 'Ending soon';

    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      const secs = Math.floor(diffMs / 1000);
      return `${secs}s left`;
    } else if (diffMins < 60) {
      return `${diffMins}m left`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
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
        <div className="empty-state">No agenda items yet</div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="agenda-progress">
            <div className="agenda-progress-header">
              <span className="agenda-progress-label">Event Progress</span>
              <span className="agenda-progress-stats">
                {completedCount >= 0 ? completedCount : 0} of {agenda.length} completed
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

            return (
              <div
                key={slot.id}
                className={`agenda-item agenda-item-${status}`}
              >
                <div className="agenda-item-status-indicator" />

                <div className="agenda-item-content">
                  <div className="agenda-item-header">
                    <div className="agenda-item-title">{slot.title}</div>
                    {status === 'current' && <div className="current-badge">Now</div>}
                    {status === 'past' && <div className="past-badge">Completed</div>}
                  </div>

                  <div className="agenda-item-meta">
                    {slot.startTime && slot.endTime && (
                      <div className="agenda-item-time">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        {duration && <span className="agenda-item-duration">({duration})</span>}
                      </div>
                    )}
                    {slot.locationId && (
                      <div className="agenda-item-location">
                        📍 {getLocationTitle(slot.locationId)}
                      </div>
                    )}
                  </div>

                  {status === 'current' && timeRemaining && (
                    <div className="agenda-item-countdown">
                      ⏱ {timeRemaining}
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
