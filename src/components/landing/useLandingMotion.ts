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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (reduced) {
      document.querySelectorAll<HTMLElement>('[data-motion-loop], [data-anim]').forEach((node) => {
        node.style.animation = 'none';
      });
    }

    if (reduced || typeof IntersectionObserver !== 'function') {
      revealNodes.forEach((node) => node.dataset.revealed = 'true');
      revealNodes.forEach(finishMotionContent);
      return;
    }

    const countFrames = new Set<number>();

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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const node = entry.target as HTMLElement;
        reveal(node);
        observer.unobserve(node);
      });
    }, { threshold: 0.18 });

    revealNodes.forEach((node) => observer.observe(node));

    const parallaxNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    let parallaxFrame: number | null = null;

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

    const scheduleParallax = () => {
      if (parallaxFrame !== null) return;
      parallaxFrame = window.requestAnimationFrame(updateParallax);
    };

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    scheduleParallax();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', scheduleParallax);
      if (parallaxFrame !== null) window.cancelAnimationFrame(parallaxFrame);
      countFrames.forEach((frame) => window.cancelAnimationFrame(frame));
    };
  }, []);
}
