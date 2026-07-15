import { useEffect } from 'react';

const COUNT_DURATION_MS = 1_200;

const finishMotionContent = (node: HTMLElement) => {
  node.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
    bar.style.width = bar.dataset.bar ?? '';
  });

  node.querySelectorAll<HTMLElement>('[data-count]').forEach((count) => {
    const target = Number(count.dataset.count);
    if (Number.isFinite(target)) {
      count.textContent = `${target.toLocaleString()}${count.dataset.suffix ?? ''}`;
    }
  });
};

export default function useLandingMotion(): void {
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const loopNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-loop], [data-anim]'));
    const barNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-bar]'));
    const countFrames = new Set<number>();
    const parallaxNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    let observer: IntersectionObserver | null = null;
    let parallaxFrame: number | null = null;
    let parallaxListening = false;

    const stopActiveMotion = () => {
      observer?.disconnect();
      observer = null;
      if (parallaxListening) {
        window.removeEventListener('scroll', scheduleParallax);
        parallaxListening = false;
      }
      if (parallaxFrame !== null) {
        window.cancelAnimationFrame(parallaxFrame);
        parallaxFrame = null;
      }
      countFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      countFrames.clear();
    };

    const finishForReducedMotion = () => {
      stopActiveMotion();
      loopNodes.forEach((node) => {
        node.style.animation = 'none';
      });
      barNodes.forEach((node) => {
        node.style.transition = 'none';
      });
      revealNodes.forEach((node) => {
        node.dataset.revealed = 'true';
        finishMotionContent(node);
      });
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        finishForReducedMotion();
        return;
      }

      loopNodes.forEach((node) => node.style.removeProperty('animation'));
      barNodes.forEach((node) => node.style.removeProperty('transition'));
    };

    motionPreference.addEventListener('change', handleMotionPreferenceChange);

    const countUp = (node: HTMLElement) => {
      if (node.dataset.counted === 'true') return;

      const target = Number(node.dataset.count);
      if (!Number.isFinite(target)) return;

      node.dataset.counted = 'true';
      const suffix = node.dataset.suffix ?? '';
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / COUNT_DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        node.textContent = `${Math.round(target * eased).toLocaleString()}${suffix}`;

        if (progress < 1) {
          const frame = window.requestAnimationFrame(step);
          countFrames.add(frame);
        }
      };

      const frame = window.requestAnimationFrame(step);
      countFrames.add(frame);
    };

    const reveal = (node: HTMLElement) => {
      node.dataset.revealed = 'true';
      node.style.transitionDelay = `${node.dataset.reveal ?? 0}ms`;
      node.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
        bar.style.width = bar.dataset.bar ?? '';
      });
      node.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
    };

    const updateParallax = () => {
      parallaxFrame = null;

      parallaxNodes.forEach((node) => {
        const parent = node.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const speed = Number(node.dataset.parallax);
        if (!Number.isFinite(speed)) return;

        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        node.style.transform = node.hasAttribute('data-parallax-center')
          ? `translate(-50%, -50%) translateY(${-offset}px)`
          : `translateY(${-offset}px)`;
      });
    };

    function scheduleParallax() {
      if (parallaxFrame !== null) return;
      parallaxFrame = window.requestAnimationFrame(updateParallax);
    }

    if (motionPreference.matches) {
      finishForReducedMotion();
      return () => {
        motionPreference.removeEventListener('change', handleMotionPreferenceChange);
        stopActiveMotion();
      };
    }

    if (typeof IntersectionObserver !== 'function') {
      revealNodes.forEach((node) => node.dataset.revealed = 'true');
      revealNodes.forEach(finishMotionContent);
      return () => {
        motionPreference.removeEventListener('change', handleMotionPreferenceChange);
        stopActiveMotion();
      };
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const node = entry.target as HTMLElement;
        reveal(node);
        observer?.unobserve(node);
      });
    }, { threshold: 0.18 });

    revealNodes.forEach((node) => observer?.observe(node));

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    parallaxListening = true;
    scheduleParallax();

    return () => {
      motionPreference.removeEventListener('change', handleMotionPreferenceChange);
      stopActiveMotion();
    };
  }, []);
}
