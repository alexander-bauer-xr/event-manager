import { useState, useEffect, useMemo } from 'react';

export interface CountdownResult {
  display: string;
  isExpired: boolean;
  hasTarget: boolean;
  totalSeconds: number;
  isUrgent: boolean;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 && minutes < 5 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function useCountdown(targetTime: string | Date | null): CountdownResult {
  const targetDate = useMemo(() => {
    if (!targetTime) return null;
    const date = targetTime instanceof Date ? targetTime : new Date(targetTime);
    return isNaN(date.getTime()) ? null : date;
  }, [targetTime]);

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo((): CountdownResult => {
    if (!targetDate) {
      return {
        display: '',
        isExpired: false,
        hasTarget: false,
        totalSeconds: 0,
        isUrgent: false,
      };
    }

    const diffMs = targetDate.getTime() - currentTime.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const isExpired = diffMs <= 0;
    const isUrgent = !isExpired && totalSeconds < 300; // < 5 minutes

    return {
      display: isExpired ? '' : formatCountdown(totalSeconds),
      isExpired,
      hasTarget: true,
      totalSeconds,
      isUrgent,
    };
  }, [targetDate, currentTime]);

  return result;
}
