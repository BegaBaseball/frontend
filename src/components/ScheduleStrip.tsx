import { Card } from './ui/card';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import TeamLogo from './TeamLogo';

interface Game {
    gameId: string;
    gameStatus: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    time: string;
}

interface ScheduleStripProps {
    games: Game[];
}

export default function ScheduleStrip({ games }: ScheduleStripProps) {
    if (games.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    Today's Lineup
                </h2>
                <span className="text-xs text-gray-500">{games.length} Games</span>
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-xl">
                <div className="flex w-max space-x-4 pb-4">
                    {games.map((game) => (
                        <Card
                            key={game.gameId}
                            className="w-[160px] sm:w-[200px] shrink-0 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded 
                                    ${game.gameStatus === 'PLAYING'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {game.gameStatus === 'PLAYING' ? 'LIVE' : game.time}
                                </span>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <TeamLogo team={game.awayTeam} size={32} />
                                    <span className="text-xs font-bold">{game.awayTeam}</span>
                                </div>
                                <div className="text-sm font-bold text-gray-400">vs</div>
                                <div className="flex flex-col items-center gap-1">
                                    <TeamLogo team={game.homeTeam} size={32} />
                                    <span className="text-xs font-bold">{game.homeTeam}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
