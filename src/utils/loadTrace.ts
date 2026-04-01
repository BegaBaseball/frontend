const isLoadTraceEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('traceLoad') === '1';
};

export const traceLoadEvent = (label: string) => {
  if (!isLoadTraceEnabled()) {
    return;
  }

  const now = performance.now().toFixed(2);
  performance.mark(`load-order:${label}`);
  console.info(`[load-order][${now}ms] ${label}`);
};
