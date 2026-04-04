import { useEffect, useState } from 'react';

export function useAnimatedPresence(isOpen: boolean, exitDurationMs: number) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    setIsVisible(false);
    if (!isMounted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, exitDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [exitDurationMs, isMounted, isOpen]);

  return { isMounted, isVisible };
}
