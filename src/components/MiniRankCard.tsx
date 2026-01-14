import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';

interface Ranking {
    rank: number;
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
    games: number;
    shortName: string;
}

interface MiniRankCardProps {
    rankings: Ranking[];
    myTeamId?: string;
}

export default function MiniRankCard({ rankings, myTeamId }: MiniRankCardProps) {
    const navigate = useNavigate();
    const top5 = rankings.slice(0, 5);

    // If my team is not in top 5, maybe show them at bottom? (Not implemented for MVP)

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-emerald-500">#</span> Leaderboard
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-400 hover:text-white"
                    onClick={() => navigate('/rankings')}
                >
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
                {top5.map((team) => (
                    <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-200
                            ${team.teamId === myTeamId
                                ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-5 text-center font-bold ${team.rank <= 3 ? 'text-amber-400' : 'text-gray-400'}`}>
                                {team.rank}
                            </span>
                            <div className="w-8 h-8 p-1 bg-white/5 rounded-full">
                                <TeamLogo team={team.shortName || team.teamName} teamId={team.teamId} size={24} className="w-full h-full object-contain" />
                            </div>
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                                {team.teamName}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                                {team.winRate}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
