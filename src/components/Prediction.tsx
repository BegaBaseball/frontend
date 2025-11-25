import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import RankingPrediction from './RankingPrediction';
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
  getFullTeamName, 
  calculateVotePercentages,
  calculateVoteAccuracy,
  getGameStatus,
  getTodayString
} from '../utils/prediction';
import { TEAM_COLORS, GAME_TIME } from '../constants/prediction';
import { VoteTeam } from '../types/prediction';

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
    isLoggedIn,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogData,
    showLoginRequiredDialog,
    setShowLoginRequiredDialog,
    allDatesData,
    currentDateIndex,
    handleVote,
    goToPreviousDate,
    goToNextDate,
    handleGoToLogin,
  } = usePrediction();

  // 현재 경기 정보
  const currentGame = currentDateGames.length > 0 ? currentDateGames[selectedGame] : null;
  const currentGameId = currentGame?.gameId;
  
  // 투표 현황 계산
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const { homePercentage, awayPercentage, totalVotes } = calculateVotePercentages(
    currentVotes.home,
    currentVotes.away
  );
  
  // 경기 상태 확인
  const { isPastGame, isFutureGame, isToday } = getGameStatus(currentGame, currentDate);
  
  // 투표 정확도
  const voteAccuracy = currentGame 
    ? calculateVoteAccuracy(currentGame.winner, currentVotes.home, currentVotes.away)
    : null;

  // 로딩 중
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
          <p style={{ color: '#2d5f4f' }}>
            {isAuthLoading ? '로그인 확인 중...' : '경기 데이터를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 컨펌 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#2d5f4f' }}>
              {confirmDialogData.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {confirmDialogData.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogData.onConfirm}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>KBO 예측</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('match')}
            className="px-6 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: activeTab === 'match' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'match' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'match' ? 700 : 400
            }}
          >
            승부예측
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className="px-6 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: activeTab === 'ranking' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'ranking' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'ranking' ? 700 : 400
            }}
          >
            순위예측
          </button>
        </div>

        {activeTab === 'match' ? (
          <>
            {/* Date Navigation */}
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousDate}
                  disabled={currentDateIndex === 0}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#2d5f4f' }}
                >
                  <ChevronLeft size={28} />
                </button>

                <div className="flex-1 text-center">
                  <p className="mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                    {formatDate(currentDate)}
                  </p>
                  <p className="text-gray-600">
                    {isPastGame 
                      ? '과거 경기 결과와 투표 결과를 확인해보세요!' 
                      : isFutureGame
                      ? '여러분의 예측에 투표해주세요!'
                      : isToday && currentDateGames.length === 0
                      ? '오늘은 예정된 경기가 없습니다.'
                      : '여러분의 예측에 투표해주세요!'}
                  </p>
                </div>

                <button
                  onClick={goToNextDate}
                  disabled={currentDateIndex === allDatesData.length - 1}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#2d5f4f' }}
                >
                  <ChevronRight size={28} />
                </button>
              </div>
            </Card>

            {currentDateGames.length > 0 ? (
              <>
                {/* Game Selection Tabs */}
                <div className="flex gap-3 mb-8 flex-wrap">
                  {currentDateGames.map((_, index) => (
                    <Button
                      key={index}
                      onClick={() => setSelectedGame(index)}
                      className={`rounded-lg px-6 py-2 ${
                        selectedGame === index 
                          ? 'text-white' 
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={selectedGame === index ? { backgroundColor: '#2d5f4f' } : {}}
                    >
                      {index + 1}경기
                    </Button>
                  ))}
                </div>

                {/* Game Card */}
                {currentGame && (
                  <Card className="p-8 mb-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col items-center">
                        <div className="mb-3">
                          <TeamLogo team={currentGame.awayTeam} size={96} />
                        </div>
                        <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.awayTeam)}</p>
                      </div>

                      {isPastGame ? (
                        <div className="flex items-center gap-8">
                          <span className="text-6xl font-bold" style={{ color: TEAM_COLORS[currentGame.awayTeam] }}>
                            {currentGame.awayScore}
                          </span>
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2d5f4f' }}>VS</span>
                          <span className="text-6xl font-bold" style={{ color: TEAM_COLORS[currentGame.homeTeam] }}>
                            {currentGame.homeScore}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2d5f4f' }}>VS</span>
                          <div 
                            className="px-4 py-2 rounded-full text-white"
                            style={{ backgroundColor: '#2d5f4f' }}
                          >
                            {GAME_TIME}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col items-center">
                        <div className="mb-3">
                          <TeamLogo team={currentGame.homeTeam} size={96} />
                        </div>
                        <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.homeTeam)}</p>
                      </div>
                    </div>

                    {isFutureGame && !isToday && (
                      <div className="flex gap-4 mb-6">
                        <Button
                          onClick={() => handleVote('away' as VoteTeam, currentGame, isPastGame)}
                          className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                          style={{ 
                            backgroundColor: TEAM_COLORS[currentGame.awayTeam],
                            fontWeight: 700,
                            opacity: userVote[currentGameId!] === 'away' ? 1 : userVote[currentGameId!] === 'home' ? 0.5 : 1
                          }}
                        >
                          {getFullTeamName(currentGame.awayTeam)} {userVote[currentGameId!] === 'away' && '✓'}
                        </Button>
                        <Button
                          onClick={() => handleVote('home' as VoteTeam, currentGame, isPastGame)}
                          className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                          style={{ 
                            backgroundColor: TEAM_COLORS[currentGame.homeTeam],
                            fontWeight: 700,
                            opacity: userVote[currentGameId!] === 'home' ? 1 : userVote[currentGameId!] === 'away' ? 0.5 : 1
                          }}
                        >
                          {getFullTeamName(currentGame.homeTeam)} {userVote[currentGameId!] === 'home' && '✓'}
                        </Button>
                      </div>
                    )}

                    <div className="rounded-lg p-6" style={{ backgroundColor: '#f0f9f6' }}>
                      <div className="flex items-center justify-between mb-4">
                        <span style={{ color: '#2d5f4f', fontWeight: 700 }}>
                          {isPastGame ? '투표 결과 현황' : '실시간 투표 현황'}
                        </span>
                        <span className="text-sm text-gray-600">
                          총 {totalVotes}명 참여
                        </span>
                      </div>
                      
                      {isPastGame && currentGame.winner !== 'draw' && voteAccuracy !== null && (
                        <div className="mb-3 text-center text-sm" style={{ color: '#2d5f4f' }}>
                          <span className="font-bold">{voteAccuracy}%</span>의 팬들이 승리팀을 정확히 예측했습니다!
                        </div>
                      )}

                      {isPastGame && currentGame.winner === 'draw' && (
                        <div className="mb-3 text-center text-sm font-bold" style={{ color: '#f59e0b' }}>
                          무승부 경기입니다
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontWeight: 700, color: '#333' }}>
                          {getFullTeamName(currentGame.awayTeam)}
                        </span>
                        <span style={{ fontWeight: 700, color: '#333' }}>
                          {getFullTeamName(currentGame.homeTeam)}
                        </span>
                      </div>

                      <div className="relative w-full h-12 rounded-lg overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                        <div className="absolute inset-0 flex">
                          <div
                            className="flex items-center justify-center text-white transition-all duration-500"
                            style={{ 
                              width: `${awayPercentage}%`,
                              backgroundColor: TEAM_COLORS[currentGame.awayTeam],
                              fontWeight: 700,
                              fontSize: '1.125rem',
                              opacity: isPastGame && currentGame.winner === 'away' ? 1 : isPastGame ? 0.6 : 1
                            }}
                          >
                            {totalVotes > 0 && awayPercentage > 0 && `${awayPercentage}%`}
                          </div>
                          <div
                            className="flex items-center justify-center text-white transition-all duration-500"
                            style={{ 
                              width: `${homePercentage}%`,
                              backgroundColor: TEAM_COLORS[currentGame.homeTeam],
                              fontWeight: 700,
                              fontSize: '1.125rem',
                              opacity: isPastGame && currentGame.winner === 'home' ? 1 : isPastGame ? 0.6 : 1
                            }}
                          >
                            {totalVotes > 0 && homePercentage > 0 && `${homePercentage}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {currentGameId && userVote[currentGameId] && currentGame && (
                  <div className="text-center mb-6">
                    <p style={{ color: '#2d5f4f', fontWeight: 700 }}>
                       {userVote[currentGameId] === 'home' 
                        ? getFullTeamName(currentGame.homeTeam) 
                        : getFullTeamName(currentGame.awayTeam)}에 투표하셨습니다!
                      {isPastGame && userVote[currentGameId] === currentGame.winner && ' 정확한 예측이었습니다! ⚾'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <Card className="p-16 text-center" style={{ 
                backgroundColor: '#f0f9f6',
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <h3 className="text-xl font-bold" style={{ color: '#2d5f4f' }}>
                  {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
                </h3>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <p className="text-center mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                2026 시즌 순위 예측
              </p>
              <p className="text-center text-gray-600">
                팀을 드래그해서 내년 시즌 순위를 예측해보세요
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