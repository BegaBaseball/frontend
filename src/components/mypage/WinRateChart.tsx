import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface WinRateChartProps {
    wins: number;
    draws: number;
    losses: number;
    winRate: number;
}

export default function WinRateChart({ wins, draws, losses, winRate }: WinRateChartProps) {
    const data = [
        { name: '승리', value: wins, color: '#2d5f4f' }, // Primary Green
        { name: '무승부', value: draws, color: '#94a3b8' }, // Slate 400
        { name: '패배', value: losses, color: '#ef4444' }, // Red 500
    ].filter(item => item.value > 0);

    const total = wins + draws + losses;

    if (total === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#2d5f4f]">승률 분석</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-gray-400">
                    아직 기록된 경기가 없습니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-[#2d5f4f]">승리요정 분석</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`${value}경기`, '']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center">
                        <div className="text-3xl font-black text-[#2d5f4f]">{winRate.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500 font-semibold">승률</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
