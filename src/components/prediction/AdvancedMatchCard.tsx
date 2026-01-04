import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Sparkles, TrendingUp } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { Game, VoteTeam } from '../../types/prediction';
import { TEAM_COLORS, GAME_TIME } from '../../constants/prediction';
import { getFullTeamName } from '../../utils/prediction';

interface AdvancedMatchCardProps {
  game: Game;
  userVote: 'home' | 'away' | null;
  votePercentages: { homePercentage: number; awayPercentage: number; totalVotes: number };
  isPastGame: boolean;
  isFutureGame: boolean;
  isToday: boolean;
  onVote: (team: VoteTeam) => void;
}

export default function AdvancedMatchCard({
  game,
  userVote,
  votePercentages,
  isPastGame,
  isFutureGame,
  isToday,
  onVote,
}: AdvancedMatchCardProps) {
  const { homePercentage, awayPercentage, totalVotes } = votePercentages;
  
  // 애니메이션을 위한 상태 관리
  const [isReady, setIsReady] = useState(false); // 컴포넌트가 마운트되었는지 확인
  const [startAnimate, setStartAnimate] = useState(false); // 실제 비율로 애니메이션 시작 여부

  useEffect(() => {
    // 1. 먼저 컴포넌트가 마운트되었음을 알림 (50:50 상태로 렌더링 시작)
    setIsReady(true);
    
    // 2. 브라우저가 50:50 상태를 완전히 그린 후(약 200ms) 실제 비율로 전환
    const timer = setTimeout(() => {
      setStartAnimate(true);
    }, 200);
    
    return () => {
      clearTimeout(timer);
      setIsReady(false);
      setStartAnimate(false);
    };
  }, [game.gameId]);

  // 투수 정보가 없을 경우 기본값 처리
  const homePitcher = game.homePitcher || { name: '미정', era: '-', win: 0, loss: 0 };
  const awayPitcher = game.awayPitcher || { name: '미정', era: '-', win: 0, loss: 0 };
  
  // 승리 확률이 없을 경우 투표 비율을 대안으로 사용하거나 50:50 표시
  const winProb = game.winProbability || { 
    home: totalVotes > 0 ? homePercentage : 50, 
    away: totalVotes > 0 ? awayPercentage : 50 
  };

  // 애니메이션 적용된 비율 계산
  // - 마운트 전: 0% (렌더링 안됨)
  // - 마운트 후 애니메이션 전: 무조건 50% (트랜지션 없음)
  // - 애니메이션 시작 후: 실제 비율 (트랜지션 있음)
  const animatedAwayPct = !isReady ? 0 : (!startAnimate ? 50 : awayPercentage);
  const animatedHomePct = !isReady ? 0 : (!startAnimate ? 50 : homePercentage);

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 transition-colors duration-200 mb-6">
      
      {/* 1. AI Insight Header */}
      <div className="bg-gradient-to-r from-[#2d5f4f] to-[#1f4438] p-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse flex-shrink-0" />
        <p className="text-xs text-white font-medium truncate">
          AI 분석: {game.aiSummary || "양 팀의 최근 전력을 바탕으로 한 박빙의 승부가 예상됩니다."}
        </p>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-end mb-6">
          
          {/* Away Team & Pitcher */}
          <div className="flex flex-col items-center w-1/3">
            <div className="relative mb-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                <TeamLogo team={game.awayTeam} size={48} />
              </div>
              {/* 투수 스탯 뱃지 */}
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm font-semibold dark:text-gray-200">
                ERA {awayPitcher.era}
              </div>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white mt-2">{getFullTeamName(game.awayTeam)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{awayPitcher.name}</span>
          </div>

          {/* VS & Probability Info */}
          <div className="flex flex-col items-center justify-center w-1/3 pb-4">
            {isPastGame ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold" style={{ color: TEAM_COLORS[game.awayTeam] }}>
                  {game.awayScore}
                </span>
                <span className="text-xl font-black text-gray-300 dark:text-gray-600">:</span>
                <span className="text-3xl font-bold" style={{ color: TEAM_COLORS[game.homeTeam] }}>
                  {game.homeScore}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center mb-2">
                <span className="text-2xl font-black text-gray-300 dark:text-gray-600 italic mb-1">VS</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {GAME_TIME}
                </span>
              </div>
            )}
            
            {/* 승리 확률 Bar */}
            <div className="w-full max-w-[120px] space-y-1">
              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                <span>{Math.round(winProb.away)}%</span>
                <span>승리 확률</span>
                <span>{Math.round(winProb.home)}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${winProb.away}%`, backgroundColor: TEAM_COLORS[game.awayTeam] }} 
                  className="h-full transition-all duration-500" 
                />
                <div 
                  style={{ width: `${winProb.home}%`, backgroundColor: TEAM_COLORS[game.homeTeam] }} 
                  className="h-full transition-all duration-500" 
                />
              </div>
            </div>
          </div>

          {/* Home Team & Pitcher */}
          <div className="flex flex-col items-center w-1/3">
             <div className="relative mb-2">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                <TeamLogo team={game.homeTeam} size={48} />
              </div>
              <div className="absolute -bottom-2 -left-2 bg-white dark:bg-gray-700 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm font-semibold dark:text-gray-200">
                ERA {homePitcher.era}
              </div>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white mt-2">{getFullTeamName(game.homeTeam)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{homePitcher.name}</span>
          </div>
        </div>

        {/* 투표 버튼 영역 */}
        {isFutureGame && !isToday && (
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => onVote('away')}
              className="flex-1 py-6 text-white text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{ 
                backgroundColor: TEAM_COLORS[game.awayTeam],
                fontWeight: 700,
                opacity: userVote === 'away' ? 1 : userVote === 'home' ? 0.4 : 1,
                transform: userVote === 'away' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {getFullTeamName(game.awayTeam)}
              {userVote === 'away' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                </span>
              )}
            </Button>
            <Button
              onClick={() => onVote('home')}
              className="flex-1 py-6 text-white text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{ 
                backgroundColor: TEAM_COLORS[game.homeTeam],
                fontWeight: 700,
                opacity: userVote === 'home' ? 1 : userVote === 'away' ? 0.4 : 1,
                transform: userVote === 'home' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {getFullTeamName(game.homeTeam)}
              {userVote === 'home' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        )}

        {/* 투표 결과 바 (과거 경기이거나 투표 후 표시) */}
        {(isPastGame || userVote) && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2d5f4f] dark:text-[#4ade80]" />
                {isPastGame ? '최종 예측 결과' : '실시간 예측 현황'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                총 {totalVotes.toLocaleString()}명 참여
              </span>
            </div>
            
            <div className="relative w-full h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
              <div className="absolute inset-0 flex">
                <div
                  className={`flex items-center justify-center text-white text-sm font-bold ${startAnimate ? 'transition-all duration-1000 ease-out' : ''}`}
                  style={{ 
                    width: `${animatedAwayPct}%`,
                    backgroundColor: TEAM_COLORS[game.awayTeam],
                    opacity: isPastGame && game.winner === 'away' ? 1 : isPastGame ? 0.5 : 1
                  }}
                >
                  {startAnimate && awayPercentage > 10 && `${Math.round(awayPercentage)}%`}
                </div>
                <div
                  className={`flex items-center justify-center text-white text-sm font-bold ${startAnimate ? 'transition-all duration-1000 ease-out' : ''}`}
                  style={{ 
                    width: `${animatedHomePct}%`,
                    backgroundColor: TEAM_COLORS[game.homeTeam],
                    opacity: isPastGame && game.winner === 'home' ? 1 : isPastGame ? 0.5 : 1
                  }}
                >
                  {startAnimate && homePercentage > 10 && `${Math.round(homePercentage)}%`}
                </div>
              </div>
            </div>

            {/* 예측 성공 메시지 */}
            {isPastGame && userVote && game.winner && game.winner !== 'draw' && (
              <div className={`mt-3 text-center text-sm font-bold ${
                userVote === game.winner 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {userVote === game.winner 
                  ? '🎉 예측 적중! 훌륭한 분석이네요!' 
                  : '아쉽네요, 다음엔 맞출 수 있을 거예요!'}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}