import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';

import {
  buildPredictionDetailPath,
  buildPredictionListPath,
  type PredictionLocationState,
  type PredictionNavigationOptions,
} from '../../utils/predictionDeepLink';
import { normalizePredictionDate } from '../../utils/predictionHomeLogic';
import type { DateGames, Game } from '../../types/prediction';
import { Card } from '../ui/card';
import { usePredictionScheduleRuntimeState } from './PredictionScheduleContext';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const UNAVAILABLE_DETAIL_STATUSES = new Set(['POSTPONED', 'CANCELLED']);
const PredictionMatchSchedulePreviewRuntime = lazy(() => import('./PredictionMatchSchedulePreviewRuntime'));

const isDetailEntryGame = (game: Game | null | undefined): game is Game => {
  if (!game?.gameId) {
    return false;
  }

  const status = (game.gameStatus || '').trim().toUpperCase();
  return !UNAVAILABLE_DETAIL_STATUSES.has(status);
};

const DetailLoadingCard = () => (
  <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
    <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
      <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
      경기 화면을 준비하고 있습니다.
    </div>
  </Card>
);

type PredictionMatchScheduleReadyViewProps = {
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: PredictionNavigationOptions) => void;
  currentGame: Game | null;
  currentDateGames: DateGames['games'];
  currentDate: string;
};

export default function PredictionMatchScheduleReadyView({
  locationState,
  searchParams,
  setSearchParams,
  currentGame,
  currentDateGames,
  currentDate,
}: PredictionMatchScheduleReadyViewProps) {
  const [hasEnteredMatchDetail, setHasEnteredMatchDetail] = useState(false);
  const [InteractiveRuntimeComponent, setInteractiveRuntimeComponent] = useState<ComponentType | null>(null);
  const schedule = usePredictionScheduleRuntimeState();
  const currentGameId = currentGame?.gameId || '';

  const queryGameId = useMemo(() => searchParams.get('gameId')?.trim() || '', [searchParams]);
  const queryDate = useMemo(
    () => normalizePredictionDate(searchParams.get('date')?.trim() || '') || '',
    [searchParams],
  );
  const stateDeepLinkGameId = useMemo(() => {
    const stateGameId = (locationState?.gameId || '').trim();
    const stateSeedGameId = (locationState?.game?.gameId || '').trim();

    return stateGameId || stateSeedGameId;
  }, [locationState?.game?.gameId, locationState?.gameId]);
  const deepLinkGameId = useMemo(() => queryGameId || stateDeepLinkGameId, [queryGameId, stateDeepLinkGameId]);

  const isDeepLinkMatchSelection = useMemo(() => {
    if (!deepLinkGameId || !currentGameId) {
      return false;
    }

    return currentGameId === deepLinkGameId;
  }, [currentGameId, deepLinkGameId]);
  const isDeepLinkGameMismatch = Boolean(
    !hasEnteredMatchDetail && deepLinkGameId && currentGameId && currentGameId !== deepLinkGameId
  );
  const hasDeepLinkNotice = Boolean(schedule?.deepLinkNotice);
  const shouldRenderPreview = !deepLinkGameId || hasDeepLinkNotice || isDeepLinkGameMismatch;
  const shouldRenderMatchCard =
    Boolean(deepLinkGameId)
    && !shouldRenderPreview
    && Boolean(currentGameId);

  useEffect(() => {
    if (isDeepLinkMatchSelection) {
      setHasEnteredMatchDetail(true);
    }
  }, [isDeepLinkMatchSelection]);

  const handlePreviewGoToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('date', normalizedDate);
    nextSearchParams.delete('gameId');

    setSearchParams(nextSearchParams, { replace: true });
    schedule?.goToDate(normalizedDate);
  }, [schedule, searchParams, setSearchParams]);

  const handleEnterMatchDetail = useCallback((game: Game) => {
    if (!isDetailEntryGame(game)) {
      return;
    }

    const targetDate = normalizePredictionDate(game.gameDate || currentDate || queryDate)
      || queryDate
      || currentDate;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('gameId', game.gameId);
    if (targetDate) {
      nextSearchParams.set('date', targetDate);
    }

    const targetGameIndex = currentDateGames.findIndex((dateGame) => dateGame.gameId === game.gameId);
    if (targetGameIndex !== -1) {
      schedule?.setSelectedGame(targetGameIndex);
    }

    const predictionListPath = buildPredictionListPath({ date: targetDate });
    const predictionDetailPath = buildPredictionDetailPath({
      gameId: game.gameId,
      date: targetDate,
    });
    const previousState = locationState && typeof locationState === 'object' ? locationState : {};

    setSearchParams(nextSearchParams, {
      state: {
        ...previousState,
        fromPredictionList: true,
        predictionListPath,
        predictionDetailPath,
      },
    });
  }, [
    currentDate,
    currentDateGames,
    locationState,
    queryDate,
    schedule,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (shouldRenderPreview) {
      setHasEnteredMatchDetail(false);
    }
  }, [shouldRenderPreview]);

  useEffect(() => {
    if (!shouldRenderPreview || !InteractiveRuntimeComponent) {
      return;
    }

    setInteractiveRuntimeComponent(null);
  }, [
    InteractiveRuntimeComponent,
    shouldRenderPreview,
  ]);

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
      <Suspense fallback={<DetailLoadingCard />}>
        {shouldRenderPreview && schedule ? (
          <PredictionMatchSchedulePreviewRuntime
            currentGame={currentGame}
            currentDateGames={currentDateGames}
            currentDate={currentDate}
            currentDayNavigationMeta={schedule.currentDayNavigationMeta}
            allDatesData={schedule.allDatesData}
            currentDateIndex={schedule.currentDateIndex}
            deepLinkNotice={schedule.deepLinkNotice}
            goToPreviousDate={schedule.goToPreviousDate}
            goToNextDate={schedule.goToNextDate}
            goToDate={handlePreviewGoToDate}
            currentGameId={currentGameId}
            pastRangeLoadState={schedule.pastRangeLoadState}
            pastRangeLoadErrorMessage={schedule.pastRangeLoadErrorMessage}
            futureRangeLoadState={schedule.futureRangeLoadState}
            futureRangeLoadErrorMessage={schedule.futureRangeLoadErrorMessage}
            canLoadMorePast={schedule.canLoadMorePast}
            canLoadMoreFuture={schedule.canLoadMoreFuture}
            matchBounds={schedule.matchBounds}
            retryLoadMorePastMatches={schedule.retryLoadMorePastMatches}
            retryLoadMoreFutureMatches={schedule.retryLoadMoreFutureMatches}
            onEnterMatchDetail={handleEnterMatchDetail}
          />
        ) : shouldRenderMatchCard && InteractiveRuntimeComponent ? (
          <InteractiveRuntimeComponent />
        ) : (
          <DetailLoadingCard />
        )}
      </Suspense>
    </div>
  );
}
