import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useOptionalConfirmDialog } from '../components/contexts/ConfirmDialogContext';
import {
  usePredictionScheduleRuntimeState,
  usePredictionUserVotesRuntimeState,
} from '../components/prediction/PredictionScheduleContext';
import {
  PREDICTION_BOOTSTRAP_INVALIDATED_EVENT,
  type PredictionBootstrapResponse,
} from '../api/predictionBootstrap';
import { useAuthSession } from '../store/authStore';
import type {
  PredRecoveryAction,
  PredictionErrorCode,
  PredictionFlowEventName,
  PredictionFlowState,
} from '../types/predictionFlow';
import type { GameDetail } from '../types/prediction';
import { emitPredictionFlowEvent } from '../utils/predictionFlowTelemetry';
import {
  buildPredictionRecoveryPath,
  buildSeedGameDetail,
  toPredictionGameId,
  type PredictionLocationState,
} from '../utils/predictionDeepLink';
import { normalizePredictionDate } from '../utils/predictionHomeLogic';
import {
  buildRecoveryState,
  getPredictionCopyKey,
  normalizeRecoveryActionOrder,
  resolveFlowScreen,
  type ErrorOverlayAction,
  type PredictionErrorOverlayConfig,
  type PredictionErrorOverlayState,
  type PredictionFlowEmitOverrides,
} from './predictionHookShared';
import { usePredictionGameData } from './usePredictionGameData';
import { usePredictionSchedule } from './usePredictionSchedule';
import { usePredictionUserVotes } from './usePredictionUserVotes';

type BootstrapHydrationState = 'idle' | 'loading' | 'ready' | 'failed';

export const usePredictionInteractiveData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const optionalConfirmDialog = useOptionalConfirmDialog();
  const fallbackConfirm = (
    options: Parameters<NonNullable<typeof optionalConfirmDialog>['confirm']>[0]
  ) => new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const message = options.description
      ? `${options.title}\n\n${options.description}`
      : options.title;
    resolve(window.confirm(message));
  });
  const confirm = optionalConfirmDialog?.confirm ?? fallbackConfirm;
  const providedSchedule = usePredictionScheduleRuntimeState();
  const providedUserVotes = usePredictionUserVotesRuntimeState();
  const isUsingProvidedSchedule = providedSchedule !== null;
  const isUsingProvidedUserVotes = providedUserVotes !== null;

  const [predictionErrorOverlay, setPredictionErrorOverlay] = useState<PredictionErrorOverlayState | null>(null);
  const [pendingSeedDetail, setPendingSeedDetail] = useState<{ gameId: string; detail: GameDetail } | null>(null);
  const [bootstrapHydrationStateByGameId, setBootstrapHydrationStateByGameId] = useState<Record<string, BootstrapHydrationState>>({});
  const activeTabRef = useRef<'match'>('match');
  const currentGameIdRef = useRef<string | null>(null);
  const currentDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBootstrapInvalidated = (event: Event) => {
      const gameId = event instanceof CustomEvent && typeof event.detail?.gameId === 'string'
        ? event.detail.gameId
        : '';
      if (!gameId) {
        setBootstrapHydrationStateByGameId({});
        return;
      }

      setBootstrapHydrationStateByGameId((prev) => {
        if (!prev[gameId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    };

    window.addEventListener(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT, handleBootstrapInvalidated);
    return () => {
      window.removeEventListener(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT, handleBootstrapInvalidated);
    };
  }, []);

  const emitFlowEvent = useCallback((
    eventName: PredictionFlowEventName,
    eventState: PredictionFlowState,
    overrides: PredictionFlowEmitOverrides = {}
  ) => {
    emitPredictionFlowEvent(eventName, {
      state: eventState,
      timestamp: new Date().toISOString(),
      platform: typeof window === 'undefined' || window.innerWidth >= 768 ? 'desktop' : 'mobile',
      screenId: resolveFlowScreen(eventState),
      source: 'prediction-page',
      tab: activeTabRef.current,
      gameId: overrides.gameId ?? currentGameIdRef.current ?? undefined,
      flowId: overrides.flowId,
      predictionTabIndex: activeTabRef.current === 'match' ? 0 : 1,
      recoverable: overrides.recoverable,
      retryable: overrides.retryable ?? overrides.recoverable,
      errorCode: overrides.errorCode,
      stage: overrides.stage,
      elapsedMs: overrides.elapsedMs,
      keepDraft: overrides.keepDraft,
      errorState: overrides.errorState,
      recoveryState: overrides.recoveryState,
      copyKey: overrides.copyKey,
      toastKey: overrides.toastKey,
      validation: overrides.validation,
      meta: overrides.meta,
      retryConfig: overrides.retryConfig,
      recoveryAction: overrides.recoveryAction,
      runProgressBannerAction: overrides.runProgressBannerAction,
    });
  }, []);

  const closePredictionErrorOverlay = useCallback(() => {
    setPredictionErrorOverlay((current) => {
      if (!current?.isOpen) {
        return current;
      }

      emitFlowEvent('onErrorOverlayExit', 'ERROR', {
        errorCode: current.errorCode,
        copyKey: current.copyKey,
        retryConfig: current.recoveryState,
      });

      return null;
    });
  }, [emitFlowEvent]);

  const showPredictionErrorOverlay = useCallback((
    errorCode: PredictionErrorCode,
    config: PredictionErrorOverlayConfig
  ) => {
    const normalizedOnRetry = config.onRetry ?? (() => {});
    const normalizedOnFallback = config.onFallback ?? (() => {});
    const normalizedOnGoList = config.onGoList ?? (() => {
      if (typeof window !== 'undefined') {
        window.location.href = buildPredictionRecoveryPath({
          currentDate: currentDateRef.current,
          currentGameId: currentGameIdRef.current,
          searchParams,
        });
      }
    });
    const normalizedOnGoBack = config.onGoBack ?? (() => {
      if (typeof window === 'undefined') {
        return;
      }
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      void normalizedOnGoList();
    });
    const recoveryState = buildRecoveryState(errorCode, config.recovery);
    const actionPriorityOrder = normalizeRecoveryActionOrder(errorCode, recoveryState, {
      onRetry: normalizedOnRetry,
      onFallback: normalizedOnFallback,
      onGoList: normalizedOnGoList,
      onGoBack: normalizedOnGoBack,
    });
    const normalizedRecoveryState = {
      ...recoveryState,
      actionPriorityOrder,
    };

    setPredictionErrorOverlay({
      isOpen: true,
      title: config.title,
      message: config.message,
      errorCode,
      copyKey: config.copyKey ?? getPredictionCopyKey(errorCode),
      toastKey: config.toastKey,
      recoveryState: normalizedRecoveryState,
      onRetry: normalizedOnRetry,
      onFallback: normalizedOnFallback,
      onGoList: normalizedOnGoList,
      onGoBack: normalizedOnGoBack,
    });

    emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
      errorCode,
      copyKey: config.copyKey ?? getPredictionCopyKey(errorCode),
      toastKey: config.toastKey,
      retryConfig: normalizedRecoveryState,
    });
  }, [emitFlowEvent, searchParams]);

  const handlePredictionErrorOverlayAction = useCallback(async (action: PredRecoveryAction) => {
    const overlayState = predictionErrorOverlay;
    if (!overlayState?.isOpen) {
      return;
    }

    const executeAction = async (
      recoveryAction: 'RETRY' | 'FALLBACK_SIMPLE' | 'GO_LIST' | 'GO_BACK',
      handler?: ErrorOverlayAction
    ) => {
      if (!handler) {
        return;
      }
      emitFlowEvent(
        recoveryAction === 'RETRY' ? 'onErrorOverlayRetry' : 'onErrorOverlayFallback',
        'ERROR',
        {
          errorCode: overlayState.errorCode,
          recoveryAction,
          copyKey: overlayState.copyKey,
          retryConfig: overlayState.recoveryState,
        }
      );
      setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
      await handler();
    };

    if (action === 'RETRY') {
      await executeAction('RETRY', overlayState.onRetry);
      return;
    }
    if (action === 'FALLBACK_SIMPLE') {
      await executeAction('FALLBACK_SIMPLE', overlayState.onFallback);
      return;
    }
    if (action === 'GO_LIST') {
      await executeAction('GO_LIST', overlayState.onGoList);
      return;
    }
    if (action === 'GO_BACK') {
      await executeAction('GO_BACK', overlayState.onGoBack);
      return;
    }

    setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
  }, [emitFlowEvent, predictionErrorOverlay]);

  const localUserVotes = usePredictionUserVotes({
    userId,
  });
  const {
    userVote,
    userVoteResolutionState,
    setUserVote,
    fetchAndCacheUserVotes,
  } = providedUserVotes ?? localUserVotes;

  const queuePrimeGameDetail = useCallback((gameId: string, detail: GameDetail) => {
    setPendingSeedDetail({ gameId, detail });
  }, []);

  const locationState = location.state as PredictionLocationState;
  const requestedDeepLinkGameId = toPredictionGameId(
    searchParams.get('gameId')
      || locationState?.gameId
      || locationState?.game?.gameId
      || ''
  ) || '';

  const localSchedule = usePredictionSchedule({
    isLoggedIn,
    isAuthLoading,
    searchParams,
    setSearchParams,
    locationState,
    emitFlowEvent,
    showPredictionErrorOverlay,
    disabled: isUsingProvidedSchedule,
    fetchAndCacheUserVotes,
    primeGameDetail: queuePrimeGameDetail,
    activateMatchTab: () => {
      activeTabRef.current = 'match';
    },
  });
  const schedule = providedSchedule ?? localSchedule;

  const currentGameId = schedule.currentGame?.gameId || null;
  currentGameIdRef.current = currentGameId;
  currentDateRef.current = schedule.currentDate || null;
  const hasLoadedRequestedDeepLinkGame = Boolean(
    requestedDeepLinkGameId
    && schedule.allDatesData.some((entry) => (
      entry.games.some((game) => game.gameId === requestedDeepLinkGameId)
    ))
  );
  const shouldLoadCurrentGameData = (
    !requestedDeepLinkGameId
    || currentGameId === requestedDeepLinkGameId
    || hasLoadedRequestedDeepLinkGame
  );
  const currentBootstrapHydrationState = currentGameId
    ? bootstrapHydrationStateByGameId[currentGameId] || 'idle'
    : 'idle';
  const providedBootstrap = currentGameId ? schedule.bootstrapByGameId?.[currentGameId] : null;
  const shouldUseBootstrapForCurrentGame = Boolean(
    currentGameId
    && providedBootstrap
    && schedule.currentDate
    && shouldLoadCurrentGameData
  );
  const shouldDeferCurrentGameDataForBootstrap = (
    shouldUseBootstrapForCurrentGame
    && currentBootstrapHydrationState !== 'ready'
    && currentBootstrapHydrationState !== 'failed'
  );

  const selectGame = useCallback((gameIndex: number) => {
    const nextGame = schedule.currentDateGames[gameIndex];
    if (!nextGame?.gameId) {
      return;
    }

    schedule.setSelectedGame(gameIndex);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('gameId', nextGame.gameId);
    if (schedule.currentDate) {
      nextSearchParams.set('date', schedule.currentDate);
    }
    schedule.setProgrammaticSearchParams(nextSearchParams, { replace: true });
  }, [
    schedule.currentDate,
    schedule.currentDateGames,
    schedule.setProgrammaticSearchParams,
    schedule.setSelectedGame,
    searchParams,
  ]);

  const syncPredictionDateSearchParams = useCallback((targetDate: string, targetGameId?: string | null) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('date', normalizedDate);
    if (targetGameId) {
      nextSearchParams.set('gameId', targetGameId);
    } else {
      nextSearchParams.delete('gameId');
    }
    schedule.setProgrammaticSearchParams(nextSearchParams, { replace: true });
  }, [schedule.setProgrammaticSearchParams, searchParams]);

  const goToPreviousDate = useCallback(() => {
    const previousDateEntry = schedule.allDatesData[schedule.currentDateIndex - 1];
    if (previousDateEntry) {
      syncPredictionDateSearchParams(previousDateEntry.date, previousDateEntry.games[0]?.gameId || null);
    }
    schedule.goToPreviousDate();
  }, [
    schedule.allDatesData,
    schedule.currentDateIndex,
    schedule.goToPreviousDate,
    syncPredictionDateSearchParams,
  ]);

  const goToNextDate = useCallback(() => {
    const nextDateEntry = schedule.allDatesData[schedule.currentDateIndex + 1];
    if (nextDateEntry) {
      syncPredictionDateSearchParams(nextDateEntry.date, nextDateEntry.games[0]?.gameId || null);
    }
    schedule.goToNextDate();
  }, [
    schedule.allDatesData,
    schedule.currentDateIndex,
    schedule.goToNextDate,
    syncPredictionDateSearchParams,
  ]);

  const goToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const targetDateEntry = schedule.allDatesData.find((entry) => entry.date === normalizedDate);
    syncPredictionDateSearchParams(normalizedDate, targetDateEntry?.games[0]?.gameId || null);
    schedule.goToDate(normalizedDate);
  }, [
    schedule.allDatesData,
    schedule.goToDate,
    syncPredictionDateSearchParams,
  ]);

  const gameData = usePredictionGameData({
    allDatesData: schedule.allDatesData,
    currentDateIndex: schedule.currentDateIndex,
    selectedGame: schedule.selectedGame,
    emitFlowEvent,
    showPredictionErrorOverlay,
    shouldLoadCurrentGameData: shouldLoadCurrentGameData && !shouldDeferCurrentGameDataForBootstrap,
  });

  useEffect(() => {
    if (!shouldUseBootstrapForCurrentGame || !currentGameId || !schedule.currentDate) {
      return;
    }
    if (
      currentBootstrapHydrationState === 'ready'
      || currentBootstrapHydrationState === 'failed'
      || !providedBootstrap
    ) {
      return;
    }

    const markState = (state: BootstrapHydrationState) => {
      setBootstrapHydrationStateByGameId((prev) => ({
        ...prev,
        [currentGameId]: state,
      }));
    };
    const applyBootstrap = (bootstrap: PredictionBootstrapResponse): boolean => {
      if (!bootstrap.selectedGameFound || bootstrap.selectedGameId !== currentGameId) {
        return false;
      }

      if (bootstrap.detail?.ok && bootstrap.detail.data) {
        gameData.primeGameDetail(currentGameId, bootstrap.detail.data, { isSeeded: false });
      } else if (bootstrap.detail && !bootstrap.detail.ok) {
        gameData.primeGameDetailError(
          currentGameId,
          bootstrap.detail.error?.message || '경기 상세 정보를 가져오지 못했습니다.',
          bootstrap.detail.error?.code
        );
      }

      if (bootstrap.voteStatus?.ok && bootstrap.voteStatus.data) {
        gameData.primeVoteStatus(currentGameId, bootstrap.voteStatus.data);
      } else if (bootstrap.voteStatus && !bootstrap.voteStatus.ok) {
        gameData.primeVoteStatusError(
          currentGameId,
          bootstrap.voteStatus.error?.message || '투표 상태를 가져오지 못했습니다.'
        );
      }
      return true;
    };

    if (providedBootstrap && applyBootstrap(providedBootstrap)) {
      markState('ready');
      return;
    }
    markState('failed');
  }, [
    currentBootstrapHydrationState,
    currentGameId,
    gameData.primeGameDetail,
    gameData.primeGameDetailError,
    gameData.primeVoteStatus,
    gameData.primeVoteStatusError,
    schedule.currentDate,
    providedBootstrap,
    shouldUseBootstrapForCurrentGame,
  ]);

  useEffect(() => {
    if (!isUsingProvidedSchedule || isUsingProvidedUserVotes || !isLoggedIn) {
      return;
    }

    const interactiveGameIds = schedule.currentDateGames
      .filter((game) => game.homeScore == null && game.awayScore == null)
      .map((game) => game.gameId)
      .filter(Boolean);
    if (!interactiveGameIds.length) {
      return;
    }

    let canceled = false;
    void fetchAndCacheUserVotes(
      interactiveGameIds,
      `interactive:${schedule.currentDate || 'current'}`,
      () => canceled
    );

    return () => {
      canceled = true;
    };
  }, [
    fetchAndCacheUserVotes,
    isLoggedIn,
    isUsingProvidedSchedule,
    isUsingProvidedUserVotes,
    schedule.currentDate,
    schedule.currentDateGames,
  ]);

  useEffect(() => {
    if (
      !isUsingProvidedSchedule
      || !locationState?.game
      || !currentGameId
      || gameData.currentGameDetailHasRenderableData
    ) {
      return;
    }
    if (shouldUseBootstrapForCurrentGame && currentBootstrapHydrationState !== 'failed') {
      return;
    }

    const stateGameId = toPredictionGameId(
      locationState.gameId
        || locationState.game.gameId
        || ''
    ) || '';
    if (stateGameId && stateGameId !== currentGameId) {
      return;
    }

    gameData.primeGameDetail(currentGameId, buildSeedGameDetail({
      ...locationState.game,
      gameId: currentGameId,
      gameDate: schedule.currentDate || locationState.game.gameDate,
    }));
  }, [
    currentGameId,
    gameData.currentGameDetailHasRenderableData,
    gameData.primeGameDetail,
    isUsingProvidedSchedule,
    locationState?.game,
    locationState?.gameId,
    schedule.currentDate,
  ]);

  useEffect(() => {
    if (!pendingSeedDetail) {
      return;
    }
    const isCurrentBootstrapSeed = (
      shouldUseBootstrapForCurrentGame
      && pendingSeedDetail.gameId === currentGameId
      && currentBootstrapHydrationState !== 'failed'
    );
    if (gameData.currentGameDetailHasRenderableData || isCurrentBootstrapSeed) {
      setPendingSeedDetail(null);
      return;
    }
    gameData.primeGameDetail(pendingSeedDetail.gameId, pendingSeedDetail.detail);
    setPendingSeedDetail(null);
  }, [
    currentBootstrapHydrationState,
    currentGameId,
    gameData.currentGameDetailHasRenderableData,
    gameData.primeGameDetail,
    pendingSeedDetail,
    shouldUseBootstrapForCurrentGame,
  ]);

  useEffect(() => {
    const selectedGameId = schedule.currentDateGames[schedule.selectedGame]?.gameId;
    if (!selectedGameId) {
      return;
    }

    emitFlowEvent('onDetailOpen', 'DETAIL_EDIT', {
      gameId: selectedGameId,
      meta: {
        selectedGame: schedule.selectedGame,
        currentDateIndex: schedule.currentDateIndex,
        listLength: schedule.currentDateGames.length,
      },
    });
  }, [
    emitFlowEvent,
    schedule.currentDateGames,
    schedule.currentDateIndex,
    schedule.selectedGame,
  ]);

  return {
    selectedGame: schedule.selectedGame,
    setSelectedGame: schedule.setSelectedGame,
    selectGame,
    allDatesData: schedule.allDatesData,
    currentDateIndex: schedule.currentDateIndex,
    currentDateGames: schedule.currentDateGames,
    currentDate: schedule.currentDate,
    loading: schedule.loading,
    currentGame: schedule.currentGame,
    currentDayNavigationMeta: schedule.currentDayNavigationMeta,
    matchesLoadState: schedule.matchesLoadState,
    matchesLoadErrorMessage: schedule.matchesLoadErrorMessage,
    matchesLoadErrorCode: schedule.matchesLoadErrorCode,
    deepLinkNotice: schedule.deepLinkNotice,
    reloadMatches: schedule.reloadMatches,
    pastRangeLoadState: schedule.pastRangeLoadState,
    pastRangeLoadErrorMessage: schedule.pastRangeLoadErrorMessage,
    futureRangeLoadState: schedule.futureRangeLoadState,
    futureRangeLoadErrorMessage: schedule.futureRangeLoadErrorMessage,
    canLoadMorePast: schedule.canLoadMorePast,
    canLoadMoreFuture: schedule.canLoadMoreFuture,
    votes: gameData.votes,
    voteStatusState: gameData.voteStatusState,
    voteStatusError: gameData.voteStatusError,
    voteStatusLoading: gameData.voteStatusLoading,
    isCurrentVotePartial: gameData.isCurrentVotePartial,
    currentVotePartialReason: gameData.currentVotePartialReason,
    userVote,
    userVoteResolutionState,
    setUserVote,
    currentGameDetail: gameData.currentGameDetail,
    currentGameDetailLoading: gameData.currentGameDetailLoading,
    currentGameDetailRefreshing: gameData.currentGameDetailRefreshing,
    currentGameDetailHasRenderableData: gameData.currentGameDetailHasRenderableData,
    currentGameDetailError: gameData.currentGameDetailError,
    currentGameDetailErrorCode: gameData.currentGameDetailErrorCode,
    loadVoteStatus: gameData.loadVoteStatus,
    reloadCurrentVoteStatus: gameData.reloadCurrentVoteStatus,
    reloadVoteStatus: gameData.reloadVoteStatus,
    reloadCurrentGameDetail: gameData.reloadCurrentGameDetail,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    isAuthLoading,
    isLoggedIn,
    matchBounds: schedule.matchBounds,
    loadMoreFutureMatches: schedule.loadMoreFutureMatches,
    retryLoadMoreFutureMatches: schedule.retryLoadMoreFutureMatches,
    retryLoadMorePastMatches: schedule.retryLoadMorePastMatches,
    goToPreviousDate,
    goToNextDate,
    goToDate,
    emitFlowEvent,
    showPredictionErrorOverlay,
    confirm,
  };
};
