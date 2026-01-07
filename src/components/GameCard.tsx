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
          bg: '#e3f2fd',
          color: '#1976d2',
          text: '경기 예정'
        };
      case 'COMPLETED':
        return {
          bg: '#e8f5e9',
          color: '#388e3c',
          text: '경기 종료'
        };
      case 'CANCELLED':
        return {
          bg: '#ffebee',
          color: '#d32f2f',
          text: '경기 취소'
        };
      case 'POSTPONED':
        return {
          bg: '#fff3e0',
          color: '#f57c00',
          text: '경기 연기'
        };
      case 'DRAW':
        return {
          bg: '#f3e5f5',
          color: '#7b1fa2',
          text: '무승부'
        };
      default:
        return null;
    }
  };

  const statusStyle = getStatusBadgeStyle(game.gameStatus || game.status);

  return (
    <Card
      className={`overflow-hidden ${featured ? 'border-2 hover:shadow-lg' : 'border'} transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
      style={{ borderColor: featured ? '#2d5f4f' : undefined }}
    >
      <div className="p-4 sm:p-6">
        {/* Game Info Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
          <Badge
            variant="outline"
            className="text-xs sm:text-sm w-fit"
            style={{ backgroundColor: '#2d5f4f', color: 'white', borderColor: '#2d5f4f' }}
          >
            {game.stadium.replace('구장', '')}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">⚾ {game.time}</span>
            {/* 상태 뱃지 추가 */}
            {statusStyle && (
              <span
                className="px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color
                }}
              >
                {statusStyle.text}
              </span>
            )}
          </div>
        </div>

        {game.gameInfo && (
          <div
            className={`mb-3 sm:mb-4 text-center text-xs sm:text-sm ${featured ? '' : 'text-gray-500 dark:text-gray-400'}`}
            style={featured ? { color: '#2d5f4f', fontWeight: 600 } : { fontWeight: 400 }}
          >
            {game.gameInfo}
          </div>
        )}

        {/* Teams */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="text-center flex-1">
            <div className="mx-auto mb-1.5 sm:mb-2 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-gray-100 p-2 rounded-full shadow-sm inline-flex items-center justify-center">
                <TeamLogo team={game.homeTeam} size={48} className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: '#2d5f4f', fontWeight: 600 }}>
              {game.homeTeamFull.split(' ')[0]}
            </p>
          </div>

          {/* VS 또는 점수 표시 영역 */}
          <div className="text-center mx-2 sm:mx-4">
            {(game.gameStatus === 'PLAYING' || game.gameStatus === 'COMPLETED') &&
             (game.homeScore !== undefined || game.awayScore !== undefined) ? (
              // 점수 표시
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <span
                  className={`text-2xl sm:text-3xl md:text-4xl font-black transition-colors ${
                    (game.homeScore ?? 0) > (game.awayScore ?? 0)
                      ? 'text-primary dark:text-[#4ade80]'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {game.homeScore ?? '-'}
                </span>
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-400 dark:text-gray-600">:</span>
                <span
                  className={`text-2xl sm:text-3xl md:text-4xl font-black transition-colors ${
                    (game.awayScore ?? 0) > (game.homeScore ?? 0)
                      ? 'text-primary dark:text-[#4ade80]'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {game.awayScore ?? '-'}
                </span>
              </div>
            ) : (
              // VS 표시
              <div
                className={`text-base sm:text-lg md:text-xl ${featured ? '' : 'text-gray-400 dark:text-gray-500'}`}
                style={{ fontWeight: 900, color: featured ? '#2d5f4f' : undefined }}
              >
                VS
              </div>
            )}
          </div>

          <div className="text-center flex-1">
            <div className="mx-auto mb-1.5 sm:mb-2 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-gray-100 p-2 rounded-full shadow-sm inline-flex items-center justify-center">
                <TeamLogo team={game.awayTeam} size={48} className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: '#2d5f4f', fontWeight: 600 }}>
              {game.awayTeamFull.split(' ')[0]}
            </p>
          </div>
        </div>

        {/* Action Button - 경기 예정일 때만 표시 */}
        {(!game.gameStatus || game.gameStatus === 'SCHEDULED') && (
          <Button
            className="text-white hover:opacity-90 w-full text-sm sm:text-base"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            TICKET
          </Button>
        )}
      </div>
    </Card>
  );
}