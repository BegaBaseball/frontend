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
    status: string;
    gameInfo: string;
  };
  featured?: boolean;
}

export default function GameCard({ game, featured = false }: GameCardProps) {
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
            <span className="text-gray-600 text-sm">⚾ {game.time}</span>
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

        {/* Status Badge */}
        {game.status && (
          <div className="flex justify-center mb-4">
            <Badge 
              className="text-white px-4 py-1" 
              style={{ backgroundColor: featured ? '#2d5f4f' : '#3b82f6' }}
            >
              {game.status}
            </Badge>
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
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="text-white hover:opacity-90 w-full"
          style={{ backgroundColor: '#2d5f4f' }}
        >
          TICKET
        </Button>
      </div>
    </Card>
  );
}
