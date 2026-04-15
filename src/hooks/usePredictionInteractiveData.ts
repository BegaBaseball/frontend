import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useOptionalConfirmDialog } from '../components/contexts/ConfirmDialogContext';
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
  type PredictionLocationState,
} from '../utils/predictionDeepLink';
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

  const [predictionErrorOverlay, setPredictionErrorOverlay] = useState<PredictionErrorOverlayState | null>(null);
  const [pendingSeedDetail, setPendingSeedDetail] = useState<{ gameId: string; detail: GameDetail } | null>(null);
  const activeTabRef = useRef<'match'>('match');
  const currentGameIdRef = useRef<string | null>(null);
  const currentDateRef = useRef<string | null>(null);

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

  const {
    userVote,
    userVoteResolutionState,
    setUserVote,
    fetchAndCacheUserVotes,
  } = usePredictionUserVotes({
    userId,
  });

  const queuePrimeGameDetail = useCallback((gameId: string, detail: GameDetail) => {
    setPendingSeedDetail({ gameId, detail });
  }, []);

  const schedule = usePredictionSchedule({
    isLoggedIn,
    isAuthLoading,
    searchParams,
    setSearchParams,
    locationState: location.state as PredictionLocationState,
    emitFlowEvent,
    showPredictionErrorOverlay,
    fetchAndCacheUserVotes,
    primeGameDetail: queuePrimeGameDetail,
    activateMatchTab: () => {
      activeTabRef.current = 'match';
    },
  });

  const currentGameId = schedule.currentGame?.gameId || null;
  currentGameIdRef.current = currentGameId;
  currentDateRef.current = schedule.currentDate || null;

  const gameData = usePredictionGameData({
    allDatesData: schedule.allDatesData,
    currentDateIndex: schedule.currentDateIndex,
    selectedGame: schedule.selectedGame,
    emitFlowEvent,
    showPredictionErrorOverlay,
  });

  useEffect(() => {
    if (!pendingSeedDetail) {
      return;
    }
    gameData.primeGameDetail(pendingSeedDetail.gameId, pendingSeedDetail.detail);
    setPendingSeedDetail(null);
  }, [gameData.primeGameDetail, pendingSeedDetail]);

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
    allDatesData: schedule.allDatesData,
    currentDateIndex: schedule.currentDateIndex,
    currentDateGames: schedule.currentDateGames,
    currentDate: schedule.currentDate,
    loading: schedule.loading,
    currentGame: schedule.currentGame,
    currentDayNavigationMeta: schedule.currentDayNavigationMeta,
    matchesLoadState: schedule.matchesLoadState,
    matchesLoadErrorMessage: schedule.matchesLoadErrorMessage,
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
    goToPreviousDate: schedule.goToPreviousDate,
    goToNextDate: schedule.goToNextDate,
    goToDate: schedule.goToDate,
    emitFlowEvent,
    showPredictionErrorOverlay,
    confirm,
  };
};
