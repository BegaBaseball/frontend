import { createElement, type ReactNode, useEffect, useState } from 'react';
import type { CoachRiskImpactTo, CoachRiskItem } from '../../api/coach';
import { getFullTeamName } from '../../constants/teams';
import { RISK_SEV } from './coachStyleTokens';

export function useIsDark(): boolean {
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof document === 'undefined') return false;
        return document.documentElement.classList.contains('dark');
    });
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains('dark'))
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return isDark;
}

export function parseHighlight(text: string): ReactNode[] {
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
        i % 2 === 1
            ? createElement(
                'strong',
                { key: i, style: { fontWeight: 800, background: 'linear-gradient(180deg, transparent 60%, #fde68a 60%)' } },
                part,
            )
            : part,
    );
}

export function riskInning(level: 0 | 1 | 2): string {
    return level === 0 ? '1~5회' : level === 1 ? '5~7회' : '7~9회';
}

export function riskSevColor(level: 0 | 1 | 2): string {
    return level === 0 ? RISK_SEV.high : level === 1 ? RISK_SEV.mid : RISK_SEV.low;
}

const RISK_AREA_LABELS: Record<string, string> = {
    overall: '종합 리스크',
    lineup: '라인업 변수',
    offense: '득점 연결',
    batting: '득점 연결',
    bullpen: '불펜 운영',
    pitching: '마운드 운영',
    starter: '선발 매치업',
    form: '최근 흐름',
    weather: '환경 변수',
    defense: '수비 집중',
};

export function resolveRiskAreaLabel(area?: string | null): string {
    const normalized = String(area || '').trim();
    if (!normalized) return '리스크';
    return RISK_AREA_LABELS[normalized.toLowerCase()] || normalized;
}

export function riskImpactTo(
    level: 0 | 1 | 2,
    isPositive: boolean,
): CoachRiskImpactTo {
    if (level === 1) return 'both';
    return level === 0 ? (isPositive ? 'away' : 'home') : 'both';
}

export function resolveRiskInningLabel(risk: CoachRiskItem): string {
    if (risk.inning_label) return risk.inning_label;
    if (typeof risk.inning_start === 'number' && typeof risk.inning_end === 'number') {
        return risk.inning_start === risk.inning_end
            ? `${risk.inning_start}회`
            : `${risk.inning_start}~${risk.inning_end}회`;
    }
    if (typeof risk.inning_start === 'number') return `${risk.inning_start}회`;
    return riskInning(risk.level);
}

export function resolveRiskInningPosition(risk: CoachRiskItem, fallbackX: number): number {
    if (typeof risk.inning_start === 'number' && typeof risk.inning_end === 'number') {
        return Math.max(1, Math.min(9, (risk.inning_start + risk.inning_end) / 2));
    }
    if (typeof risk.inning_start === 'number') {
        return Math.max(1, Math.min(9, risk.inning_start));
    }
    return fallbackX;
}

export function resolveRiskImpactTo(
    risk: CoachRiskItem,
    isPositive: boolean,
): CoachRiskImpactTo {
    return risk.impact_to || riskImpactTo(risk.level, isPositive);
}

export function resolveRiskImpactText(
    risk: CoachRiskItem,
    isPositive: boolean,
): string {
    const impactTo = resolveRiskImpactTo(risk, isPositive);
    return risk.impact || (impactTo === 'home' ? '−높음' : impactTo === 'away' ? '−낮음' : '±중간');
}

export function shortTeamName(teamId?: string): string {
    if (!teamId) return '';
    const full = getFullTeamName(teamId);
    if (full === teamId) {
        return teamId.toUpperCase();
    }
    return full.split(/\s+/)[0];
}
