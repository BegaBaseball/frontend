import React from 'react';
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
    { id: 'ticket', name: '첫 직관', icon: MyPageTicketIcon, description: '첫 다이어리 작성', color: '#4f8cff' },
    { id: 'flame', name: '불꽃 응원단', icon: MyPageFlameIcon, description: '10경기 이상 직관', color: '#f97373' },
    { id: 'map-pin', name: '구장 마스터', icon: MyPageMapPinIcon, description: '3개 이상 구장 방문', color: '#63b39b' },
    { id: 'sparkles', name: '승리요정', icon: MyPageSparklesIcon, description: '승률 60% 이상 (10경기+)', color: '#e8b64c' },
    { id: 'crown', name: '레전드', icon: MyPageCrownIcon, description: '50경기 이상 직관', color: '#b78cff' },
];

export default function BadgeShowcase({ earnedBadges = [] }: BadgeShowcaseProps) {
    return (
        <div className="mypage-season-panel" data-testid="mypage-badge-showcase">
            <div className="mypage-season-panel-title">업적 배지 ({earnedBadges.length}/{BADGES.length})</div>
            <div className="mypage-season-badge-grid">
                {BADGES.map((badge) => {
                    const isEarned = earnedBadges.includes(badge.id);
                    const statusLabel = isEarned ? '획득 완료' : '미획득';
                    const Icon = badge.icon;

                    return (
                        <div key={badge.id} className="mypage-season-badge" data-earned={isEarned}>
                            <div
                                title={`${badge.name} - ${badge.description} (${statusLabel})`}
                                className={`mypage-season-badge-orb ${isEarned ? '' : 'opacity-60'}`}
                                data-testid="mypage-badge-orb"
                                style={isEarned ? { backgroundColor: badge.color } : undefined}
                            >
                                <Icon className="h-7 w-7" strokeWidth={1.5} />
                                {!isEarned && (
                                    <span className="mypage-season-badge-lock">
                                        <MyPageLockIcon className="lucide-lock h-4 w-4" />
                                    </span>
                                )}
                            </div>
                            <div className="mypage-season-badge-name">{badge.name}</div>
                            <div className="mypage-season-badge-desc">{badge.description}</div>
                            <span className={`mypage-season-badge-state ${isEarned ? 'is-earned' : ''}`}>
                                {statusLabel}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
