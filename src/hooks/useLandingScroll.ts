import { useEffect, useRef, useState } from 'react';

export const useLandingScroll = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const laptopRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);

  // Scroll Position: 맥북 이동 거리 계산
  useEffect(() => {
    let rafId: number | null = null;
    let lastPublishedProgress = -1;

    const updateScrollProgress = () => {
      if (!featuresContainerRef.current || !featureRefs.current[3]) return;

      const fourthFeatureTop = featureRefs.current[3].getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      let nextProgress = 0;

      // 4번째 기능이 화면 중앙 도달 시 맥북 하강
      if (fourthFeatureTop < windowHeight / 2) {
        const progress = Math.max(0, (windowHeight / 2 - fourthFeatureTop) / windowHeight);
        nextProgress = Math.min(progress, 1);
      }

      if (Math.abs(lastPublishedProgress - nextProgress) < 0.01) {
        return;
      }

      lastPublishedProgress = nextProgress;
      setScrollProgress(nextProgress);
    };

    const scheduleScrollUpdate = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateScrollProgress();
      });
    };

    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate);
    scheduleScrollUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleScrollUpdate);
      window.removeEventListener('resize', scheduleScrollUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return {
    scrollProgress,
    featureRefs,
    laptopRef,
    featuresContainerRef
  };
};
