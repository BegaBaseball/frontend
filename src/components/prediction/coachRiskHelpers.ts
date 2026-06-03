import { createElement, type ReactNode, useEffect, useState } from 'react';
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

export function riskImpactTo(
    level: 0 | 1 | 2,
    isPositive: boolean,
): 'home' | 'away' | 'both' {
    if (level === 1) return 'both';
    return level === 0 ? (isPositive ? 'away' : 'home') : 'both';
}

export function shortTeamName(teamId?: string): string {
    if (!teamId) return '';
    const full = getFullTeamName(teamId);
    if (full === teamId) {
        return teamId.toUpperCase();
    }
    return full.split(/\s+/)[0];
}
