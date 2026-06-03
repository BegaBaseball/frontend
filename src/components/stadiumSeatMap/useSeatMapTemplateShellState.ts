import { useCallback, useEffect, useState } from 'react';

interface SeatMapTemplateShellState {
  isMobile: boolean;
  isFullscreenOpen: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
}

export function useSeatMapTemplateShellState(): SeatMapTemplateShellState {
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const openFullscreen = useCallback(() => {
    setIsFullscreenOpen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check);

    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isFullscreenOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFullscreen();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeFullscreen, isFullscreenOpen]);

  return {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  };
}
