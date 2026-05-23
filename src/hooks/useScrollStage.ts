import { useEffect, useState } from 'react';

type ScrollStage = 0 | 1 | 2;

interface ScrollMetrics {
  stage: ScrollStage;
  shrinkProgress: number;
  compactProgress: number;
  fastCompactProgress: number;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const roundProgress = (value: number) => Math.round(value * 1000) / 1000;

const resolveScrollMetrics = (): ScrollMetrics => {
  const y = typeof window === 'undefined' ? 0 : window.scrollY;
  const stage: ScrollStage = y <= 8 ? 0 : y <= 200 ? 1 : 2;

  return {
    stage,
    shrinkProgress: roundProgress(clamp(y / 180)),
    compactProgress: roundProgress(clamp((y - 80) / 140)),
    fastCompactProgress: roundProgress(clamp(y / 96)),
  };
};

const areMetricsEqual = (a: ScrollMetrics, b: ScrollMetrics) => (
  a.stage === b.stage
  && a.shrinkProgress === b.shrinkProgress
  && a.compactProgress === b.compactProgress
  && a.fastCompactProgress === b.fastCompactProgress
);

export function useScrollMetrics(): ScrollMetrics {
  const [metrics, setMetrics] = useState<ScrollMetrics>(() => resolveScrollMetrics());

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = resolveScrollMetrics();
        setMetrics((prev) => (areMetricsEqual(prev, next) ? prev : next));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return metrics;
}

export function useScrollStage(): 0 | 1 | 2 {
  return useScrollMetrics().stage;
}
