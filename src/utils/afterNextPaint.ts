export type AfterNextPaintCancel = () => void;

export const scheduleAfterNextPaint = (
  callback: () => void,
): AfterNextPaintCancel => {
  let canceled = false;
  let firstRafId: number | null = null;
  let secondRafId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (!canceled) {
      callback();
    }
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    firstRafId = window.requestAnimationFrame(() => {
      firstRafId = null;
      if (canceled) {
        return;
      }

      secondRafId = window.requestAnimationFrame(() => {
        secondRafId = null;
        run();
      });
    });
  } else {
    timeoutId = globalThis.setTimeout(run, 0);
  }

  return () => {
    canceled = true;

    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      if (firstRafId !== null) {
        window.cancelAnimationFrame(firstRafId);
      }
      if (secondRafId !== null) {
        window.cancelAnimationFrame(secondRafId);
      }
    }

    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  };
};
