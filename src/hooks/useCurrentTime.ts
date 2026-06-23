import { useEffect, useState } from 'react';

export const useCurrentTime = (refreshMs = 60_000): Date => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, refreshMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshMs]);

  return currentTime;
};
