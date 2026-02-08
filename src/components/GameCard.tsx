import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import TeamLogo from './TeamLogo';

interface GameCardProps {
  game: {
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    time: string;
    stadium: string;
    status?: string;
    gameStatus?: string;
    gameStatusKr?: string;
    gameInfo: string;
    homeScore?: number;
    awayScore?: number;
  };
  featured?: boolean;
}

export default function GameCard({ game, featured = false }: GameCardProps) {
  // 경기 상태에 따른 뱃지 스타일
  const getStatusBadgeStyle = (status?: string) => {
    if (!status) return null;

    switch (status) {
      case 'SCHEDULED':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/40',
          color: 'text-blue-700 dark:text-blue-300',
          text: '경기 예정'
        };
      case 'PLAYING': // Live status
        return {
          bg: 'bg-red-100 dark:bg-red-900/40',
          color: 'text-red-600 dark:text-red-400',
          text: 'LIVE'
        };
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/40',
          color: 'text-emerald-700 dark:text-emerald-400',
          text: '경기 종료'
        };
      case 'CANCELLED':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          color: 'text-gray-600 dark:text-gray-400',
          text: '경기 취소'
        };
      case 'POSTPONED':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/40',
          color: 'text-orange-700 dark:text-orange-300',
          text: '우천 취소' // Usually weather related
        };
      case 'DRAW':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/40',
          color: 'text-purple-700 dark:text-purple-300',
          text: '무승부'
        };
      default:
        return null;
    }
  };

  const statusStyle = getStatusBadgeStyle(game.gameStatus || game.status);
  const isLive = game.gameStatus === 'PLAYING';

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl border-0
        ${featured
          ? 'bg-white/90 dark:bg-gray-800/90 shadow-xl ring-1 ring-black/5'
          : 'bg-white/80 dark:bg-gray-800/50 shadow-md hover:bg-white dark:hover:bg-gray-800'
        } backdrop-blur-sm`}
    >
      {/* Spotlight Effect Gradient (on hover) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-transparent via-emerald-500/5 to-transparent dark:via-emerald-400/10" />

      {/* Live Indicator Overlay */}
      {isLive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-gradient-x" />
      )}

      <div className="p-5 md:p-6 relative z-10">
        {/* Header: Stadium & Time */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-gray-100/50 dark:bg-gray-700/50 border-0 text-gray-600 dark:text-gray-300 backdrop-blur-sm"
            >
              {(game.stadium ?? '').replace('구장', '')}
            </Badge>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">
              {game.time}
            </span>
          </div>

          {statusStyle && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusStyle.bg} ${statusStyle.color}`}>
              {isLive && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {statusStyle.text}
            </span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-1 sm:gap-4 mb-6">
          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-3 group/team">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 xl:w-20 xl:h-20 flex items-center justify-center p-3 bg-white dark:bg-gray-700/30 rounded-2xl shadow-sm group-hover/team:shadow-md group-hover/team:scale-105 transition-all duration-300">
                <TeamLogo team={game.awayTeam} size="full" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
            </div>
            <span className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm xl:text-base tracking-tight truncate w-full text-center">
              {(game.awayTeamFull ?? '').split(' ')[0]}
            </span>
          </div>

          {/* VS / Score */}
          <div className="flex flex-col items-center justify-center w-16 sm:w-24 xl:w-32 shrink-0">
            {(game.gameStatus === 'PLAYING' || game.gameStatus === 'COMPLETED') &&
              game.homeScore !== undefined && game.awayScore !== undefined ? (
              <div className="flex items-center gap-2 sm:gap-4 font-black text-2xl sm:text-3xl xl:text-4xl">
                <span className={`${game.awayScore > game.homeScore ? 'text-gray-900 dark:text-white scale-110' : 'text-gray-400 dark:text-gray-600'} transition-all duration-300`}>
                  {game.awayScore}
                </span>
                <span className="text-gray-300 dark:text-gray-700 text-lg sm:text-2xl -mt-1">:</span>
                <span className={`${game.homeScore > game.awayScore ? 'text-gray-900 dark:text-white scale-110' : 'text-gray-400 dark:text-gray-600'} transition-all duration-300`}>
                  {game.homeScore}
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 font-black text-gray-300 dark:text-gray-600 text-sm sm:text-xl italic font-serif">
                VS
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-3 group/team">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 xl:w-20 xl:h-20 flex items-center justify-center p-3 bg-white dark:bg-gray-700/30 rounded-2xl shadow-sm group-hover/team:shadow-md group-hover/team:scale-105 transition-all duration-300">
                <TeamLogo team={game.homeTeam} size="full" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
            </div>
            <span className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm xl:text-base tracking-tight truncate w-full text-center">
              {(game.homeTeamFull ?? '').split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Footer info (Pitchers or Ticket btn) */}
        <div className="min-h-[2.5rem] flex items-center justify-center">
          {(!game.gameStatus || game.gameStatus === 'SCHEDULED') ? (
            <Button
              variant="outline"
              className="w-full bg-transparent border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors text-xs font-bold py-2 h-9 rounded-xl"
            >
              예매하기
            </Button>
          ) : game.gameInfo ? (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 line-clamp-1 px-4 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-full">
              {game.gameInfo}
            </p>
          ) : null}
        </div>

      </div>
    </Card>
  );
}