import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { OpponentStats } from '../../types/diary';

interface OpponentWinRateChartProps {
    opponentStats: Record<string, OpponentStats>;
}

export default function OpponentWinRateChart({ opponentStats = {} }: OpponentWinRateChartProps) {
    // Convert Record to Array and sort by win rate (desc)
    const data = Object.entries(opponentStats)
        .map(([team, stats]) => ({
            team,
            winRate: parseFloat(stats.winRate.toFixed(1)),
            games: stats.wins + stats.losses + stats.draws,
            wins: stats.wins
        }))
        .filter(item => item.games > 0)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 8); // Top 8 only to avoid overcrowding

    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#2d5f4f]">상대팀별 승률</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-gray-400">
                    데이터가 부족합니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-[#2d5f4f]">상대팀별 직관 승률 (Top 8)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} unit="%" hide />
                            <YAxis dataKey="team" type="category" width={60} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <Tooltip
                                formatter={(value, name, props) => [`${value}% (${props.payload.wins}/${props.payload.games}승)`, '승률']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="winRate" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#2d5f4f' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
