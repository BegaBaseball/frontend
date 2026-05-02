import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DiaryEntry } from '../../types/diary';
import { MyPageMapPinIcon } from './MyPageIcons';

interface StadiumVisitListProps {
    entries: DiaryEntry[];
}

export default function StadiumVisitList({ entries }: StadiumVisitListProps) {
    const stadiumStats = useMemo(() => {
        const counts: { [key: string]: number } = {};
        entries.forEach(entry => {
            const stadium = entry.stadium || '알 수 없음';
            counts[stadium] = (counts[stadium] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count }));

        return sorted;
    }, [entries]);

    const maxCount = stadiumStats.length > 0 ? stadiumStats[0].count : 0;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                    <MyPageMapPinIcon className="w-5 h-5" />
                    구장 도장 깨기
                </CardTitle>
            </CardHeader>
            <CardContent>
                {stadiumStats.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        아직 방문한 구장이 없습니다.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                        {stadiumStats.map((item, index) => (
                            <div key={item.name} className="space-y-1">
                                <div className="flex justify-between text-[16px]">
                                    <span className="font-semibold text-foreground flex items-center gap-2">
                                        <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[16px] font-bold ${index < 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                            {index + 1}
                                        </span>
                                        {item.name}
                                    </span>
                                    <span className="font-semibold text-primary">{item.count}회</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 rounded-full"
                                        style={{ width: `${(item.count / maxCount) * 100}%`, opacity: Math.max(0.3, 1 - (index * 0.15)) }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
