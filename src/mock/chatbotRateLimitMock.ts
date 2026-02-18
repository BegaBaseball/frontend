const BACKOFF_STEPS = [10, 20, 40];
let retryCount = 0;

type MockRateLimitMode = 'true' | 'false' | 'cycling' | '10' | '20' | '40' | undefined;

export const getMockRateLimitSeconds = (mode: MockRateLimitMode): number | null => {
  if (!mode || mode === 'false') return null;

  if (mode === 'cycling') {
    const seconds = BACKOFF_STEPS[retryCount % BACKOFF_STEPS.length];
    retryCount += 1;
    return seconds;
  }

  if (mode === 'true') return BACKOFF_STEPS[0];

  const numeric = Number(mode);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return Math.max(0, Math.floor(numeric));
  }

  return null;
};
