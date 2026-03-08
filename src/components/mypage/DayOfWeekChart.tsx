import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DayStats } from '../../types/diary';

interface DayOfWeekChartProps {
    dayOfWeekStats: Record<string, DayStats>;
}

const DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

export default function DayOfWeekChart({ dayOfWeekStats }: DayOfWeekChartProps) {
    const data = DAY_ORDER
        .filter((day) => dayOfWeekStats[day])
        .map((day) => ({
            day,
            winRate: Math.round(dayOfWeekStats[day].winRate),
            count: dayOfWeekStats[day].count,
        }));

    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-primary">요일별 승률</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    데이터가 충분하지 않습니다.
                </CardContent>
            </Card>
        );
    }

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
        if (active && payload && payload.length) {
            const entry = dayOfWeekStats[label ?? ''];
            return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
                    <p className="font-bold text-primary">{label}요일</p>
                    <p className="text-muted-foreground">승률: <span className="font-semibold">{payload[0].value}%</span></p>
                    {entry && (
                        <p className="text-muted-foreground text-xs">{entry.count}경기 · {entry.wins}승</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">요일별 승률</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v}요일`}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(45, 95, 79, 0.1)' }} />
                            <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 2" />
                            <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={24}>
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.day}
                                        fill={entry.winRate >= 50 ? '#2d5f4f' : '#9ca3af'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
