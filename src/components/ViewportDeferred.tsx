import { ReactNode, useEffect, useRef, useState } from 'react';

interface ViewportDeferredProps {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  rootMargin?: string;
  threshold?: number;
  /**
   * Optional test hook applied to the observed container element. Lets audits
   * measure the exact element the IntersectionObserver watches (see
   * scripts/landing-first-load-audit.mjs). Behavior-neutral.
   */
  containerTestId?: string;
}

export default function ViewportDeferred({
  children,
  fallback,
  className,
  rootMargin = '120px 0px 160px 0px',
  threshold = 0.1,
  containerTestId,
}: ViewportDeferredProps) {
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hasEnteredView) {
      return;
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      return;
    }

    const target = containerRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasEnteredView, rootMargin, threshold]);

  return (
    <div ref={containerRef} className={className} data-testid={containerTestId}>
      {hasEnteredView ? children : fallback}
    </div>
  );
}
