import { useEffect, useRef, useState } from 'react';

export const useLandingScroll = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollDistance, setScrollDistance] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const laptopRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);
  const lastPublishedDistance = useRef(0);
  const targetProgressRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Scroll Position: 맥북 이동 거리 계산
  useEffect(() => {
    let rafId: number | null = null;
    let lastPublishedProgress = -1;
    const SMOOTHING_FACTOR = 0.2;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const EPSILON = 0.0008;

    const STICKY_TOP_OFFSET = 112; // top-28 in px (7rem)

    const applySmoothedProgress = () => {
      const current = smoothedProgressRef.current;
      const target = targetProgressRef.current;
      const next = current + (target - current) * SMOOTHING_FACTOR;

      if (Math.abs(target - current) < EPSILON) {
        smoothedProgressRef.current = target;
        setScrollProgress(target);
        animFrameRef.current = null;
        return;
      }

      smoothedProgressRef.current = next;
      setScrollProgress(next);
      animFrameRef.current = window.requestAnimationFrame(applySmoothedProgress);
    };

    const updateScrollProgress = () => {
      if (!featuresContainerRef.current || !featureRefs.current.length) {
        return;
      }

      const containerRect = featuresContainerRef.current.getBoundingClientRect();
      const startY = containerRect.top + window.scrollY - STICKY_TOP_OFFSET;
      const containerHeight = featuresContainerRef.current.scrollHeight;
      const laptopHeight = laptopRef.current?.getBoundingClientRect().height ?? 0;
      const ctaSection = document.querySelector<HTMLElement>('[data-testid="landing-cta"]');
      const containerTop = containerRect.top + window.scrollY;
      const ctaTop = ctaSection ? ctaSection.getBoundingClientRect().top + window.scrollY : null;
      const stickyGap = Math.max(0, STICKY_TOP_OFFSET + laptopHeight);
      const maxScrollableHeight = ctaTop === null
        ? Math.max(0, containerHeight - laptopHeight)
        : Math.max(0, ctaTop - containerTop - stickyGap);

      const travelRange = Math.max(1, maxScrollableHeight);

      const nextProgress = clamp((window.scrollY - startY) / travelRange);
      const nextDistance = travelRange;

      if (
        Math.abs(lastPublishedProgress - nextProgress) < 0.002 &&
        Math.abs(lastPublishedDistance.current - nextDistance) < 1
      ) {
        return;
      }

      lastPublishedProgress = nextProgress;
      lastPublishedDistance.current = nextDistance;
      setScrollDistance(nextDistance);

      targetProgressRef.current = nextProgress;
      if (animFrameRef.current === null) {
        animFrameRef.current = window.requestAnimationFrame(applySmoothedProgress);
      }
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

      if (animFrameRef.current !== null) {
        window.cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return {
    scrollProgress,
    scrollDistance,
    featureRefs,
    laptopRef,
    featuresContainerRef
  };
};
