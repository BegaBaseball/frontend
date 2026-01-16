import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { EmojiStat } from '../../types/diary';

interface MonthlyStatsChartProps {
    monthlyData: { month: string; count: number }[]; // Need to derive this from raw data if not provided directly
}

// Since the backend only gives `monthlyCount` (total count for *this* month?) and `happiestMonth`,
// but NOT a breakdown of *all* months, we might need to calculate this frontend-side from `diaryEntries`?
// Let's check `useDiaryStatistics`. `emojiStats` is derived. We can derive monthly stats there or pass entries here.
// For now, I'll assume we pass `diaryEntries` to calculate it, or updated hook later.
// Let's define the prop to accept a derived array for flexibility.

export default function MonthlyStatsChart({ data }: { data: { month: string; count: number }[] }) {
    // Filling empty months for a full year view usually looks better, but let's stick to active data for now.

    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#2d5f4f]">월별 직관 추이</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-gray-400">
                    데이터가 충분하지 않습니다.
                </CardContent>
            </Card>
        );
    }

    // Find max for Y-axis domain padding
    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-[#2d5f4f]">월별 직관 추이</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                                domain={[0, maxCount + 2]}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(45, 95, 79, 0.1)' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2d5f4f' : '#4d8f7b'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
