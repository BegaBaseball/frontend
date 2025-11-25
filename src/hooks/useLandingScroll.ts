import { useState, useEffect, useRef } from 'react';

export const useLandingScroll = () => {
  const [visibleFeature, setVisibleFeature] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const laptopRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer: 현재 보이는 기능 추적
  useEffect(() => {
    const observers = featureRefs.current.map((ref, index) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleFeature(index);
            }
          });
        },
        {
          threshold: [0.3, 0.5, 0.7],
          rootMargin: '-10% 0px -10% 0px'
        }
      );

      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach((observer, index) => {
        if (observer && featureRefs.current[index]) {
          observer.unobserve(featureRefs.current[index]!);
        }
      });
    };
  }, []);

  // Scroll Position: 맥북 이동 거리 계산
  useEffect(() => {
    const handleScroll = () => {
      if (!featuresContainerRef.current || !featureRefs.current[3]) return;

      const fourthFeatureTop = featureRefs.current[3].getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      // 4번째 기능이 화면 중앙 도달 시 맥북 하강
      if (fourthFeatureTop < windowHeight / 2) {
        const progress = Math.max(0, (windowHeight / 2 - fourthFeatureTop) / windowHeight);
        setScrollProgress(Math.min(progress, 1));
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    visibleFeature,
    scrollProgress,
    featureRefs,
    laptopRef,
    featuresContainerRef
  };
};