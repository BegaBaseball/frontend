import { getTodayString } from '../utils/predictionDates';
import {
  schedulePredictionPostPaintIdleWork,
  type PredictionDeferredWorkCancel,
} from '../utils/predictionDeferredWork';

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
  adjacentPrefetchCancelRef: { current: PredictionDeferredWorkCancel | null };
  clearScheduledAdjacentPrefetch: () => void;
};

export const shouldSchedulePredictionAdjacentPrefetch = (
  anchorDate: string,
  pendingAnchorDate: string | null,
  completedAnchorDates: ReadonlySet<string>,
) => Boolean(anchorDate)
  && pendingAnchorDate !== anchorDate
  && !completedAnchorDates.has(anchorDate);

export const shouldPrefetchPredictionDate = (
  targetDate: string | null,
  todayDate = getTodayString(),
): boolean => Boolean(targetDate) && String(targetDate) >= todayDate;

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

  const previousDate = meta.prevDate;
  if (previousDate && shouldPrefetchPredictionDate(previousDate)) {
    void loadPredictionDay(previousDate, {
      preserveVisibleDate: true,
      requestKeySuffix: `prefetch:past:${anchorDate}`,
    });
  }

  const nextDate = meta.nextDate;
  if (nextDate && shouldPrefetchPredictionDate(nextDate)) {
    void loadPredictionDay(nextDate, {
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
  adjacentPrefetchCancelRef,
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
    adjacentPrefetchCancelRef.current = null;

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

  adjacentPrefetchCancelRef.current = schedulePredictionPostPaintIdleWork(runPrefetch);
};
