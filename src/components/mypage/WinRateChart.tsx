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
    const conicStops = data.reduce<string[]>((acc, item, index) => {
        const previousDegrees = data
            .slice(0, index)
            .reduce((sum, current) => sum + ((current.value / total) * 360), 0);
        const currentDegrees = previousDegrees + ((item.value / total) * 360);
        acc.push(`${item.color} ${previousDegrees}deg ${currentDegrees}deg`);
        return acc;
    }, []);

    if (total === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-primary">승률 분석</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    아직 기록된 경기가 없습니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">승리요정 분석</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-[250px] flex-col items-center justify-center gap-6">
                    <div
                        className="relative flex h-40 w-40 items-center justify-center rounded-full shadow-sm"
                        style={{ background: `conic-gradient(${conicStops.join(', ')})` }}
                    >
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-card shadow-inner">
                            <div className="text-3xl font-black text-primary">{winRate.toFixed(0)}%</div>
                            <div className="text-xs font-semibold text-muted-foreground">승률</div>
                        </div>
                    </div>

                    <div className="grid w-full gap-2">
                        {data.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm font-medium text-foreground">{entry.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {entry.value}경기
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
