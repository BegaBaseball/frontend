import { useEffect, useMemo, type ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight, Coins, LineChart, Gamepad2, Loader2, ShieldAlert, Target, Flame, CheckCircle2, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import RankingPrediction from './RankingPrediction';
import ComboAnimation from './retro/ComboAnimation';
import AdvancedMatchCard from './prediction/AdvancedMatchCard';
import PredictionErrorOverlay from './prediction/PredictionErrorOverlay';
import CoachBriefing from './CoachBriefing';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrediction } from '../hooks/usePrediction';
import { useRankingsData } from '../api/home';
import { fetchMyPredictionStats } from '../api/prediction';
import { useAuthProfileSnapshot } from '../store/authStore';
import { buildPredictionRecoveryPath } from '../utils/predictionDeepLink';
import {
  formatDate,
  calculateVotePercentages,
  getGameStatus,
  resolveCoachBriefingPolicy,
} from '../utils/prediction';

const TOTAL_SEASON_GAMES = 144;
const ACCURACY_GAUGE_CIRCUMFERENCE = 2 * Math.PI * 56;

export default function Prediction() {
  const {
    activeTab,
    setActiveTab,
    selectedGame,
    setSelectedGame,
    currentDateGames,
    currentDate,
    loading,
    currentDayNavigationMeta,
    votes,
    userVote,
    currentGameDetail,
    currentGameDetailLoading,
    isAuthLoading,
    allDatesData,
    currentDateIndex,
    currentGameDetailError,
    deepLinkNotice,
    voteStatusError,
    voteStatusLoading,
    isCurrentVotePartial,
    currentVotePartialReason,
    handleVote,
    goToPreviousDate,
    goToNextDate,
    reloadMatches,
    isLoggedIn,
    matchesLoadState,
    matchesLoadErrorMessage,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    matchBounds,
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    isRunInProgress,
    isRunBannerDismissed,
    retryLoadMoreFutureMatches,
    runProgressMessage,
    dismissRunProgressBanner,
    resumeRunProgressBanner,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    retryLoadMorePastMatches,
  } = usePrediction();

  const { userCheerPoints = 0 } = useAuthProfileSnapshot();

  const { data: predictionStats } = useQuery({
    queryKey: ['prediction-stats-me'],
    queryFn: fetchMyPredictionStats,
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const accuracyPercent = useMemo(() => {
    if (!predictionStats || !Number.isFinite(predictionStats.accuracy)) {
      return 0;
    }
    return Math.max(0, Math.min(100, predictionStats.accuracy));
  }, [predictionStats]);
  const [animatedAccuracyPercent, setAnimatedAccuracyPercent] = useState(0);

  useEffect(() => {
    setAnimatedAccuracyPercent(accuracyPercent);
  }, [accuracyPercent]);

  const seasonYear = useMemo(() => {
    const parsed = new Date(currentDate);
    return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  }, [currentDate]);

  const { data: rankings = [] } = useRankingsData(seasonYear);

  // 현재 경기 정보
  const currentGame = currentDateGames.length > 0 ? currentDateGames[selectedGame] : null;
  const currentGameId = currentGame?.gameId;
  const predictionRecoveryPath = buildPredictionRecoveryPath({
    currentDate,
    currentGameId,
  });

  const rankingByTeamId = useMemo(() => {
    const map = new Map<string, { rank: number; gamesBehind?: number; games: number }>();
    rankings.forEach((team) => {
      map.set(team.teamId, {
        rank: team.rank,
        gamesBehind: team.gamesBehind,
        games: team.games,
      });
    });
    return map;
  }, [rankings]);

  const buildTeamContext = (teamId?: string) => {
    if (!teamId) return null;
    const ranking = rankingByTeamId.get(teamId);
    if (!ranking || ranking.gamesBehind == null) return null;
    const remainingGames = Math.max(0, TOTAL_SEASON_GAMES - ranking.games);
    if (!Number.isFinite(remainingGames)) return null;
    return {
      rank: ranking.rank,
      gamesBehind: ranking.gamesBehind,
      remainingGames,
    };
  };

  const seasonContext = useMemo(() => {
    const homeSeasonContext = currentGame ? buildTeamContext(currentGame.homeTeam) : null;
    const awaySeasonContext = currentGame ? buildTeamContext(currentGame.awayTeam) : null;
    const canCallAI = !!homeSeasonContext && !!awaySeasonContext;
    const maxGamesBehind = canCallAI
      ? Math.max(homeSeasonContext.gamesBehind, awaySeasonContext.gamesBehind)
      : null;
    const minRemainingGames = canCallAI
      ? Math.min(homeSeasonContext.remainingGames, awaySeasonContext.remainingGames)
      : null;
    const isPostseasonGame = currentGame?.leagueType === 'POST';
    const isMeaningfulGame = !!canCallAI &&
      ((maxGamesBehind != null && maxGamesBehind <= 2) || (minRemainingGames != null && minRemainingGames <= 20));

    return {
      home: homeSeasonContext,
      away: awaySeasonContext,
      isPostseasonGame,
      canCallAI,
      isMeaningfulGame,
      maxGamesBehind,
      minRemainingGames,
    };
  }, [currentGame?.homeTeam, currentGame?.awayTeam, currentGame?.leagueType, currentGame?.gameId, rankingByTeamId]);

  // 투표 현황 계산
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const votePercentages = calculateVotePercentages(
    currentVotes.home,
    currentVotes.away
  );

  // 경기 상태 확인
  const gameStatus = getGameStatus(currentGame, new Date(), {
    gameStatus: currentGameDetail?.gameStatus,
    gameDate: currentGameDetail?.gameDate || currentGame?.gameDate || currentDate,
    startTime: currentGameDetail?.startTime || null,
  });
  const { isPastGame, isFutureGame, isToday, statusCode } = gameStatus;
  const isScheduledGame = statusCode === 'SCHEDULED';
  const isAutoBriefEligibleGameState =
    statusCode === 'SCHEDULED' || statusCode === 'LIVE' || statusCode === 'COMPLETED';
  const hasSelectedGame = Boolean(currentGame);

  // AI 브리핑 호출 정책 입력값(가시성/디버그용)
  const coachBriefingPolicyInput = useMemo(
    () => ({
      hasSelectedGame,
      canCallAI: !!seasonContext?.canCallAI,
      isScheduledGame,
      isCoachStateEnabledForAuto: hasSelectedGame && isAutoBriefEligibleGameState,
      isPostseasonGame: !!seasonContext?.isPostseasonGame,
      isMeaningfulGame: !!seasonContext?.isMeaningfulGame,
    }),
    [
      hasSelectedGame,
      isAutoBriefEligibleGameState,
      seasonContext?.canCallAI,
      seasonContext?.isPostseasonGame,
      seasonContext?.isMeaningfulGame,
      isScheduledGame,
    ],
  );

  const coachBriefingPolicy = useMemo(
    () => resolveCoachBriefingPolicy(coachBriefingPolicyInput),
    [coachBriefingPolicyInput]
  );

  const shouldAutoRequestCoachBriefing =
    coachBriefingPolicy.autoEnabled && coachBriefingPolicy.requestMode === 'auto_brief';

  const showRunProgressBanner = isRunInProgress && !isRunBannerDismissed;
  const canMovePrevDate = currentDateIndex > 0 || canLoadMorePast;
  const canMoveNextDate = currentDateIndex < allDatesData.length - 1 || canLoadMoreFuture;
  const nearestNavigationDate = useMemo(() => {
    if (!currentDayNavigationMeta) {
      return null;
    }

    const previousCandidate = currentDayNavigationMeta.prevDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.prevDate) || null
      : null;
    const nextCandidate = currentDayNavigationMeta.nextDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.nextDate) || null
      : null;

    if ((previousCandidate?.games.length || 0) > 0) {
      return { date: previousCandidate!.date, isPast: true };
    }

    if ((nextCandidate?.games.length || 0) > 0) {
      return { date: nextCandidate!.date, isPast: false };
    }

    if (currentDayNavigationMeta.prevDate) {
      return { date: currentDayNavigationMeta.prevDate, isPast: true };
    }

    if (currentDayNavigationMeta.nextDate) {
      return { date: currentDayNavigationMeta.nextDate, isPast: false };
    }

    return null;
  }, [allDatesData, currentDayNavigationMeta]);
  const handleNearestNavigation = nearestNavigationDate
    ? nearestNavigationDate.isPast
      ? goToPreviousDate
      : goToNextDate
    : null;
  const normalizeBoundaryDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 10) : null;
  };
  const earliestBoundaryDate = normalizeBoundaryDate(matchBounds?.earliestGameDate);
  const hasAdditionalPastMatches = Boolean(
    matchBounds?.hasData
    && earliestBoundaryDate
    && allDatesData[0]?.date
    && normalizeBoundaryDate(allDatesData[0].date)
    && normalizeBoundaryDate(allDatesData[0].date)! > earliestBoundaryDate
  );
  const hasPastNavigation = canMovePrevDate || hasAdditionalPastMatches;
  type TopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';
  type TopNotice = { kind: TopNoticeKind; content: ReactNode };
  const noticeCardBaseClass = 'w-full max-w-[22rem] p-3 gap-2 pointer-events-auto';
  const isPastRetryLoading = pastRangeLoadState === 'loading';
  const isFutureRetryLoading = futureRangeLoadState === 'loading';
  const isVoteRetryLoading = voteStatusLoading;
  const isDetailRetryLoading = currentGameDetailLoading;

  const renderRetryLabel = (isLoading: boolean, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </span>
  );

  const renderFutureRangeNotice = (): ReactNode | null => {
    const isFutureRangeLoading = futureRangeLoadState === 'loading';
    const isFutureRangeError = futureRangeLoadState === 'error';
    if (!isFutureRangeLoading && !isFutureRangeError) {
      return null;
    }

    if (isFutureRangeLoading) {
      return (
        <Card className={`${noticeCardBaseClass} border border-sky-200 text-sky-900 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-100`}>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {futureRangeLoadErrorMessage || '다음 경기 탐색 중입니다.'}
          </div>
        </Card>
      );
    }

    return (
      <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
        <p className="text-sm font-medium mb-2">
          {futureRangeLoadErrorMessage || '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            disabled={isFutureRetryLoading}
            className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
            onClick={retryLoadMoreFutureMatches}
          >
            {renderRetryLabel(isFutureRetryLoading, '예정 경기 다시 불러오기')}
          </Button>
          <Link
            to={predictionRecoveryPath}
            className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
          >
            예측으로 돌아가기
          </Link>
        </div>
      </Card>
    );
  };

  const getTopNotice = (futureRangeNotice: ReactNode | null): TopNotice | null => {
    if (showRunProgressBanner) {
      return {
        kind: 'RUN',
        content: (
          <Card className={`${noticeCardBaseClass} bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700/50 dark:text-emerald-100`}>
            <div className="flex flex-wrap items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm font-medium">
                {runProgressMessage}
              </p>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 border-emerald-300/70 hover:bg-emerald-100 dark:border-emerald-600/70 dark:hover:bg-emerald-900/40"
                  onClick={() => {
                    dismissRunProgressBanner();
                  }}
                >
                  백그라운드로 계산
                </Button>
                <Button
                  size="sm"
                  className="min-h-11 bg-emerald-900 hover:bg-emerald-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950"
                  onClick={() => {
                    resumeRunProgressBanner();
                  }}
                >
                  지금 계속
                </Button>
              </div>
            </div>
          </Card>
        ),
      };
    }

    if (futureRangeNotice) {
      return {
        kind: 'FUTURE',
        content: futureRangeNotice,
      };
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'loading') {
      return {
        kind: 'INFO',
        content: (
          <Card className={`${noticeCardBaseClass} border border-sky-200 text-sky-900 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-100`}>
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              이전 경기 탐색 중입니다.
            </div>
          </Card>
        ),
      };
    }

    if (isCurrentVotePartial) {
      return {
        kind: 'INFO',
        content: (
          <Card
            data-testid="prediction-partial-result-notice"
            className={`${noticeCardBaseClass} border border-amber-200 text-amber-900 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-100`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
                부분 결과
              </span>
              <p className="text-sm font-medium">투표 집계가 일부만 도착했습니다.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isVoteRetryLoading}
                data-testid="prediction-partial-retry-btn"
                className="min-h-11 bg-amber-800 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950"
                onClick={() => {
                  reloadCurrentVoteStatus({ source: 'manual' });
                }}
              >
                {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
              </Button>
              <span className="inline-flex items-center text-xs text-amber-800/80 dark:text-amber-100/80">
                사유: {currentVotePartialReason || 'unknown'}
              </span>
            </div>
          </Card>
        ),
      };
    }

    if (voteStatusError) {
      return {
        kind: 'ERROR',
        content: (
          <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
            <p className="text-sm font-medium mb-2">투표 집계 조회 실패: {voteStatusError}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isVoteRetryLoading}
                className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={() => {
                  reloadCurrentVoteStatus();
                }}
              >
                {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
              </Button>
              <Link
                to={predictionRecoveryPath}
                className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-900 hover:bg-rose-100 dark:border-rose-300/70 dark:text-rose-100 dark:hover:bg-rose-900/40"
              >
                예측으로 돌아가기
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'error') {
      return {
        kind: 'ERROR',
        content: (
          <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
            <p className="text-sm font-medium mb-2">
              이전 경기 조회 실패: {pastRangeLoadErrorMessage || '잠시 후 다시 시도해 주세요.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isPastRetryLoading}
                className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={retryLoadMorePastMatches}
              >
                {renderRetryLabel(isPastRetryLoading, '이전 경기 다시 불러오기')}
              </Button>
              <Link
                to={predictionRecoveryPath}
                className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
              >
                예측으로 돌아가기
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentDateIndex === 0 && !canLoadMorePast && pastRangeLoadState === 'end') {
      return {
        kind: 'END',
        content: (
          <Card className={`${noticeCardBaseClass} border border-slate-200 text-slate-700 bg-slate-50 dark:bg-card dark:border-border dark:text-gray-200`}>
            <p className="text-sm font-medium">
              {pastRangeLoadErrorMessage || '더 이상 이전 경기가 없습니다.'}
            </p>
          </Card>
        ),
      };
    }

    if (
      currentDateIndex === allDatesData.length - 1
      && !canLoadMoreFuture
      && !hasPastNavigation
      && futureRangeLoadState === 'end'
    ) {
      return {
        kind: 'END',
        content: (
          <Card className={`${noticeCardBaseClass} border border-slate-200 text-slate-700 bg-slate-50 dark:bg-card dark:border-border dark:text-gray-200`}>
            <p className="text-sm font-medium">
              {futureRangeLoadErrorMessage || '더 이상 예정 경기가 없습니다.'}
            </p>
          </Card>
        ),
      };
    }

    if (deepLinkNotice) {
      return {
        kind: 'INFO',
        content: (
          <Card className={`${noticeCardBaseClass} bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-100`}>
            <div className="text-sm">
              {deepLinkNotice}
            </div>
          </Card>
        ),
      };
    }

    return null;
  };

  const futureRangeNotice = renderFutureRangeNotice();
  const sharedTopNotice = getTopNotice(futureRangeNotice);

  // 로딩 중 - 스켈레톤 UI
  if (predictionErrorOverlay?.isOpen) {
    return (
      <PredictionErrorOverlay
        isOpen
        title={predictionErrorOverlay.title}
        message={predictionErrorOverlay.message}
        errorCode={predictionErrorOverlay.errorCode}
        copyKey={predictionErrorOverlay.copyKey}
        actionPriorityOrder={predictionErrorOverlay.recoveryState.actionPriorityOrder}
        onAction={handlePredictionErrorOverlayAction}
        onClose={closePredictionErrorOverlay}
      />
    );
  }

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Title skeleton */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-200 dark:bg-card p-2 rounded-lg w-10 h-10 animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-card rounded animate-pulse" />
          </div>

          {/* Tab skeleton */}
          <div className="flex p-1 bg-slate-200 dark:bg-card rounded-xl md:rounded-2xl mb-4 w-fit animate-pulse">
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg" />
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg ml-1" />
          </div>

          {sharedTopNotice && (
            <div className="mb-4 flex justify-center sm:justify-end">
              {sharedTopNotice.content}
            </div>
          )}

          {/* Match card skeleton */}
          <Card className="p-4 mb-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-slate-200 dark:bg-card rounded-full" />
              <div className="flex-1 text-center space-y-2 px-4">
                <div className="h-5 w-32 bg-slate-200 dark:bg-card rounded mx-auto" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-card rounded mx-auto" />
              </div>
              <div className="w-10 h-10 bg-slate-200 dark:bg-card rounded-full" />
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-sm bg-white/90 dark:border-border dark:bg-card dark:shadow-md animate-pulse">
            <div className="h-11 bg-slate-200 dark:bg-card" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between">
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-card rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-card rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="h-8 w-12 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-card rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-card rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-card rounded" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (matchesLoadState === 'error') {
    return (
      <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Card className="relative p-4 sm:p-5 text-center bg-white/90 border border-rose-200/70 shadow-sm dark:bg-card dark:border-rose-900/40 dark:shadow-md flex flex-col items-center justify-center min-h-[120px] sm:min-h-[170px] md:min-h-[190px] rounded-2xl">
            <div className="bg-rose-100 dark:bg-card p-4 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-rose-500 dark:text-rose-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
              예측 경기 데이터를 불러오지 못했습니다.
            </h3>
            <p className="text-slate-500 dark:text-gray-300">
              {matchesLoadErrorMessage || '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
            </p>
            <p className="mt-2 text-sm text-slate-400 dark:text-gray-400">
              잠시 후 다시 시도하거나 새로고침해 주세요.
            </p>
            <Button
              size="sm"
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
              onClick={reloadMatches}
            >
              목록 다시 불러오기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 bg-white text-rose-600 dark:text-rose-300 border-rose-300/70"
              onClick={() => {
                window.location.href = predictionRecoveryPath;
              }}
            >
              예측으로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const topNotice = activeTab === 'match' ? getTopNotice(futureRangeNotice) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:bg-emerald-400/15 dark:border-emerald-400/30 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <LineChart className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-gray-100">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaderboard Link */}
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-emerald-400/60 transition-colors group shadow-sm dark:bg-card dark:border-border dark:hover:border-emerald-400/70 dark:shadow-md"
            >
              <Gamepad2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 dark:text-gray-300 dark:group-hover:text-emerald-300 transition-colors" />
              <span className="text-sm font-semibold text-slate-600 dark:text-gray-200 hidden sm:inline">랭킹</span>
            </Link>
            {isLoggedIn && (
              <div className="flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm dark:bg-emerald-900/40 dark:border-emerald-800/40 dark:shadow-md">
                <Coins className="w-4 h-4 text-emerald-700 fill-emerald-700 dark:text-emerald-200 dark:fill-emerald-200" />
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-100 tabular-nums">
                  {userCheerPoints.toLocaleString()} P
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AI Briefing moved into match card section */}

        {/* Seat View CTA */}
        {isLoggedIn && (
          <div className="flex justify-end mb-1">
            <Link
              to="/mypage"
              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              📸 다이어리 시야 사진 공유 → 리더보드 +50P
            </Link>
          </div>
        )}

        {/* Tabs and Game Selection Container */}
        <div className="flex flex-col gap-2.5 mb-4 md:mb-5 md:flex-row md:items-center">
          {/* Mode Tabs (Left) */}
          <div className="relative flex w-full max-w-sm overflow-hidden p-1 bg-white/80 border border-slate-200/70 rounded-xl shadow-sm dark:bg-card dark:border-border dark:shadow-md md:w-fit">
            <motion.span
              className="pointer-events-none absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700 z-0"
              initial={false}
              animate={{ x: activeTab === 'match' ? 0 : '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
            <button
              onClick={() => setActiveTab('match')}
              className={`relative z-10 w-1/2 px-3 min-h-10 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'match'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
            >
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`relative z-10 w-1/2 px-3 min-h-10 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'ranking'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
            >
              <span className="relative z-10">순위예측</span>
            </button>
          </div>


        </div>

        <div className="relative">
          <AnimatePresence initial={false} mode="wait">
            {topNotice && (
              <motion.div
                key={`top-notice-${topNotice.kind}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end"
              >
                {topNotice.content}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'match' ? (
              <motion.div
                key="match"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {/* Date Navigation & Content Wrapper */}
                <div className="w-full">
                  {currentDateGames.length > 0 ? (
                    <>
                      {/* Advanced Game Card */}
                      {currentGame && (
                        currentGameDetailError ? (
                          <Card
                            data-testid="prediction-render-fallback-card"
                            className="overflow-hidden border border-amber-200/70 shadow-lg bg-amber-50/80 dark:border-amber-700/40 dark:bg-amber-900/20 dark:shadow-xl transition-colors duration-300 mb-4 rounded-2xl"
                          >
                            <div className="p-4 md:p-5 space-y-4">
                              <div>
                                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">경기 상세를 불러오지 못했습니다.</h3>
                                <p className="text-sm text-amber-800/90 dark:text-amber-100/80 mt-1">
                                  {currentGame.awayTeam} - {currentGame.homeTeam} · {formatDate(currentDate)} · {gameStatus.statusLabel}
                                </p>
                                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2">{currentGameDetailError}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  onClick={() => handleVote('away', currentGame, gameStatus.isVoteOpen)}
                                  disabled={!gameStatus.isVoteOpen}
                                  className="min-h-10"
                                >
                                  {currentGame.awayTeam} 승
                                </Button>
                                <Button
                                  onClick={() => handleVote('home', currentGame, gameStatus.isVoteOpen)}
                                  disabled={!gameStatus.isVoteOpen}
                                  className="min-h-10"
                                >
                                  {currentGame.homeTeam} 승
                                </Button>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isDetailRetryLoading}
                                  data-testid="prediction-render-fallback-retry-btn"
                                  className="min-h-10 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-400/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
                                  onClick={() => reloadCurrentGameDetail({ emitRetryEvent: true })}
                                >
                                  {renderRetryLabel(isDetailRetryLoading, '다시 시도')}
                                </Button>
                                <Link
                                  to={predictionRecoveryPath}
                                  className="min-h-10 px-3 inline-flex items-center justify-center rounded-md border border-amber-300/70 text-amber-900 hover:bg-amber-100 dark:border-amber-300/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
                                >
                                  예측으로 돌아가기
                                </Link>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <AdvancedMatchCard
                            key={currentGame.gameId}
                            game={currentGame}
                            gameDetail={currentGameDetail}
                            gameDetailLoading={currentGameDetailLoading}
                            userVote={userVote[currentGameId!] || null}
                            votePercentages={votePercentages}
                            isVoteOpen={gameStatus.isVoteOpen}
                            statusLabel={gameStatus.statusLabel}
                            statusCode={statusCode}
                            onVote={(team) => handleVote(team, currentGame, gameStatus.isVoteOpen)}
                            onPrevDate={goToPreviousDate}
                            onNextDate={goToNextDate}
                            hasPrevDate={canMovePrevDate}
                            hasNextDate={canMoveNextDate}
                            coachBriefing={(
                              <CoachBriefing
                                game={currentGame}
                                gameDetail={currentGameDetail}
                                seasonContext={seasonContext}
                                isPastGame={isPastGame}
                                isFutureGame={isFutureGame}
                                requestMode={coachBriefingPolicy.requestMode}
                                autoEnabled={shouldAutoRequestCoachBriefing}
                                forceManual={coachBriefingPolicy.forceManual}
                              />

                            )}
                          />
                        )
                      )}
                    </>
                  ) : (
                    <Card className="relative p-4 sm:p-6 md:p-7 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[170px] sm:min-h-[210px] md:min-h-[250px] rounded-2xl">
                      {/* Navigation Buttons for Empty State */}
                      <div className="hidden md:block">
                        <button
                          onClick={goToPreviousDate}
                          disabled={!canMovePrevDate}
                          aria-label="이전 날짜 보기"
                          className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
                        >
                          <ChevronLeft size={36} />
                        </button>
                        <button
                          onClick={goToNextDate}
                          disabled={!canMoveNextDate}
                          aria-label="다음 날짜 보기"
                          className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
                        >
                          <ChevronRight size={36} />
                        </button>
                      </div>

                      <div className="bg-slate-100 dark:bg-card p-4 rounded-full mb-4">
                        <TrendingUp className="w-8 h-8 text-slate-400 dark:text-gray-300" />
                      </div>
                      <div className="mb-4">
                        <p className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-1">
                          {formatDate(currentDate)}
                        </p>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
                        {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
                      </h3>
                      <p className="text-slate-500 dark:text-gray-300">
                        {nearestNavigationDate
                          ? `가장 가까운 경기일은 ${formatDate(nearestNavigationDate.date)}입니다. ${nearestNavigationDate.isPast ? '이전' : '다음'} 날짜로 이동해 확인해보세요!`
                          : '다른 날짜를 확인해보세요!'}
                      </p>
                      {nearestNavigationDate && handleNearestNavigation ? (
                        <Button
                          type="button"
                          variant="outline"
                          data-testid="prediction-empty-nearest-date-btn"
                          className="mt-3 min-h-10 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                          onClick={handleNearestNavigation}
                        >
                          {nearestNavigationDate.isPast ? '가장 가까운 이전 경기 보기' : '가장 가까운 다음 경기 보기'}
                        </Button>
                      ) : null}
                    </Card>
                  )}
                </div>


                {/* Mobile Navigation (Bottom) */}
                <div className="flex md:hidden items-center justify-between mt-3 px-4">
                  <button
                    onClick={goToPreviousDate}
                    disabled={!canMovePrevDate}
                    aria-label="이전 날짜 보기"
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
                  >
                    <ChevronLeft size={24} className="text-emerald-600 dark:text-emerald-300" />
                  </button>
                  <span className="font-medium text-slate-900 dark:text-gray-100">
                    {formatDate(currentDate)}
                  </span>
                  <button
                    onClick={goToNextDate}
                    disabled={!canMoveNextDate}
                    aria-label="다음 날짜 보기"
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
                  >
                    <ChevronRight size={24} className="text-emerald-600 dark:text-emerald-300" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ranking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card className="p-4 mb-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-gray-100 mb-2">
                    {new Date().getFullYear()} 시즌 순위 예측
                  </h3>
                  <p className="text-slate-600 dark:text-gray-300">
                    나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!
                  </p>
                </Card>
                <RankingPrediction />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 내 예측 통계 패널 (컴팩트 위젯 버전) */}
      {isLoggedIn && predictionStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            {/* 콤팩트해진 헤더 */}
            <div className="bg-slate-50/50 dark:bg-slate-950/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">나의 예측 퍼포먼스</h3>
              </div>
            </div>

            {/* 메인 콘텐츠 (flex 기반으로 콘텐츠 묶기) */}
            <div className="p-5 sm:p-6 flex flex-row items-center justify-start sm:justify-center gap-6 sm:gap-12 overflow-x-auto">

              {/* 왼쪽: 미니 원형 게이지 */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-1.5">
                  <svg
                    className="w-full h-full transform -rotate-90 absolute top-0 left-0"
                    viewBox="0 0 128 128"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={ACCURACY_GAUGE_CIRCUMFERENCE}
                      strokeDashoffset={
                        ACCURACY_GAUGE_CIRCUMFERENCE - (animatedAccuracyPercent / 100) * ACCURACY_GAUGE_CIRCUMFERENCE
                      }
                      strokeLinecap="round"
                      className="text-indigo-500 dark:text-indigo-400 transition-all duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                  </svg>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none">
                      {animatedAccuracyPercent.toFixed(1)}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none">%</span>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 leading-none">전체 적중률</p>
              </div>

              {/* 중앙 구분선 (모바일에서도 항상 표시되도록 변경) */}
              <div className="hidden sm:block w-px h-16 bg-slate-200 dark:bg-slate-700/50 shrink-0" />

              {/* 오른쪽: 스탯 그룹 */}
              <div className="flex items-center gap-6 sm:gap-10 shrink-0">

                {/* 총 예측 */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-[11px] sm:text-xs font-semibold">총 예측</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                      {predictionStats.totalPredictions}
                    </span>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-400">회</span>
                  </div>
                </div>

                {/* 적중 */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] sm:text-xs font-semibold">적중</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                      {predictionStats.correctPredictions}
                    </span>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-400">회</span>
                  </div>
                </div>

                {/* 연속 적중 */}
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-[11px] sm:text-xs font-semibold">연속 적중</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums leading-none">
                      {predictionStats.streak}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-orange-500/70">연</span>
                  </div>
                </div>

              </div>
            </div>
          </Card>
        </div>
      )}

      <ComboAnimation />
    </div >
  );
}
