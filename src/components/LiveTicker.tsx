import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CircleDot } from 'lucide-react';
import TeamLogo from './TeamLogo';

interface Game {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    gameStatus?: string;
    leagueType: string;
}

interface LiveTickerProps {
    games: Game[];
}

export default function LiveTicker({ games }: LiveTickerProps) {
    const liveGames = games.filter(g => g.gameStatus === 'PLAYING');

    if (liveGames.length === 0) return null;

    return (
        <div className="bg-black/90 text-white border-b border-white/10 overflow-hidden relative h-12 flex items-center">
            <div className="absolute left-0 top-0 bottom-0 bg-[#2d5f4f] px-3 flex items-center z-20 font-bold text-xs shadow-lg">
                <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                LIVE
            </div>

            <div className="flex animate-marquee whitespace-nowrap pl-20 items-center">
                {liveGames.map((game, idx) => (
                    <div key={game.gameId} className="flex items-center gap-4 px-6 border-r border-white/10 min-w-[200px]">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <span className="text-gray-400 w-10 text-right">{game.awayTeam}</span>
                            <span className={`text-lg ${game.awayScore && game.homeScore && game.awayScore > game.homeScore ? 'text-yellow-400' : 'text-white'}`}>
                                {game.awayScore || 0}
                            </span>
                        </div>
                        <span className="text-gray-600 text-xs">:</span>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <span className={`text-lg ${game.awayScore && game.homeScore && game.homeScore > game.awayScore ? 'text-yellow-400' : 'text-white'}`}>
                                {game.homeScore || 0}
                            </span>
                            <span className="text-gray-400 w-10">{game.homeTeam}</span>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
