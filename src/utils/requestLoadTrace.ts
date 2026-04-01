const isLoadTraceRequested = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('traceLoad') === '1';
};

export const requestLoadTrace = (label: string) => {
  if (!isLoadTraceRequested()) {
    return;
  }

  void import('./loadTrace').then(({ traceLoadEvent }) => {
    traceLoadEvent(label);
  });
};
