import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';

import type { PredictionLocationState } from '../../utils/predictionDeepLink';
import { normalizePredictionDate } from '../../utils/predictionHomeLogic';
import {
  PREDICTION_RUN_SESSION_EVENT,
  hasPredictionRunSession,
} from '../../utils/predictionRecovery';
import type { DateGames, Game, MatchBounds } from '../../types/prediction';
import type { RangeLoadState } from '../../hooks/predictionHookShared';
import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';
import PredictionMatchSchedulePreviewRuntime from './PredictionMatchSchedulePreviewRuntime';

type PredictionMatchScheduleReadyViewProps = {
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void;
  currentGame: Game | null;
  currentDateGames: DateGames['games'];
  currentDate: string;
  currentDayNavigationMeta: { prevDate: string | null; nextDate: string | null } | null;
  allDatesData: DateGames[];
  currentDateIndex: number;
  deepLinkNotice: string | null;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  goToDate: (date: string) => Promise<void> | void;
  pastRangeLoadState: RangeLoadState;
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: RangeLoadState;
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  matchBounds: MatchBounds | null;
  retryLoadMorePastMatches: () => void;
  retryLoadMoreFutureMatches: () => void;
};

export default function PredictionMatchScheduleReadyView({
  locationState,
  searchParams,
  setSearchParams,
  currentGame,
  currentDateGames,
  currentDate,
  currentDayNavigationMeta,
  allDatesData,
  currentDateIndex,
  deepLinkNotice,
  goToPreviousDate,
  goToNextDate,
  goToDate,
  pastRangeLoadState,
  pastRangeLoadErrorMessage,
  futureRangeLoadState,
  futureRangeLoadErrorMessage,
  canLoadMorePast,
  canLoadMoreFuture,
  matchBounds,
  retryLoadMorePastMatches,
  retryLoadMoreFutureMatches,
}: PredictionMatchScheduleReadyViewProps) {
  const [hasEnteredMatchDetail, setHasEnteredMatchDetail] = useState(false);
  const [hasStoredRunSession, setHasStoredRunSession] = useState(false);
  const [InteractiveRuntimeComponent, setInteractiveRuntimeComponent] = useState<ComponentType | null>(null);
  const currentGameId = currentGame?.gameId;

  const queryGameId = useMemo(() => searchParams.get('gameId')?.trim() || '', [searchParams]);
  const stateDeepLinkGameId = useMemo(() => {
    const stateGameId = (locationState?.gameId || '').trim();
    const stateSeedGameId = (locationState?.game?.gameId || '').trim();

    return stateGameId || stateSeedGameId;
  }, [locationState?.game?.gameId, locationState?.gameId]);
  const deepLinkGameId = useMemo(() => {
    return queryGameId || stateDeepLinkGameId;
  }, [queryGameId, stateDeepLinkGameId]);

  const isDeepLinkMatchSelection = useMemo(() => {
    if (!deepLinkGameId || !currentGameId) {
      return false;
    }

    return currentGameId === deepLinkGameId;
  }, [currentGameId, deepLinkGameId]);
  const isDeepLinkGameMismatch = Boolean(
    !hasEnteredMatchDetail && deepLinkGameId && currentGameId && currentGameId !== deepLinkGameId
  );

  useEffect(() => {
    if (isDeepLinkMatchSelection) {
      setHasEnteredMatchDetail(true);
    }
  }, [isDeepLinkMatchSelection]);

  useEffect(() => {
    if (!queryGameId && !stateDeepLinkGameId) {
      setHasEnteredMatchDetail(false);
    }
  }, [queryGameId, stateDeepLinkGameId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const syncStoredRunSession = () => {
      setHasStoredRunSession(hasPredictionRunSession());
    };

    const handlePageShow = () => {
      syncStoredRunSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncStoredRunSession();
      }
    };
    const handleRunSessionUpdated = () => {
      syncStoredRunSession();
    };

    syncStoredRunSession();
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener(PREDICTION_RUN_SESSION_EVENT, handleRunSessionUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener(PREDICTION_RUN_SESSION_EVENT, handleRunSessionUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleEnterMatchDetail = useCallback((targetGame: Game) => {
    if (targetGame.gameId) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('gameId', targetGame.gameId);
      const targetDate = targetGame.gameDate || currentDate;
      if (targetDate) {
        nextSearchParams.set('date', targetDate);
      }
      setSearchParams(nextSearchParams, queryGameId ? { replace: true } : undefined);
    }
    setHasEnteredMatchDetail(true);
  }, [currentDate, queryGameId, searchParams, setSearchParams]);

  const handlePreviewGoToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      void goToDate(targetDate);
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('date', normalizedDate);
    nextSearchParams.delete('gameId');
    setSearchParams(nextSearchParams, { replace: true });
    void goToDate(normalizedDate);
  }, [goToDate, searchParams, setSearchParams]);

  const shouldRenderMatchCard =
    !isDeepLinkGameMismatch
    && (hasEnteredMatchDetail || isDeepLinkMatchSelection || hasStoredRunSession)
    && Boolean(currentGameId);

  useEffect(() => {
    let canceled = false;

    if (!shouldRenderMatchCard || InteractiveRuntimeComponent) {
      return () => {
        canceled = true;
      };
    }

    void import('./PredictionMatchInteractiveRuntime').then((module) => {
      if (canceled) {
        return;
      }

      setInteractiveRuntimeComponent(() => module.default);
    });

    return () => {
      canceled = true;
    };
  }, [InteractiveRuntimeComponent, shouldRenderMatchCard]);

  return (
    <div className="font-sans">
      <Suspense
        fallback={(
          <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
            <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
              <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
              경기 화면을 준비하고 있습니다.
            </div>
          </Card>
        )}
      >
        {shouldRenderMatchCard ? (
          InteractiveRuntimeComponent ? (
            <InteractiveRuntimeComponent />
          ) : (
            <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
              <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
                <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
                경기 화면을 준비하고 있습니다.
              </div>
            </Card>
          )
        ) : (
          <PredictionMatchSchedulePreviewRuntime
            currentGame={currentGame}
            currentDateGames={currentDateGames}
            currentDate={currentDate}
            currentDayNavigationMeta={currentDayNavigationMeta}
            allDatesData={allDatesData}
            currentDateIndex={currentDateIndex}
            deepLinkNotice={deepLinkNotice}
            goToPreviousDate={goToPreviousDate}
            goToNextDate={goToNextDate}
            goToDate={handlePreviewGoToDate}
            currentGameId={currentGameId}
            pastRangeLoadState={pastRangeLoadState}
            pastRangeLoadErrorMessage={pastRangeLoadErrorMessage}
            futureRangeLoadState={futureRangeLoadState}
            futureRangeLoadErrorMessage={futureRangeLoadErrorMessage}
            canLoadMorePast={canLoadMorePast}
            canLoadMoreFuture={canLoadMoreFuture}
            matchBounds={matchBounds}
            retryLoadMorePastMatches={retryLoadMorePastMatches}
            retryLoadMoreFutureMatches={retryLoadMoreFutureMatches}
            onEnterMatchDetail={handleEnterMatchDetail}
          />
        )}
      </Suspense>
    </div>
  );
}
