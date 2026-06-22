import { useEffect, useState } from 'react';

import {
  getLocalTodayKey,
  getNextLocalMidnightDelayMs,
} from '../utils/currentDate';

export const useTodayKey = (): string => {
  const [todayKey, setTodayKey] = useState(() => getLocalTodayKey());

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextMidnight = () => {
      timeoutId = window.setTimeout(() => {
        setTodayKey(getLocalTodayKey());
        scheduleNextMidnight();
      }, getNextLocalMidnightDelayMs());
    };

    scheduleNextMidnight();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return todayKey;
};
