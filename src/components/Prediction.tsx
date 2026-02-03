import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight, Trophy, Flame, Target, Coins, LineChart, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatBot from './ChatBot';
import RankingPrediction from './RankingPrediction';
import ComboAnimation from './retro/ComboAnimation';
import AdvancedMatchCard from './prediction/AdvancedMatchCard';
import CoachBriefing from './CoachBriefing';
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
import { TEAM_NAME_TO_ID } from '../constants/teams';
import {
  formatDate,
  calculateVotePercentages,
  getGameStatus,
} from '../utils/prediction';
import { UserPredictionStat } from '../types/prediction';

const emptyUserStats: UserPredictionStat = {
  accuracy: 0,
  streak: 0,
  totalPredictions: 0,
  correctPredictions: 0,
};

const TOTAL_SEASON_GAMES = 144;
const TEAM_ID_ALIASES: Record<string, string> = {
  KIA: 'HT',
  SSG: 'SK',
  DO: 'OB',
  KI: 'WO',
  NX: 'WO',
  BE: 'HH',
  MBC: 'LG',
  SL: 'SK',
};

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

  const normalizeTeamId = (teamId?: string | null) => {
    if (!teamId) return null;
    return TEAM_ID_ALIASES[teamId] ?? TEAM_NAME_TO_ID[teamId] ?? teamId;
  };

  const rankingByTeamId = useMemo(() => {
    const map = new Map<string, { rank: number; gamesBehind?: number; games: number }>();
    rankings.forEach((team) => {
      const normalizedId = normalizeTeamId(team.teamId) ?? team.teamId;
      map.set(normalizedId, {
        rank: team.rank,
        gamesBehind: team.gamesBehind,
        games: team.games,
      });
    });
    return map;
  }, [rankings]);

  const buildTeamContext = (teamId?: string) => {
    if (!teamId) return null;
    const normalizedId = normalizeTeamId(teamId);
    if (!normalizedId) return null;
    const ranking = rankingByTeamId.get(normalizedId);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title skeleton */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg w-10 h-10 animate-pulse" />
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm animate-pulse">
                <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Tab skeleton */}
          <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl md:rounded-2xl mb-6 md:mb-8 w-fit animate-pulse">
            <div className="w-20 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg" />
            <div className="w-20 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg ml-1" />
          </div>

          {/* Match card skeleton */}
          <Card className="p-4 mb-6 bg-white dark:bg-gray-800 border-none shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 text-center space-y-2 px-4">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
              </div>
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </Card>

          <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 animate-pulse">
            <div className="h-12 bg-gray-300 dark:bg-gray-700" />
            <div className="p-6 space-y-6">
              <div className="flex justify-between">
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* 컨펌 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#2d5f4f' }} className="dark:text-[#4ade80]">
              {confirmDialogData.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line text-gray-600 dark:text-gray-300">
              {confirmDialogData.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogData.onConfirm}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#2d5f4f] dark:bg-[#4ade80] p-2 rounded-lg">
            <LineChart className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaderboard Link */}
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-full hover:from-cyan-500/20 hover:to-purple-500/20 transition-all group"
            >
              <Gamepad2 className="w-4 h-4 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
              <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 hidden sm:inline">랭킹</span>
            </Link>
            {isLoggedIn && (
              <div className="flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-full">
                <Coins className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 tabular-nums">
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
          totalVotes={currentVotes.home + currentVotes.away}
          isPastGame={isPastGame}
        />

        {/* User Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-500 dark:text-gray-400">적중률</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                  {userStats.accuracy.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <Flame className="w-5 h-5 text-orange-500 dark:text-orange-300" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-500 dark:text-gray-400">연승</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                  {userStats.streak}연승
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-500 dark:text-gray-400">누적 예측</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                  {userStats.totalPredictions.toLocaleString()}회
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Coins className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-500 dark:text-gray-400">적중 횟수</p>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                  {userStats.correctPredictions.toLocaleString()}회
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl md:rounded-2xl mb-6 md:mb-8 w-full md:w-fit">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all text-xs md:text-sm font-bold ${activeTab === 'match'
              ? 'bg-white dark:bg-gray-700 text-[#2d5f4f] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            승부예측
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all text-xs md:text-sm font-bold ${activeTab === 'ranking'
              ? 'bg-white dark:bg-gray-700 text-[#2d5f4f] dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            순위예측
          </button>
        </div>

        {activeTab === 'match' ? (
          <>
            {/* Date Navigation */}
            <Card className="p-4 mb-6 bg-white dark:bg-gray-800 border-none shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousDate}
                  disabled={currentDateIndex === 0}
                  aria-label="이전 날짜"
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#2d5f4f] dark:text-[#4ade80]"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex-1 text-center">
                  <p className="text-lg font-black text-[#2d5f4f] dark:text-[#4ade80] mb-1">
                    {formatDate(currentDate)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {isPastGame
                      ? '지난 경기 결과를 확인하세요'
                      : isFutureGame
                        ? '승리가 예상되는 팀을 선택하세요'
                        : isToday && currentDateGames.length === 0
                          ? '오늘은 경기가 없습니다'
                          : '승리가 예상되는 팀을 선택하세요'}
                  </p>
                </div>

                <button
                  onClick={goToNextDate}
                  disabled={currentDateIndex === allDatesData.length - 1}
                  aria-label="다음 날짜"
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#2d5f4f] dark:text-[#4ade80]"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </Card>

            {currentDateGames.length > 0 ? (
              <>
                {/* Game Selection Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  {currentDateGames.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedGame(index)}
                      aria-pressed={selectedGame === index}
                      aria-label={`${index + 1}경기 선택`}
                      className={`flex-shrink-0 px-4 py-3 min-h-[44px] rounded-full text-sm font-bold transition-all ${selectedGame === index
                        ? 'bg-[#2d5f4f] text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {index + 1}경기
                    </button>
                  ))}
                </div>

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
                  />
                )}
              </>
            ) : (
              <Card className="p-16 text-center bg-white dark:bg-gray-800 border-none shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
                </h3>
                <p className="text-gray-500 dark:text-gray-500">다른 날짜를 확인해보세요!</p>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-none shadow-sm text-center">
              <h3 className="text-xl font-black text-[#2d5f4f] dark:text-[#4ade80] mb-2">
                2026 시즌 순위 예측
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!
              </p>
            </Card>
            <RankingPrediction />
          </>
        )}
      </div>

      <ChatBot />
      <ComboAnimation />
    </div>
  );
}
