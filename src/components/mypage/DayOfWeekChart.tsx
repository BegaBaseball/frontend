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
            wins: dayOfWeekStats[day].wins,
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

    const tickValues = [100, 75, 50, 25, 0];

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">요일별 승률</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid h-[250px] grid-cols-[36px_minmax(0,1fr)] gap-3">
                    <div className="flex h-[210px] flex-col justify-between pt-2 text-[16px] font-semibold text-muted-foreground">
                        {tickValues.map((tick) => (
                            <span key={tick}>{tick}%</span>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute inset-x-0 bottom-12 top-2 flex flex-col justify-between">
                            {tickValues.map((tick) => (
                                <div
                                    key={tick}
                                    className={tick === 50
                                        ? 'border-t border-dashed border-primary/40'
                                        : 'border-t border-dashed border-slate-200 dark:border-border'}
                                />
                            ))}
                        </div>

                        <div className="relative flex h-full items-end gap-3">
                            {data.map((entry) => {
                                const barHeight = Math.max((entry.winRate / 100) * 150, 12);
                                const barColor = entry.winRate >= 50 ? '#2d5f4f' : '#9ca3af';

                                return (
                                    <div key={entry.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                        <span className="text-[16px] font-semibold text-slate-500 dark:text-slate-300">
                                            {entry.winRate}%
                                        </span>
                                        <div className="flex h-[150px] w-full items-end justify-center">
                                            <div
                                                className="w-full max-w-[34px] rounded-t-lg shadow-sm transition-all duration-300"
                                                style={{ height: `${barHeight}px`, backgroundColor: barColor }}
                                                title={`${entry.day}요일 ${entry.winRate}% · ${entry.wins}승 / ${entry.count}경기`}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[16px] font-semibold text-foreground">{entry.day}</p>
                                            <p className="text-[16px] text-muted-foreground">{entry.count}경기</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
