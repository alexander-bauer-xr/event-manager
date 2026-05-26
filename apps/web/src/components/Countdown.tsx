import { useCountdown } from '../hooks/useCountdown';

export type CountdownVariant = 'banner' | 'inline' | 'compact';

interface CountdownProps {
  targetTime: string | Date | null;
  label?: string;
  expiredLabel?: string;
  variant?: CountdownVariant;
  hideWhenExpired?: boolean;
}

export function Countdown({
  targetTime,
  label,
  expiredLabel,
  variant = 'inline',
  hideWhenExpired = false,
}: CountdownProps) {
  const { display, isExpired, hasTarget, isUrgent } = useCountdown(targetTime);

  if (!hasTarget) {
    return null;
  }

  if (isExpired && hideWhenExpired) {
    return null;
  }

  const variantClass = `countdown-${variant}`;
  const urgentClass = isUrgent ? 'countdown-urgent' : '';

  if (isExpired && expiredLabel) {
    return (
      <div className={`countdown ${variantClass}`}>
        {expiredLabel}
      </div>
    );
  }

  if (isExpired) {
    return null;
  }

  return (
    <div className={`countdown ${variantClass} ${urgentClass}`}>
      {label && <span className="countdown-label">{label}</span>}
      <span className="countdown-time">{display}</span>
    </div>
  );
}
