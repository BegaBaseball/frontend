import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { TEAM_DATA, getFullTeamName } from '../constants/teams';

interface CheerBattleBarProps {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
}

interface BattleStats {
    [teamCode: string]: number;
}

export default function CheerBattleBar({ gameId, homeTeam, awayTeam }: CheerBattleBarProps) {
    const { user, requireLogin } = useAuthStore();

    // Initialize with 0s for home/away
    const [stats, setStats] = useState<BattleStats>({
        [homeTeam]: 0,
        [awayTeam]: 0
    });

    const [client, setClient] = useState<Client | null>(null);
    const [totalVotes, setTotalVotes] = useState(0);
    const [myVote, setMyVote] = useState<string | null>(null); // Track user's voted team

    // Connect to WebSocket
    useEffect(() => {
        const newClient = new Client({
            brokerURL: 'ws://localhost:8080/ws/websocket',
            onConnect: () => {
                console.log('Connected to Cheer Battle WS for game:', gameId);
                newClient.subscribe(`/topic/battle/${gameId}`, (message) => {
                    const data = JSON.parse(message.body);
                    setStats(data);
                    const total = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
                    setTotalVotes(total);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            },
        });

        newClient.activate();
        setClient(newClient);

        return () => {
            newClient.deactivate();
        };
    }, [gameId]); // Re-connect if gameId changes

    const handleVote = (teamId: string) => {
        if (!requireLogin()) return;

        // Prevent voting again if already voted
        if (myVote) return;

        if (client && client.connected) {
            // Send teamId as plain body
            client.publish({
                destination: `/app/battle/vote/${gameId}`,
                body: teamId,
            });

            // Mark as voted
            setMyVote(teamId);

            // Optimistic update for immediate feedback
            setStats(prev => ({ ...prev, [teamId]: (prev[teamId] || 0) + 1 }));
            setTotalVotes(prev => prev + 1);
        } else {
            console.error('Client not connected');
        }
    };

    // Data for rendering
    const countHome = stats[homeTeam] || 0;
    const countAway = stats[awayTeam] || 0;
    const total = countHome + countAway;

    // If total is 0, show 50:50
    const percentAway = total === 0 ? 50 : (countAway / total) * 100;

    const colorHome = TEAM_DATA[homeTeam]?.color || '#888';
    const colorAway = TEAM_DATA[awayTeam]?.color || '#888';

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white text-sm">
                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                    <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">실시간 응원 배틀</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                    Total: {totalVotes.toLocaleString()}
                </span>
            </div>

            {/* Battle Gauge */}
            <div className="relative h-10 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex items-center mb-4 shadow-inner">
                {/* Away Team (Left) */}
                <motion.div
                    className="h-full absolute left-0 top-0 flex items-center pl-3 text-white font-bold text-shadow-sm z-10 overflow-hidden whitespace-nowrap"
                    style={{ backgroundColor: colorAway }}
                    initial={{ width: '50%' }}
                    animate={{ width: `${percentAway}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                >
                    <span className="text-xs mr-2">{TEAM_DATA[awayTeam]?.name}</span>
                    <span className="text-xs font-mono opacity-90">{total === 0 ? '-' : `${Math.round(percentAway)}%`}</span>
                </motion.div>

                {/* Home Team (Right Background) */}
                <div
                    className="absolute right-0 top-0 h-full w-full flex items-center justify-end pr-3 text-white font-bold z-0"
                    style={{ backgroundColor: colorHome }}
                >
                    <span className="text-xs font-mono opacity-90 mr-2">{total === 0 ? '-' : `${Math.round(100 - percentAway)}%`}</span>
                    <span className="text-xs">{TEAM_DATA[homeTeam]?.name}</span>
                </div>

                {/* VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-full p-0.5 z-20 shadow-sm">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-[8px] font-black">
                        VS
                    </div>
                </div>
            </div>

            {/* Duel Buttons */}
            <div className="flex gap-2">
                <Button
                    onClick={() => handleVote(awayTeam)}
                    disabled={!!myVote}
                    className={`flex-1 h-9 rounded-lg font-bold text-xs shadow-sm transition-all text-white ${myVote === awayTeam
                            ? 'ring-2 ring-offset-2 ring-yellow-400'
                            : myVote
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:brightness-110 active:scale-95'
                        }`}
                    style={{ backgroundColor: colorAway }}
                >
                    {myVote === awayTeam ? '✓ 응원 완료!' : `${TEAM_DATA[awayTeam]?.name} 응원!`}
                </Button>
                <Button
                    onClick={() => handleVote(homeTeam)}
                    disabled={!!myVote}
                    className={`flex-1 h-9 rounded-lg font-bold text-xs shadow-sm transition-all text-white ${myVote === homeTeam
                            ? 'ring-2 ring-offset-2 ring-yellow-400'
                            : myVote
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:brightness-110 active:scale-95'
                        }`}
                    style={{ backgroundColor: colorHome }}
                >
                    {myVote === homeTeam ? '✓ 응원 완료!' : `${TEAM_DATA[homeTeam]?.name} 응원!`}
                </Button>
            </div>

            {/* Vote Status Message */}
            {myVote && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {TEAM_DATA[myVote]?.name}에 응원을 보냈습니다! 🎉
                </p>
            )}
        </div>
    );
}
