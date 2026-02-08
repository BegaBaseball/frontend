import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import { motion } from 'framer-motion';

// Mock types for development - should share with Home.tsx later
interface GameData {
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    time: string;
    stadium: string;
    homeScore?: number;
    awayScore?: number;
    gameStatus?: string; // PLAYING, SCHEDULED, ALLOWED
}

interface MainMatchCardProps {
    game?: GameData;
    isLoading?: boolean;
}

export default function MainMatchCard({ game, isLoading }: MainMatchCardProps) {
    if (isLoading || !game) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse">
                <span className="text-gray-400">Loading Match...</span>
            </div>
        );
    }

    const isLive = game.gameStatus === 'PLAYING';

    return (
        <div className="relative w-full h-full min-h-[300px] overflow-hidden rounded-xl group">
            {/* Background Image/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0">
                {/* Could add a dynamic stadium background image here */}
                <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')] bg-center" />
            </div>

            {/* Content Layer */}
            <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between text-white">

                {/* Top Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="outline" className="border-white/20 bg-white/10 text-white backdrop-blur-sm mb-2">
                            {game.stadium} • {game.time}
                        </Badge>
                        {isLive && (
                            <span className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                LIVE
                            </span>
                        )}
                    </div>
                </div>

                {/* Center: Scoreboard */}
                <div className="flex items-center justify-center gap-8 md:gap-12">
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-4">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full p-4 backdrop-blur-sm shadow-2xl border border-white/5"
                        >
                            <TeamLogo team={game.awayTeam} size={80} className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="text-center">
                            <h3 className="text-lg md:text-2xl font-bold tracking-tight">{game.awayTeamFull}</h3>
                            <p className="text-white/60 text-sm">Away</p>
                        </div>
                    </div>

                    {/* Score / VS */}
                    <div className="flex flex-col items-center">
                        {isLive || game.homeScore !== undefined ? (
                            <div className="text-5xl md:text-7xl font-black tabular-nums tracking-tighter flex items-center gap-4">
                                <span className={game.awayScore! > game.homeScore! ? "text-white" : "text-white/50"}>{game.awayScore}</span>
                                <span className="text-white/20 text-4xl">:</span>
                                <span className={game.homeScore! > game.awayScore! ? "text-white" : "text-white/50"}>{game.homeScore}</span>
                            </div>
                        ) : (
                            <span className="text-4xl md:text-6xl font-black text-white/20 italic">VS</span>
                        )}
                    </div>

                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-4">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full p-4 backdrop-blur-sm shadow-2xl border border-white/5"
                        >
                            <TeamLogo team={game.homeTeam} size={80} className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="text-center">
                            <h3 className="text-lg md:text-2xl font-bold tracking-tight">{game.homeTeamFull}</h3>
                            <p className="text-white/60 text-sm">Home</p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-center mt-4">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-8 py-6 rounded-full text-lg font-bold shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:-translate-y-1">
                        {isLive ? "중계 보기" : "배틀 라인업 확인"}
                    </Button>
                </div>

            </div>
        </div>
    );
}
