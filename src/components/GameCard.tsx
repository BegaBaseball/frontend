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
      className={`overflow-hidden ${featured ? 'border-2 hover:shadow-lg' : 'border'} transition-shadow`} 
      style={{ borderColor: featured ? '#2d5f4f' : '#e5e7eb' }}
    >
      <div className="p-6">
        {/* Game Info Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={featured ? '' : 'bg-gray-100 text-gray-700 border-gray-300'}
              style={featured ? { backgroundColor: '#2d5f4f', color: 'white', borderColor: '#2d5f4f' } : {}}
            >
              {game.stadium.replace('구장', '')}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">⚾ {game.time}</span>
              {/* 상태 뱃지 추가 */}
              {statusStyle && (
                <span 
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
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
        </div>

        {game.gameInfo && (
          <div 
            className="mb-4 text-center text-sm"
            style={featured ? { color: '#2d5f4f', fontWeight: 600 } : { color: '#6b7280' }}
          >
            {game.gameInfo}
          </div>
        )}

        {/* Teams */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <div className="mx-auto mb-2 flex items-center justify-center">
              <TeamLogo team={game.homeTeam} size={56} />
            </div>
            <p className="text-sm" style={{ color: '#2d5f4f', fontWeight: 600 }}>
              {game.homeTeamFull.split(' ')[0]}
            </p>
            {/* 경기 종료 시 점수 표시 */}
            {game.gameStatus === 'COMPLETED' && game.homeScore !== undefined && (
              <p className="text-2xl font-bold mt-1" style={{ color: '#2d5f4f' }}>
                {game.homeScore}
              </p>
            )}
          </div>

          <div 
            className="text-xl mx-4" 
            style={{ fontWeight: 900, color: featured ? '#2d5f4f' : '#9ca3af' }}
          >
            VS
          </div>

          <div className="text-center flex-1">
            <div className="mx-auto mb-2 flex items-center justify-center">
              <TeamLogo team={game.awayTeam} size={56} />
            </div>
            <p className="text-sm" style={{ color: '#2d5f4f', fontWeight: 600 }}>
              {game.awayTeamFull.split(' ')[0]}
            </p>
            {/* 경기 종료 시 점수 표시 */}
            {game.gameStatus === 'COMPLETED' && game.awayScore !== undefined && (
              <p className="text-2xl font-bold mt-1" style={{ color: '#2d5f4f' }}>
                {game.awayScore}
              </p>
            )}
          </div>
        </div>

        {/* Action Button - 경기 예정일 때만 표시 */}
        {(!game.gameStatus || game.gameStatus === 'SCHEDULED') && (
          <Button 
            className="text-white hover:opacity-90 w-full"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            TICKET
          </Button>
        )}
      </div>
    </Card>
  );
}