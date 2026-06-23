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
    // ── C1 결과뷰(CoachAnalysisResultView) 표면 — 인라인 style 로 소비.
    //    LIGHT = 현재 라이트 hex, DARK = 현재 dark: Tailwind 클래스의 환산값(외형 동일 보장).
    c1RailBg: string;
    c1RailBorder: string;
    c1TextHeading: string;   // h4 (dark slate-50)
    c1TextStrong: string;    // hero 팀명/행 값 (dark slate-100)
    c1TextSub: string;       // 부제/행 라벨/VS (dark slate-400)
    c1SecChipRiskBg: string;
    c1SecChipRiskFg: string;
    c1SecChipDefBg: string;
    c1SecChipDefFg: string;
    c1HeroWinnerFrom: string;
    c1HeroWinnerTo: string;
    c1HeroLoserBg: string;
    c1HeroCardBg: string;
    c1HeroOuterBorder: string;
    c1HeroInnerDivider: string;
    c1HeroRowBorder: string;
    c1HeroVsBg: string;
    c1HeroVsBorder: string;
    c1TagWinBg: string;
    c1TagWinFg: string;
    c1TagLoseBg: string;
    c1TagLoseFg: string;
    c1InsCritBorder: string;
    c1InsCritBg: string;
    c1InsWarnBorder: string;
    c1InsWarnBg: string;
    c1InsPosBorder: string;
    c1InsPosBg: string;
    c1InsDefBorder: string;
    c1InsDefBg: string;
    c1InsDefIcon: string;
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
    c1RailBg: '#f7fafc',
    c1RailBorder: '#eef2f0',
    c1TextHeading: '#0f1419',
    c1TextStrong: '#0f1419',
    c1TextSub: '#536471',
    c1SecChipRiskBg: '#fef2f2',
    c1SecChipRiskFg: '#b91c1c',
    c1SecChipDefBg: '#f0f9f6',
    c1SecChipDefFg: '#1b4338',
    c1HeroWinnerFrom: '#ecfdf5',
    c1HeroWinnerTo: '#ffffff',
    c1HeroLoserBg: '#fafafa',
    c1HeroCardBg: '#ffffff',
    c1HeroOuterBorder: '#e5e7eb',
    c1HeroInnerDivider: '#eff3f4',
    c1HeroRowBorder: '#e5e7eb',
    c1HeroVsBg: '#f7f9f9',
    c1HeroVsBorder: '#eef2f0',
    c1TagWinBg: '#ecfdf5',
    c1TagWinFg: '#047857',
    c1TagLoseBg: '#fef2f2',
    c1TagLoseFg: '#b91c1c',
    c1InsCritBorder: '#fecaca',
    c1InsCritBg: '#fef2f2',
    c1InsWarnBorder: '#fde68a',
    c1InsWarnBg: '#fffbeb',
    c1InsPosBorder: '#d1fae5',
    c1InsPosBg: '#f0fdf9',
    c1InsDefBorder: '#e5e7eb',
    c1InsDefBg: '#ffffff',
    c1InsDefIcon: '#1b4338',
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
    // dark: 클래스 환산: white/[0.02]=rgba(255,255,255,0.02), white/10=…0.10, black/20=rgba(0,0,0,0.20)
    c1RailBg: 'rgba(255,255,255,0.02)',
    c1RailBorder: 'rgba(255,255,255,0.10)',
    c1TextHeading: '#f8fafc',   // slate-50
    c1TextStrong: '#f1f5f9',    // slate-100
    c1TextSub: '#94a3b8',       // slate-400
    c1SecChipRiskBg: '#4c0519', // rose-950
    c1SecChipRiskFg: '#fecdd3', // rose-200
    c1SecChipDefBg: '#022c22',  // emerald-950
    c1SecChipDefFg: '#a7f3d0',  // emerald-200
    c1HeroWinnerFrom: '#022c22',// emerald-950
    c1HeroWinnerTo: '#000000',
    c1HeroLoserBg: 'rgba(0,0,0,0.20)',
    c1HeroCardBg: 'rgba(255,255,255,0.03)',
    c1HeroOuterBorder: 'rgba(255,255,255,0.10)',
    c1HeroInnerDivider: 'rgba(255,255,255,0.10)',
    c1HeroRowBorder: 'rgba(255,255,255,0.10)',
    c1HeroVsBg: 'rgba(255,255,255,0.02)',
    c1HeroVsBorder: 'rgba(255,255,255,0.10)',
    c1TagWinBg: '#064e3b',      // emerald-900
    c1TagWinFg: '#d1fae5',      // emerald-100
    c1TagLoseBg: '#4c0519',     // rose-950
    c1TagLoseFg: '#ffe4e6',     // rose-100
    c1InsCritBorder: 'rgba(136,19,55,0.5)',  // rose-900/50
    c1InsCritBg: 'rgba(76,5,25,0.2)',        // rose-950/20
    c1InsWarnBorder: 'rgba(120,53,15,0.5)',  // amber-900/50
    c1InsWarnBg: 'rgba(69,26,3,0.2)',        // amber-950/20
    c1InsPosBorder: 'rgba(6,78,59,0.4)',     // emerald-900/40
    c1InsPosBg: 'rgba(2,44,34,0.1)',         // emerald-950/10
    c1InsDefBorder: 'rgba(255,255,255,0.10)',
    c1InsDefBg: 'rgba(255,255,255,0.03)',
    c1InsDefIcon: '#6ee7b7',    // emerald-300
};

export function getCoachTokens(isDark: boolean): CoachTokens {
    return isDark ? DARK : LIGHT;
}
