type PredictionAdjacentPrefetchDeps = {
  anchorDate: string;
  dayNavigationByDateRef: {
    current: Record<string, { prevDate: string | null; nextDate: string | null }>;
  };
  loadPredictionDay: (
    targetDate: string,
    options: { preserveVisibleDate?: boolean; requestKeySuffix: string },
  ) => Promise<unknown>;
  onPrefetchRun?: (anchorDate: string) => void;
};

type PredictionAdjacentPrefetchScheduleDeps = PredictionAdjacentPrefetchDeps & {
  pendingAnchorDateRef: { current: string | null };
  completedAnchorDatesRef: { current: Set<string> };
  adjacentPrefetchIdleCallbackRef: { current: number | null };
  adjacentPrefetchTimeoutRef: { current: number | null };
  clearScheduledAdjacentPrefetch: () => void;
};

export const shouldSchedulePredictionAdjacentPrefetch = (
  anchorDate: string,
  pendingAnchorDate: string | null,
  completedAnchorDates: ReadonlySet<string>,
) => Boolean(anchorDate)
  && pendingAnchorDate !== anchorDate
  && !completedAnchorDates.has(anchorDate);

export const runPredictionAdjacentPrefetch = ({
  anchorDate,
  dayNavigationByDateRef,
  loadPredictionDay,
  onPrefetchRun,
}: PredictionAdjacentPrefetchDeps) => {
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
  onPrefetchRun?.(anchorDate);
};

export const schedulePredictionAdjacentPrefetch = ({
  anchorDate,
  pendingAnchorDateRef,
  completedAnchorDatesRef,
  adjacentPrefetchIdleCallbackRef,
  adjacentPrefetchTimeoutRef,
  clearScheduledAdjacentPrefetch,
  ...runDeps
}: PredictionAdjacentPrefetchScheduleDeps) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!shouldSchedulePredictionAdjacentPrefetch(
    anchorDate,
    pendingAnchorDateRef.current,
    completedAnchorDatesRef.current,
  )) {
    return;
  }

  clearScheduledAdjacentPrefetch();
  pendingAnchorDateRef.current = anchorDate;

  const runPrefetch = () => {
    adjacentPrefetchIdleCallbackRef.current = null;
    adjacentPrefetchTimeoutRef.current = null;

    if (pendingAnchorDateRef.current !== anchorDate || completedAnchorDatesRef.current.has(anchorDate)) {
      return;
    }

    runPredictionAdjacentPrefetch({
      ...runDeps,
      anchorDate,
      onPrefetchRun: (completedAnchorDate) => {
        pendingAnchorDateRef.current = null;
        completedAnchorDatesRef.current.add(completedAnchorDate);
        runDeps.onPrefetchRun?.(completedAnchorDate);
      },
    });
  };

  if ('requestIdleCallback' in window) {
    adjacentPrefetchIdleCallbackRef.current = window.requestIdleCallback(() => {
      runPrefetch();
    }, { timeout: 1200 });
    return;
  }

  adjacentPrefetchTimeoutRef.current = window.setTimeout(runPrefetch, 0);
};
