import { useEffect, useState } from 'react';

const NAVBAR_COMPACT_FULL_WIDTH = 920;
const NAVBAR_COMPACT_REST_WIDTH = 1024;

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));
const roundProgress = (value: number) => Math.round(value * 1000) / 1000;

export const resolveNavbarViewportCompactProgress = (viewportWidth: number): number => {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return 0;
  }

  if (viewportWidth <= NAVBAR_COMPACT_FULL_WIDTH) {
    return 1;
  }

  if (viewportWidth >= NAVBAR_COMPACT_REST_WIDTH) {
    return 0;
  }

  return roundProgress(
    (NAVBAR_COMPACT_REST_WIDTH - viewportWidth)
    / (NAVBAR_COMPACT_REST_WIDTH - NAVBAR_COMPACT_FULL_WIDTH),
  );
};

export const mergeNavbarCompactProgress = (...progresses: number[]): number => (
  clampProgress(
    Math.max(
      0,
      ...progresses.map((progress) => (Number.isFinite(progress) ? progress : 0)),
    ),
  )
);

export function useNavbarViewportCompactProgress(): number {
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? NAVBAR_COMPACT_REST_WIDTH : window.innerWidth
  ));

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth, { passive: true });

    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  return resolveNavbarViewportCompactProgress(viewportWidth);
}
