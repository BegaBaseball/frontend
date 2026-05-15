export type PredictionDeferredWorkCancel = () => void;

const POST_PAINT_IDLE_TIMEOUT_MS = 2500;
const POST_PAINT_FALLBACK_DELAY_MS = 800;

export const schedulePredictionPostPaintIdleWork = (
  callback: () => void,
): PredictionDeferredWorkCancel => {
  let canceled = false;
  let firstRafId: number | null = null;
  let secondRafId: number | null = null;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (canceled) {
      return;
    }
    callback();
  };

  const scheduleFallback = () => {
    timeoutId = globalThis.setTimeout(run, POST_PAINT_FALLBACK_DELAY_MS);
  };

  const scheduleIdle = () => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: POST_PAINT_IDLE_TIMEOUT_MS });
      return;
    }

    scheduleFallback();
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    firstRafId = window.requestAnimationFrame(() => {
      firstRafId = null;
      if (canceled) {
        return;
      }

      secondRafId = window.requestAnimationFrame(() => {
        secondRafId = null;
        if (canceled) {
          return;
        }
        scheduleIdle();
      });
    });
  } else {
    scheduleFallback();
  }

  return () => {
    canceled = true;

    if (typeof window !== 'undefined') {
      if (firstRafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(firstRafId);
      }
      if (secondRafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(secondRafId);
      }
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    }

    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  };
};
