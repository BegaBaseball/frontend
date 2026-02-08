import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Ticket, Flame, MapPin, Sparkles, Crown, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
    { id: 'ticket', name: '첫 직관', icon: Ticket, description: '첫 다이어리 작성', color: 'bg-blue-500' },
    { id: 'flame', name: '불꽃 응원단', icon: Flame, description: '10경기 이상 직관', color: 'bg-red-500' },
    { id: 'map-pin', name: '구장 마스터', icon: MapPin, description: '3개 이상 구장 방문', color: 'bg-green-500' },
    { id: 'sparkles', name: '승리요정', icon: Sparkles, description: '승률 60% 이상 (10경기+)', color: 'bg-yellow-500' },
    { id: 'crown', name: '레전드', icon: Crown, description: '50경기 이상 직관', color: 'bg-purple-500' },
];

export default function BadgeShowcase({ earnedBadges = [] }: BadgeShowcaseProps) {
    return (
        <Card className="h-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-none shadow-md">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-[#2d5f4f] dark:text-emerald-400 flex items-center gap-2">
                    업적 배지 ({earnedBadges.length}/{BADGES.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <TooltipProvider>
                        {BADGES.map((badge) => {
                            const isEarned = earnedBadges.includes(badge.id);
                            return (
                                <Tooltip key={badge.id}>
                                    <TooltipTrigger>
                                        <div
                                            className={`
                        relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                        ${isEarned
                                                    ? `${badge.color} text-white shadow-lg scale-100 hover:scale-110`
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 grayscale opacity-60'}
                      `}
                                        >
                                            <badge.icon className="w-8 h-8" strokeWidth={1.5} />
                                            {!isEarned && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                                                    <Lock className="w-4 h-4 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-center">
                                            <p className="font-bold">{badge.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
                                            {!isEarned && <p className="text-xs text-red-400 mt-1">미획득</p>}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}
