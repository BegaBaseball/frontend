// Shared inline style tokens for coach analysis detail components.

export const RISK_SEV = {
    high: '#dc2626', // level 0
    mid: '#d97706',  // level 1
    low: '#059669',  // level 2
} as const;

export const IMPACT = {
    home: '#b91c1c',
    away: '#047857',
    bothText: '#64748b',
    bothPill: '#854d0e',
} as const;

export interface CoachTokens {
    cardBg: string;
    cardBorder: string;
    rowBorder: string;
    iconChipBg: string;
    textColor: string;
    axisColor: string;
    tickColor: string;
    tickLabel: string;
    subColor: string;
    headerColor: string;
    headerBg: string;
    headerBorder: string;
    headerText: string;
    subColorStrong: string;
    pillBgHome: string;
    pillBgAway: string;
    pillBgBoth: string;
    accentHome: string;
    accentAway: string;
    accentBoth: string;
    paperBg: string;
    paperBorder: string;
    ruleColor: string;
    paperAccent: string;
    paperText: string;
    dashedBorder: string;
    tapeBg: string;
    paperShadow: string;
}

const LIGHT: CoachTokens = {
    cardBg: '#fff',
    cardBorder: '#e5e7eb',
    rowBorder: '#f1f5f9',
    iconChipBg: '#f1f5f9',
    textColor: '#0f1419',
    axisColor: '#e5e7eb',
    tickColor: '#cbd5e1',
    tickLabel: '#94a3b8',
    subColor: '#64748b',
    headerColor: '#475569',
    headerBg: '#fafafa',
    headerBorder: '#eef2f0',
    headerText: '#64748b',
    subColorStrong: '#475569',
    pillBgHome: '#fef2f2',
    pillBgAway: '#ecfdf5',
    pillBgBoth: '#fffbeb',
    accentHome: '#fecaca',
    accentAway: '#a7f3d0',
    accentBoth: '#fde68a',
    paperBg: '#fffdf5',
    paperBorder: '#e9e2c8',
    ruleColor: '#f0e8c8',
    paperAccent: '#7c5f1a',
    paperText: '#1f1812',
    dashedBorder: '#d6c884',
    tapeBg: 'rgba(180,150,80,0.18)',
    paperShadow: '0 1px 0 #e9e2c8, 0 8px 24px -16px rgba(120,95,30,0.25)',
};

const DARK: CoachTokens = {
    cardBg: '#1c1f28',
    cardBorder: '#2d3748',
    rowBorder: '#1f2937',
    iconChipBg: 'rgba(255,255,255,0.06)',
    textColor: '#e5e7eb',
    axisColor: '#374151',
    tickColor: '#4b5563',
    tickLabel: '#6b7280',
    subColor: '#6b7280',
    headerColor: '#9ca3af',
    headerBg: '#111827',
    headerBorder: '#1f2937',
    headerText: '#6b7280',
    subColorStrong: '#6b7280',
    pillBgHome: 'rgba(220,38,38,0.15)',
    pillBgAway: 'rgba(5,150,105,0.15)',
    pillBgBoth: 'rgba(133,77,14,0.15)',
    accentHome: 'rgba(254,202,202,0.3)',
    accentAway: 'rgba(167,243,208,0.3)',
    accentBoth: 'rgba(253,230,138,0.2)',
    paperBg: '#1a1810',
    paperBorder: '#3a3420',
    ruleColor: '#2a2416',
    paperAccent: '#c4a055',
    paperText: '#ede8d8',
    dashedBorder: '#4a3c1a',
    tapeBg: 'rgba(180,150,80,0.10)',
    paperShadow: '0 1px 0 #3a3420, 0 8px 24px -16px rgba(0,0,0,0.5)',
};

export function getCoachTokens(isDark: boolean): CoachTokens {
    return isDark ? DARK : LIGHT;
}
