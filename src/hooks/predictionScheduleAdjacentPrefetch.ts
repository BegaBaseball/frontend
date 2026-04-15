type PredictionAdjacentPrefetchDeps = {
  anchorDate: string;
  dayNavigationByDateRef: {
    current: Record<string, { prevDate: string | null; nextDate: string | null }>;
  };
  adjacentPrefetchIdleCallbackRef: { current: number | null };
  adjacentPrefetchTimeoutRef: { current: number | null };
  clearScheduledAdjacentPrefetch: () => void;
  loadPredictionDay: (
    targetDate: string,
    options: { preserveVisibleDate?: boolean; requestKeySuffix: string },
  ) => Promise<unknown>;
  onPrefetchRun?: (anchorDate: string) => void;
};

export const shouldSchedulePredictionAdjacentPrefetch = (
  anchorDate: string,
  pendingAnchorDate: string | null,
  completedAnchorDates: ReadonlySet<string>,
) => Boolean(anchorDate)
  && pendingAnchorDate !== anchorDate
  && !completedAnchorDates.has(anchorDate);

const prefetchAdjacentDays = ({
  anchorDate,
  dayNavigationByDateRef,
  loadPredictionDay,
}: Pick<PredictionAdjacentPrefetchDeps, 'anchorDate' | 'dayNavigationByDateRef' | 'loadPredictionDay'>) => {
  const meta = dayNavigationByDateRef.current[anchorDate];
  if (!meta) {
    return;
  }

  if (meta.prevDate) {
    void loadPredictionDay(meta.prevDate, {
      preserveVisibleDate: true,
      requestKeySuffix: `prefetch:past:${anchorDate}`,
    });
  }

  if (meta.nextDate) {
    void loadPredictionDay(meta.nextDate, {
      preserveVisibleDate: true,
      requestKeySuffix: `prefetch:future:${anchorDate}`,
    });
  }
};

export const schedulePredictionAdjacentPrefetch = ({
  anchorDate,
  dayNavigationByDateRef,
  adjacentPrefetchIdleCallbackRef,
  adjacentPrefetchTimeoutRef,
  clearScheduledAdjacentPrefetch,
  loadPredictionDay,
  onPrefetchRun,
}: PredictionAdjacentPrefetchDeps) => {
  if (typeof window === 'undefined') {
    prefetchAdjacentDays({ anchorDate, dayNavigationByDateRef, loadPredictionDay });
    onPrefetchRun?.(anchorDate);
    return;
  }

  clearScheduledAdjacentPrefetch();
  let hasRun = false;

  const run = () => {
    if (hasRun) {
      return;
    }
    hasRun = true;
    adjacentPrefetchIdleCallbackRef.current = null;
    adjacentPrefetchTimeoutRef.current = null;
    prefetchAdjacentDays({ anchorDate, dayNavigationByDateRef, loadPredictionDay });
    onPrefetchRun?.(anchorDate);
  };

  if ('requestIdleCallback' in window) {
    adjacentPrefetchIdleCallbackRef.current = window.requestIdleCallback(run, {
      timeout: 1200,
    });
  }

  adjacentPrefetchTimeoutRef.current = globalThis.setTimeout(run, 650) as unknown as number;
};
