import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
                    <CardTitle className="text-lg font-bold text-primary">상대팀별 승률</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    데이터가 부족합니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">상대팀별 직관 승률 (Top 8)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((entry) => {
                        const barColor = entry.winRate >= 50 ? 'var(--mp-win-bg)' : 'var(--mp-lose-bg)';

                        return (
                            <div key={entry.team} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="truncate text-body font-semibold text-foreground">{entry.team}</span>
                                    <span className="shrink-0 text-body font-bold" style={{ color: barColor }}>
                                        {entry.winRate}%
                                    </span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${entry.winRate}%`, backgroundColor: barColor }}
                                        title={`${entry.team} ${entry.winRate}% (${entry.wins}승 / ${entry.games}경기)`}
                                    />
                                </div>
                                <p className="text-body text-muted-foreground">
                                    {entry.wins}승 / {entry.games}경기
                                </p>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
