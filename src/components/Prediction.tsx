import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight, Trophy, Flame, Target } from 'lucide-react';
import ChatBot from './ChatBot';
import RankingPrediction from './RankingPrediction';
import AdvancedMatchCard from './prediction/AdvancedMatchCard';
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
import { 
  formatDate, 
  calculateVotePercentages,
  calculateVoteAccuracy,
  getGameStatus,
} from '../utils/prediction';
import { UserPredictionStat } from '../types/prediction';

// 임시 유저 스탯 데이터 (추후 API 연동 필요)
const dummyUserStats: UserPredictionStat = {
  accuracy: 68,
  streak: 3,
  totalPredictions: 124,
  correctPredictions: 85
};

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
    isAuthLoading,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogData,
    allDatesData,
    currentDateIndex,
    handleVote,
    goToPreviousDate,
    goToNextDate,
  } = usePrediction();

  // 현재 경기 정보
  const currentGame = currentDateGames.length > 0 ? currentDateGames[selectedGame] : null;
  const currentGameId = currentGame?.gameId;
  
  // 투표 현황 계산
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const votePercentages = calculateVotePercentages(
    currentVotes.home,
    currentVotes.away
  );
  
  // 경기 상태 확인
  const { isPastGame, isFutureGame, isToday } = getGameStatus(currentGame, currentDate);

  // 로딩 중
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] dark:border-[#4ade80] mx-auto mb-4"></div>
          <p className="text-[#2d5f4f] dark:text-[#4ade80] font-medium">
            {isAuthLoading ? '로그인 확인 중...' : '경기 데이터를 불러오는 중...'}
          </p>
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
            <TrendingUp className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <h2 className="text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">KBO 예측</h2>
        </div>

        {/* User Stats Widget (Gamification) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm flex flex-col sm:flex-row items-center gap-2 md:gap-3">
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">적중률</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{dummyUserStats.accuracy}%</p>
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm flex flex-col sm:flex-row items-center gap-2 md:gap-3">
            <div className={`p-2 rounded-full shrink-0 ${dummyUserStats.streak >= 3 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">연승 도전</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{dummyUserStats.streak}연승</p>
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-gray-800 border-none shadow-sm flex flex-col sm:flex-row items-center gap-2 md:gap-3 col-span-2 md:col-span-1">
            <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">총 예측</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{dummyUserStats.totalPredictions}회</p>
            </div>
          </Card>
          {/* 추가 스탯 자리 or 광고 배너 */}
          <div className="hidden md:flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2d5f4f] to-[#1f4438] text-white p-4 shadow-sm">
             <span className="text-sm font-medium opacity-90">오늘의 승부 예측하고 포인트를 받으세요!</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl md:rounded-2xl mb-6 md:mb-8 w-full md:w-fit">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all text-xs md:text-sm font-bold ${
              activeTab === 'match'
                ? 'bg-white dark:bg-gray-700 text-[#2d5f4f] dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            승부예측
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all text-xs md:text-sm font-bold ${
              activeTab === 'ranking'
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
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#2d5f4f] dark:text-[#4ade80]"
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
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[#2d5f4f] dark:text-[#4ade80]"
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
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        selectedGame === index
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
                    userVote={userVote[currentGameId!] || null}
                    votePercentages={votePercentages}
                    isPastGame={isPastGame}
                    isFutureGame={isFutureGame}
                    isToday={isToday}
                    onVote={(team) => handleVote(team, currentGame, isPastGame)}
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
    </div>
  );
}