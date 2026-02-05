import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { TrendingUp, ChevronLeft, ChevronRight, Trophy, Flame, Target, Coins, LineChart, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatBot from './ChatBot';
import RankingPrediction from './RankingPrediction';
import ComboAnimation from './retro/ComboAnimation';
import AdvancedMatchCard from './prediction/AdvancedMatchCard';
import CoachBriefing from './CoachBriefing';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { usePrediction } from '../hooks/usePrediction';
import { fetchMyPredictionStats } from '../api/prediction';
import { useRankingsData } from '../api/home';
import { useAuthStore } from '../store/authStore';
import {
  formatDate,
  calculateVotePercentages,
  getGameStatus,
  getFullTeamName,
  getShortTeamName,
} from '../utils/prediction';
import { UserPredictionStat } from '../types/prediction';

const emptyUserStats: UserPredictionStat = {
  accuracy: 0,
  streak: 0,
  totalPredictions: 0,
  correctPredictions: 0,
};

const TOTAL_SEASON_GAMES = 144;

export default function Prediction() {
  const [userStats, setUserStats] = useState<UserPredictionStat>(emptyUserStats);
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
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogData,
    allDatesData,
    currentDateIndex,
    handleVote,
    goToPreviousDate,
    goToNextDate,
    isLoggedIn, // Added isLoggedIn
  } = usePrediction();

  const user = useAuthStore((state) => state.user); // Added user

  const seasonYear = useMemo(() => {
    const parsed = new Date(currentDate);
    return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  }, [currentDate]);

  const { data: rankings = [] } = useRankingsData(seasonYear);

  useEffect(() => {
    let active = true;

    if (!isLoggedIn) {
      setUserStats(emptyUserStats);
      return undefined;
    }

    const loadStats = async () => {
      try {
        const stats = await fetchMyPredictionStats();
        if (active) {
          setUserStats(stats);
        }
      } catch {
        if (active) {
          setUserStats(emptyUserStats);
        }
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

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

  const homeSeasonContext = currentGame ? buildTeamContext(currentGame.homeTeam) : null;
  const awaySeasonContext = currentGame ? buildTeamContext(currentGame.awayTeam) : null;
  const canCallAI = !!homeSeasonContext && !!awaySeasonContext;
  const maxGamesBehind = canCallAI
    ? Math.max(homeSeasonContext.gamesBehind, awaySeasonContext.gamesBehind)
    : null;
  const minRemainingGames = canCallAI
    ? Math.min(homeSeasonContext.remainingGames, awaySeasonContext.remainingGames)
    : null;
  const isMeaningfulGame = !!canCallAI &&
    ((maxGamesBehind != null && maxGamesBehind <= 2) || (minRemainingGames != null && minRemainingGames <= 20));

  const seasonContext = {
    home: homeSeasonContext,
    away: awaySeasonContext,
    canCallAI,
    isMeaningfulGame,
    maxGamesBehind,
    minRemainingGames,
  };

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
  const { isPastGame, isFutureGame, isToday } = gameStatus;

  // 로딩 중 - 스켈레톤 UI
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-lg w-10 h-10 animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:shadow-md animate-pulse">
                <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2">
                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Tab skeleton */}
          <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl md:rounded-2xl mb-6 md:mb-8 w-fit animate-pulse">
            <div className="w-20 h-10 bg-slate-300 dark:bg-slate-700 rounded-lg" />
            <div className="w-20 h-10 bg-slate-300 dark:bg-slate-700 rounded-lg ml-1" />
          </div>

          {/* Match card skeleton */}
          <Card className="p-4 mb-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:shadow-md animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="flex-1 text-center space-y-2 px-4">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
              </div>
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-sm bg-white/90 dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-md animate-pulse">
            <div className="h-12 bg-slate-200 dark:bg-slate-800" />
            <div className="p-6 space-y-6">
              <div className="flex justify-between">
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="h-8 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
      {/* 컨펌 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-700 dark:text-emerald-300">
              {confirmDialogData.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line text-slate-600 dark:text-slate-300">
              {confirmDialogData.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogData.onConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-300 dark:text-slate-900 dark:hover:bg-emerald-200"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:bg-emerald-400/15 dark:border-emerald-400/30 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <LineChart className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaderboard Link */}
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-emerald-400/60 transition-colors group shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:hover:border-emerald-400/70 dark:shadow-md"
            >
              <Gamepad2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-300 transition-colors" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">랭킹</span>
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

        {/* Coach Briefing Widget */}
        <CoachBriefing
          game={currentGame}
          gameDetail={currentGameDetail}
          seasonContext={seasonContext}
          isPastGame={isPastGame}
        />

        {/* User Stats */}
        <Card className="mb-6 md:mb-8 overflow-hidden border border-emerald-200/70 shadow-sm bg-white/90 rounded-2xl dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:shadow-md">
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-r border-emerald-100/70 dark:border-emerald-900/40 md:border-b-0">
              <div className="p-2.5 bg-emerald-100 rounded-xl dark:bg-emerald-900/40">
                <Target className="w-5 h-5 text-emerald-900 dark:text-emerald-200" />
              </div>
              <div>
                <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">적중률</p>
                <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100 tabular-nums">
                  {userStats.accuracy.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-100/70 dark:border-emerald-900/40 md:border-b-0 md:border-r">
              <div className="p-2.5 bg-emerald-100 rounded-xl dark:bg-emerald-900/40">
                <Flame className="w-5 h-5 text-emerald-900 dark:text-emerald-200" />
              </div>
              <div>
                <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">연승</p>
                <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100 tabular-nums">
                  {userStats.streak}연승
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-r border-emerald-100/70 dark:border-emerald-900/40 md:border-r">
              <div className="p-2.5 bg-emerald-100 rounded-xl dark:bg-emerald-900/40">
                <Trophy className="w-5 h-5 text-emerald-900 dark:text-emerald-200" />
              </div>
              <div>
                <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">누적 예측</p>
                <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100 tabular-nums">
                  {userStats.totalPredictions.toLocaleString()}회
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl dark:bg-emerald-900/40">
                <Coins className="w-5 h-5 text-emerald-900 dark:text-emerald-200" />
              </div>
              <div>
                <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">적중 횟수</p>
                <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100 tabular-nums">
                  {userStats.correctPredictions.toLocaleString()}회
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs and Game Selection Container */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 md:mb-8">
          {/* Mode Tabs */}
          <div className="relative flex p-1 bg-white/80 border border-slate-200/70 rounded-xl shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:shadow-md">
            <button
              onClick={() => setActiveTab('match')}
              className={`relative px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'match'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              {activeTab === 'match' && (
                <motion.span
                  layoutId="prediction-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700 z-0"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`relative px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'ranking'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              {activeTab === 'ranking' && (
                <motion.span
                  layoutId="prediction-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700 z-0"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className="relative z-10">순위예측</span>
            </button>
          </div>

          {/* Game Selection Tabs */}
          {activeTab === 'match' && currentDateGames.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {currentDateGames.map((game, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedGame(index)}
                  aria-pressed={selectedGame === index}
                  aria-label={`${getShortTeamName(game.awayTeam)} vs ${getShortTeamName(game.homeTeam)} 선택`}
                  className={`flex-shrink-0 px-3 py-2 min-h-[40px] rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${selectedGame === index
                    ? 'bg-emerald-900 text-white shadow-md dark:bg-emerald-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 dark:bg-slate-900/70 dark:border-slate-700/60 dark:text-slate-400 dark:hover:border-emerald-400/60'
                    }`}
                >
                  {getShortTeamName(game.awayTeam)} vs {getShortTeamName(game.homeTeam)}
                </button>
              ))}
            </div>
          )}
        </div>

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
                        isClosed={gameStatus.isClosed}
                        onVote={(team) => handleVote(team, currentGame, gameStatus.isVoteOpen)}
                        onPrevDate={goToPreviousDate}
                        onNextDate={goToNextDate}
                        hasPrevDate={currentDateIndex > 0}
                        hasNextDate={currentDateIndex < allDatesData.length - 1}
                      />
                    )}
                  </>
                ) : (
                  <Card className="relative p-16 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:shadow-md flex flex-col items-center justify-center min-h-[400px] rounded-2xl">
                    {/* Navigation Buttons for Empty State */}
                    <div className="hidden md:block">
                      <button
                        onClick={goToPreviousDate}
                        disabled={currentDateIndex === 0}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-slate-500 transition-colors"
                      >
                        <ChevronLeft size={36} />
                      </button>
                      <button
                        onClick={goToNextDate}
                        disabled={currentDateIndex === allDatesData.length - 1}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-slate-500 transition-colors"
                      >
                        <ChevronRight size={36} />
                      </button>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                      <TrendingUp className="w-8 h-8 text-slate-400 dark:text-slate-400" />
                    </div>
                    <div className="mb-4">
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {formatDate(currentDate)}
                      </p>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">다른 날짜를 확인해보세요!</p>
                  </Card>
                )}
              </div>


              {/* Mobile Navigation (Bottom) */}
              <div className="flex md:hidden items-center justify-between mt-4 px-4">
                <button
                  onClick={goToPreviousDate}
                  disabled={currentDateIndex === 0}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft size={24} className="text-emerald-600 dark:text-emerald-300" />
                </button>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(currentDate)}
                </span>
                <button
                  onClick={goToNextDate}
                  disabled={currentDateIndex === allDatesData.length - 1}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
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
              <Card className="p-6 mb-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-slate-900/70 dark:border-slate-700/60 dark:shadow-md text-center rounded-2xl">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  2026 시즌 순위 예측
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!
                </p>
              </Card>
              <RankingPrediction />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChatBot />
      <ComboAnimation />
    </div >
  );
}
