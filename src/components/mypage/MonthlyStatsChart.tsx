import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function MonthlyStatsChart({ data }: { data: { month: string; count: number }[] }) {
    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-primary">월별 직관 추이</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    데이터가 충분하지 않습니다.
                </CardContent>
            </Card>
        );
    }

    const maxCount = Math.max(...data.map((entry) => entry.count), 1);
    const tickValues = Array.from(new Set([
        maxCount,
        Math.round(maxCount * 0.66),
        Math.round(maxCount * 0.33),
        0,
    ])).sort((a, b) => b - a);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">월별 직관 추이</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid h-[250px] grid-cols-[36px_minmax(0,1fr)] gap-3">
                    <div className="flex h-[210px] flex-col justify-between pt-2 text-[16px] font-semibold text-muted-foreground">
                        {tickValues.map((tick) => (
                            <span key={tick}>{tick}</span>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute inset-x-0 bottom-10 top-2 flex flex-col justify-between">
                            {tickValues.map((tick) => (
                                <div key={tick} className="border-t border-dashed border-slate-200 dark:border-border" />
                            ))}
                        </div>

                        <div className="relative flex h-full items-end gap-3">
                            {data.map((entry, index) => {
                                const ratio = entry.count / maxCount;
                                const barHeight = Math.max(ratio * 150, 14);
                                const barColor = index % 2 === 0 ? '#2d5f4f' : '#4d8f7b';

                                return (
                                    <div key={entry.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                        <span className="text-[16px] font-semibold text-slate-500 dark:text-white">
                                            {entry.count}
                                        </span>
                                        <div className="flex h-[150px] w-full items-end justify-center">
                                            <div
                                                className="w-full max-w-[34px] rounded-t-lg shadow-sm transition-all duration-300"
                                                style={{ height: `${barHeight}px`, backgroundColor: barColor }}
                                                title={`${entry.month} ${entry.count}회`}
                                            />
                                        </div>
                                        <span className="text-[16px] font-semibold text-muted-foreground">{entry.month}</span>
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
