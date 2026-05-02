import React, { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
    MyPageCrownIcon,
    MyPageFlameIcon,
    MyPageLockIcon,
    MyPageMapPinIcon,
    MyPageSparklesIcon,
    MyPageTicketIcon,
} from './MyPageIcons';

interface BadgeShowcaseProps {
    earnedBadges: string[];
}

interface BadgeInfo {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    color: string;
}

const BADGES: BadgeInfo[] = [
    { id: 'ticket', name: '첫 직관', icon: MyPageTicketIcon, description: '첫 다이어리 작성', color: 'bg-blue-500' },
    { id: 'flame', name: '불꽃 응원단', icon: MyPageFlameIcon, description: '10경기 이상 직관', color: 'bg-red-500' },
    { id: 'map-pin', name: '구장 마스터', icon: MyPageMapPinIcon, description: '3개 이상 구장 방문', color: 'bg-green-500' },
    { id: 'sparkles', name: '승리요정', icon: MyPageSparklesIcon, description: '승률 60% 이상 (10경기+)', color: 'bg-yellow-500' },
    { id: 'crown', name: '레전드', icon: MyPageCrownIcon, description: '50경기 이상 직관', color: 'bg-purple-500' },
];

function BadgeShell({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-[16px] font-semibold">
            {children}
        </span>
    );
}

export default function BadgeShowcase({ earnedBadges = [] }: BadgeShowcaseProps) {
    return (
        <Card className="h-full bg-gradient-to-br from-card to-muted/40 border-none shadow-md">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                    업적 배지 ({earnedBadges.length}/{BADGES.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    {BADGES.map((badge) => {
                        const isEarned = earnedBadges.includes(badge.id);
                        const statusLabel = isEarned ? '획득 완료' : '미획득';

                        return (
                            <div key={badge.id} className="flex flex-col items-center gap-2 text-center">
                                <div
                                    title={`${badge.name} - ${badge.description} (${statusLabel})`}
                                    className={`
                        relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                        ${isEarned
                                            ? `${badge.color} text-white shadow-lg scale-100 hover:scale-110`
                                            : 'bg-muted text-muted-foreground grayscale opacity-60'}
                      `}
                                >
                                    <badge.icon className="w-8 h-8" strokeWidth={1.5} />
                                    {!isEarned && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                                            <MyPageLockIcon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[16px] font-bold text-foreground">{badge.name}</p>
                                    <p className="max-w-[96px] text-[16px] leading-4 text-muted-foreground">
                                        {badge.description}
                                    </p>
                                    <BadgeShell>
                                        <span className={isEarned ? 'text-emerald-500' : 'text-red-400'}>
                                            {statusLabel}
                                        </span>
                                    </BadgeShell>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
