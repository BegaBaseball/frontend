import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight, Coins, LineChart, Gamepad2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import RankingPrediction from './RankingPrediction';
import ComboAnimation from './retro/ComboAnimation';
import AdvancedMatchCard from './prediction/AdvancedMatchCard';
import PredictionErrorOverlay from './prediction/PredictionErrorOverlay';
import CoachBriefing from './CoachBriefing';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrediction } from '../hooks/usePrediction';
import { useRankingsData } from '../api/home';
import { useAuthStore } from '../store/authStore';
import {
  formatDate,
  calculateVotePercentages,
  getGameStatus,
  getShortTeamName,
  resolveCoachBriefingPolicy,
} from '../utils/prediction';

const TOTAL_SEASON_GAMES = 144;

export default function Prediction() {
  const {
    activeTab,
    setActiveTab,
    selectedGame,
    setSelectedGame,
    currentDateGames,
    currentDate,
    loading,
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
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    isRunInProgress,
    retryLoadMoreFutureMatches,
    runProgressMessage,
    dismissRunProgressBanner,
    resumeRunProgressBanner,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    retryLoadMorePastMatches,
  } = usePrediction();

  const user = useAuthStore((state) => state.user);

  const seasonYear = useMemo(() => {
    const parsed = new Date(currentDate);
    return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  }, [currentDate]);

  const { data: rankings = [] } = useRankingsData(seasonYear);

  // 현재 경기 정보
  const currentGame = currentDateGames.length > 0 ? currentDateGames[selectedGame] : null;
  const currentGameId = currentGame?.gameId;

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
  const coachBriefingPolicy = useMemo(
    () => resolveCoachBriefingPolicy({
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

  const [isRunBannerDismissed, setIsRunBannerDismissed] = useState(false);

  useEffect(() => {
    if (!isRunInProgress) {
      setIsRunBannerDismissed(false);
    }
  }, [isRunInProgress]);

  const showRunProgressBanner = isRunInProgress && !isRunBannerDismissed;
  const canMovePrevDate = currentDateIndex > 0 || pastRangeLoadState === 'ready';
  const canMoveNextDate = currentDateIndex < allDatesData.length - 1 || futureRangeLoadState === 'ready';
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
            className="h-8 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
            onClick={retryLoadMoreFutureMatches}
          >
            {renderRetryLabel(isFutureRetryLoading, '예정 경기 다시 불러오기')}
          </Button>
          <Link
            to="/"
            className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
          >
            홈으로 이동
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
                  className="h-8 border-emerald-300/70 hover:bg-emerald-100 dark:border-emerald-600/70 dark:hover:bg-emerald-900/40"
                  onClick={() => {
                    dismissRunProgressBanner();
                    setIsRunBannerDismissed(true);
                  }}
                >
                  백그라운드로 계산
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-900 hover:bg-emerald-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950"
                  onClick={() => {
                    resumeRunProgressBanner();
                    setIsRunBannerDismissed(false);
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
                className="h-8 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={reloadCurrentVoteStatus}
              >
                {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
              </Button>
              <Link
                to="/"
                className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-900 hover:bg-rose-100 dark:border-rose-300/70 dark:text-rose-100 dark:hover:bg-rose-900/40"
              >
                홈으로 이동
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentGameDetailError) {
      return {
        kind: 'ERROR',
        content: (
          <Card className={`${noticeCardBaseClass} border border-amber-200 text-amber-900 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-100`}>
            <p className="text-sm font-medium mb-2">경기 상세 조회 실패: {currentGameDetailError}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isDetailRetryLoading}
                className="h-8 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-400/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
                onClick={reloadCurrentGameDetail}
              >
                {renderRetryLabel(isDetailRetryLoading, '경기 상세 다시 시도')}
              </Button>
              <Link
                to="/"
                className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-amber-300/70 text-amber-900 hover:bg-amber-100 dark:border-amber-300/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
              >
                홈으로 이동
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
                className="h-8 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={retryLoadMorePastMatches}
              >
                {renderRetryLabel(isPastRetryLoading, '이전 경기 다시 불러오기')}
              </Button>
              <Link
                to="/"
                className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
              >
                홈으로 이동
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'end') {
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

    if (currentDateIndex === allDatesData.length - 1 && futureRangeLoadState === 'end') {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-200 dark:bg-card p-2 rounded-lg w-10 h-10 animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-card rounded animate-pulse" />
          </div>

          {/* Tab skeleton */}
          <div className="flex p-1 bg-slate-200 dark:bg-card rounded-xl md:rounded-2xl mb-6 md:mb-8 w-fit animate-pulse">
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg" />
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg ml-1" />
          </div>

          {sharedTopNotice && (
            <div className="mb-4 flex justify-center sm:justify-end">
              {sharedTopNotice.content}
            </div>
          )}

          {/* Match card skeleton */}
          <Card className="p-4 mb-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md animate-pulse">
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
            <div className="h-12 bg-slate-200 dark:bg-card" />
            <div className="p-6 space-y-6">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="relative p-6 sm:p-8 md:p-10 text-center bg-white/90 border border-rose-200/70 shadow-sm dark:bg-card dark:border-rose-900/40 dark:shadow-md flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[240px] rounded-2xl">
            <div className="bg-rose-100 dark:bg-card p-4 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-rose-500 dark:text-rose-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
              {matchesLoadErrorMessage || '예측 경기 데이터를 불러오지 못했습니다.'}
            </h3>
            <p className="text-slate-500 dark:text-gray-300">
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
                window.location.href = '/';
              }}
            >
              홈으로 이동
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // legacy empty-state dead-end path (kept for backward compatibility)
  if (false && (matchesLoadState as string) === 'empty') {
    const hasFutureRangeFailure = futureRangeLoadState === 'error' && Boolean(futureRangeNotice);
    return (
      <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="relative p-6 sm:p-8 md:p-10 text-center bg-white/90 border border-slate-300/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[240px] rounded-2xl">
            <TrendingUp className="w-8 h-8 text-slate-500 dark:text-slate-300 mb-4" />
            {hasFutureRangeFailure ? (
              <div className="w-full flex flex-col items-center">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
                  미래 구간 조회에 실패했습니다.
                </h3>
                <p className="text-slate-500 dark:text-gray-300 mb-4">
                  아래 액션으로 재시도하거나 홈으로 이동해 주세요.
                </p>
                {futureRangeNotice}
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
                  현재 표시할 예측 경기가 없습니다.
                </h3>
                <p className="text-slate-500 dark:text-gray-300">
                  잠시 후 다시 시도하거나 홈 화면으로 이동해 주세요.
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
                  className="mt-2 bg-white text-slate-600 dark:text-slate-200 border-slate-300/70 dark:border-border"
                  onClick={() => {
                    window.location.href = '/';
                  }}
                >
                  홈으로 이동
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const topNotice = activeTab === 'match' ? getTopNotice(futureRangeNotice) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
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
                  {user?.cheerPoints?.toLocaleString() || 0} P
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AI Briefing moved into match card section */}

        {/* Tabs and Game Selection Container */}
        <div className="flex flex-col gap-3 mb-6 md:mb-8 md:flex-row md:items-center">
          {/* Mode Tabs (Left) */}
          <div className="relative flex w-fit p-1 bg-white/80 border border-slate-200/70 rounded-xl shadow-sm dark:bg-card dark:border-border dark:shadow-md">
            <motion.span
              className="pointer-events-none absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700 z-0"
              initial={false}
              animate={{ x: activeTab === 'match' ? 0 : '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
            <button
              onClick={() => setActiveTab('match')}
              className={`relative z-10 w-24 px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'match'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
            >
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`relative z-10 w-24 px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'ranking'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
                }`}
            >
              <span className="relative z-10">순위예측</span>
            </button>
          </div>

          {/* Game Selection Filter (Right) */}
          {activeTab === 'match' && currentDateGames.length > 0 && (
            <div className="w-full md:ml-auto md:w-auto">
              <div className="flex justify-end gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                {currentDateGames.map((game, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedGame(index)}
                    aria-pressed={selectedGame === index}
                    aria-label={`${getShortTeamName(game.awayTeam)} vs ${getShortTeamName(game.homeTeam)} 선택`}
                    className={`flex-shrink-0 px-3 py-2 min-h-[40px] rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${selectedGame === index
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-100'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-card dark:border-border dark:text-gray-300 dark:hover:bg-primary/10'
                      }`}
                  >
                    {getShortTeamName(game.awayTeam)} vs {getShortTeamName(game.homeTeam)}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                            autoEnabled={coachBriefingPolicy.autoEnabled}
                            forceManual={coachBriefingPolicy.forceManual}
                          />

                          )}
                        />
                      )}
                    </>
                  ) : (
                    <Card className="relative p-5 sm:p-7 md:p-10 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[220px] sm:min-h-[280px] md:min-h-[350px] rounded-2xl">
                      {/* Navigation Buttons for Empty State */}
                      <div className="hidden md:block">
                        <button
                          onClick={goToPreviousDate}
                          disabled={!canMovePrevDate}
                          className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
                        >
                          <ChevronLeft size={36} />
                        </button>
                        <button
                          onClick={goToNextDate}
                          disabled={!canMoveNextDate}
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
                      <p className="text-slate-500 dark:text-gray-300">다른 날짜를 확인해보세요!</p>
                    </Card>
                  )}
                </div>


                {/* Mobile Navigation (Bottom) */}
                <div className="flex md:hidden items-center justify-between mt-4 px-4">
                  <button
                    onClick={goToPreviousDate}
                    disabled={!canMovePrevDate}
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
                <Card className="p-6 mb-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
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

      <ComboAnimation />
    </div >
  );
}
