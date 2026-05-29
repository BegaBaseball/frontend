import { type ComponentType, type ReactNode, type SVGProps, useEffect, useState } from 'react';
import {
    CoachAnalysisData,
    CoachMetric,
    CoachRiskItem,
    DashboardStat,
} from '../../api/coach';
import CoachStatCard from './CoachStatCard';
import CoachMetricCard from './CoachMetricCard';
import CoachMarkdown from '../common/CoachMarkdown';
import TeamLogo, { teamIdToName } from '../TeamLogo';
import {
    PredictionBarChartIcon,
    PredictionCheckCircleIcon,
    PredictionCrosshairIcon,
    PredictionEyeIcon,
    PredictionHelpCircleIcon,
    PredictionTrophyIcon,
    PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CoachAnalysisResultViewProps {
    analysisData: CoachAnalysisData | null;
    homeTeamId?: string;
    awayTeamId?: string;
}

interface InsightSectionProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    items: string[];
    tone?: 'default' | 'warning';
}

// ─────────────────────────────────────────────────────────────
// Dark mode hook
// ─────────────────────────────────────────────────────────────

function useIsDark(): boolean {
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

// ─────────────────────────────────────────────────────────────
// RI icons (C1 정제본 icon set)
// ─────────────────────────────────────────────────────────────

function PenIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M16 4l4 4-11 11H5v-4L16 4z" /><path d="M14 6l4 4" />
        </svg>
    );
}

/** Level 0 — 선발/매치업 (Pitch) */
function PitchIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 7c2 3 6 7 9 9M16 7c-2 3-6 7-9 9" />
        </svg>
    );
}

/** Level 1 — 환경/변수 (Wind) */
function WindIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 8h10a3 3 0 100-6" /><path d="M3 14h14a3 3 0 110 6" /><path d="M3 11h7" />
        </svg>
    );
}

/** Level 2 — 심리/추세 (Brain) */
function BrainIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 3v1a3 3 0 002 3v1a3 3 0 003 3" />
            <path d="M15 4a3 3 0 013 3v1a3 3 0 012 3v1a3 3 0 01-2 3v1a3 3 0 01-3 3" />
            <path d="M9 4a3 3 0 016 0M9 20a3 3 0 006 0" />
        </svg>
    );
}

function RiskIcon({ level, ...props }: SVGProps<SVGSVGElement> & { level: 0 | 1 | 2 }) {
    if (level === 0) return <PitchIcon {...props} />;
    if (level === 1) return <WindIcon {...props} />;
    return <BrainIcon {...props} />;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** **text** → yellow highlight <strong> (VerdictA 형광펜) */
function parseHighlight(text: string): ReactNode[] {
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
        i % 2 === 1
            ? <strong key={i} style={{ fontWeight: 800, background: 'linear-gradient(180deg, transparent 60%, #fde68a 60%)' }}>{part}</strong>
            : part
    );
}

function riskInning(level: 0 | 1 | 2): string {
    return level === 0 ? '1~5회' : level === 1 ? '5~7회' : '7~9회';
}

function riskSevColor(level: 0 | 1 | 2): string {
    return level === 0 ? '#dc2626' : level === 1 ? '#d97706' : '#059669';
}

function riskImpactTo(level: 0 | 1 | 2, isPositive: boolean): 'home' | 'away' | 'both' {
    if (level === 1) return 'both';
    return level === 0 ? (isPositive ? 'away' : 'home') : 'both';
}

/** 팀 ID → 짧은 한글 이름 ("SSG 랜더스" → "SSG", "키움 히어로즈" → "키움") */
function shortTeamName(teamId?: string): string {
    if (!teamId) return '';
    const full = teamIdToName[teamId.toLowerCase()] ?? teamId.toUpperCase();
    // 첫 단어만 반환 (예: "SSG 랜더스" → "SSG", "KT 위즈" → "KT")
    return full.split(/\s+/)[0];
}

// ─────────────────────────────────────────────────────────────
// InsightSection
// ─────────────────────────────────────────────────────────────

function InsightSection({ icon: Icon, title, items, tone = 'default' }: InsightSectionProps) {
    if (items.length === 0) return null;
    const containerCls = tone === 'warning'
        ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
    const iconCls = tone === 'warning' ? 'text-amber-600 dark:text-amber-300' : 'text-gray-600 dark:text-gray-300';
    const textCls = tone === 'warning' ? 'text-amber-900 dark:text-amber-100' : 'text-gray-700 dark:text-gray-300';
    return (
        <div className={`space-y-3 rounded-2xl border p-5 ${containerCls}`}>
            <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className={`h-4 w-4 ${iconCls}`} />
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h4>
            </div>
            <ul className="space-y-2">
                {items.map((item, idx) => (
                    <li key={`${title}-${idx}`} className={`flex gap-2 text-[16px] leading-relaxed ${textCls}`}>
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// A · CoachVerdictMemo — VerdictA
// 누런 종이 줄지 + 테이프 + 형광펜 하이라이트
// ─────────────────────────────────────────────────────────────

function CoachVerdictMemo({
    verdict,
    isReviewMode,
    isFallback = false,
}: {
    verdict: string;
    isReviewMode: boolean;
    isFallback?: boolean;
}) {
    const isDark = useIsDark();
    const paperBg = isDark ? '#1a1810' : '#fffdf5';
    const paperBorder = isDark ? '#3a3420' : '#e9e2c8';
    const ruleColor = isDark ? '#2a2416' : '#f0e8c8';
    const accentColor = isDark ? '#c4a055' : '#7c5f1a';
    const textColor = isDark ? '#ede8d8' : '#1f1812';
    const dashedBorder = isDark ? '#4a3c1a' : '#d6c884';

    return (
        <div
            role="note"
            aria-label={isReviewMode ? '코치 리뷰 노트' : 'AI 코치 분석 메모'}
            style={{
                background: paperBg,
                border: `1px solid ${paperBorder}`,
                borderRadius: 4,
                boxShadow: isDark
                    ? `0 1px 0 ${paperBorder}, 0 8px 24px -16px rgba(0,0,0,0.5)`
                    : '0 1px 0 #e9e2c8, 0 8px 24px -16px rgba(120, 95, 30, 0.25)',
                padding: '20px 24px 22px',
                position: 'relative',
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${ruleColor} 23px, ${ruleColor} 24px)`,
                backgroundPosition: '0 36px',
            }}
        >
            {/* tape */}
            <div aria-hidden="true" style={{
                position: 'absolute', left: 20, top: -8,
                width: 64, height: 14,
                background: isDark ? 'rgba(180,150,80,0.10)' : 'rgba(180,150,80,0.18)',
                transform: 'rotate(-2deg)', borderRadius: 1,
            }} />

            {/* header: pen + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PenIcon style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: accentColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {isReviewMode ? '코치 리뷰 노트' : 'AI 코치 메모'}
                </span>
            </div>

            {/* verdict — **bold** → 형광펜 */}
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, fontWeight: 600, color: textColor, letterSpacing: '-0.005em' }}>
                {parseHighlight(verdict)}
            </p>

            {/* footer */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${dashedBorder}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isFallback ? '— BEGA AI 분석 (구체적 판단은 상세 리포트 참고)' : '— BEGA 코치 분석'}
                </span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// D · RiskTimeline — RiskD
// 9회 축 + 4열: 아이콘·회차·제목+설명·impact
// ─────────────────────────────────────────────────────────────

function RiskTimeline({
    risks,
    isPositive,
}: {
    risks: CoachRiskItem[];
    isPositive: boolean;
}) {
    const isDark = useIsDark();
    const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const levelCount = [0, 0, 0];
    const dots = risks.map((risk) => {
        const offset = levelCount[risk.level]++;
        const x = risk.level === 0 ? 2 + offset : risk.level === 1 ? 5 + offset : 7 + offset;
        return { risk, x: Math.min(x, 9) };
    });

    const bg = isDark ? '#1c1f28' : '#fff';
    const border = isDark ? '#2d3748' : '#e5e7eb';
    const axisColor = isDark ? '#374151' : '#e5e7eb';
    const tickColor = isDark ? '#4b5563' : '#cbd5e1';
    const tickLabel = isDark ? '#6b7280' : '#94a3b8';
    const rowBorder = isDark ? '#1f2937' : '#f1f5f9';
    const textColor = isDark ? '#e5e7eb' : '#0f1419';
    const subColor = isDark ? '#6b7280' : '#64748b';
    const headerColor = isDark ? '#9ca3af' : '#475569';

    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: '18px 22px 8px' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: headerColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    리스크 회차 분포
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11.5, fontWeight: 700, color: subColor }}>
                    {([['#dc2626', '높음'], ['#d97706', '중간'], ['#059669', '낮음']] as const).map(([c, l]) => (
                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: c, display: 'inline-block' }} />
                            {l}
                        </span>
                    ))}
                </span>
            </div>

            {/* 9회 축 */}
            <div style={{ position: 'relative', height: 60, margin: '0 12px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 2, background: axisColor }} />
                {innings.map((n, i) => (
                    <div key={n} style={{ position: 'absolute', left: `${(i / 8) * 100}%`, top: 26, transform: 'translateX(-50%)' }}>
                        <div style={{ width: 1, height: 10, background: tickColor, margin: '0 auto' }} />
                        <div style={{ fontSize: 10.5, color: tickLabel, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>{n}회</div>
                    </div>
                ))}
                {dots.map(({ risk, x }, i) => {
                    const color = riskSevColor(risk.level);
                    return (
                        <div key={i} style={{ position: 'absolute', left: `${((x - 1) / 8) * 100}%`, top: 16, transform: 'translateX(-50%)' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 999, background: color, border: `3px solid ${bg}`, boxShadow: `0 0 0 1px ${color}`, margin: '0 auto' }} />
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: textColor, whiteSpace: 'nowrap', position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)' }}>
                                {risk.area}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 4열 리스트: 아이콘 · 회차 · 제목+설명 · impact */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
                {risks.map((r, idx) => {
                    const color = riskSevColor(r.level);
                    const impactTo = riskImpactTo(r.level, isPositive);
                    const impactColor = impactTo === 'home' ? '#b91c1c' : impactTo === 'away' ? '#047857' : '#64748b';
                    return (
                        <div key={`d-${idx}`} style={{
                            display: 'grid', gridTemplateColumns: '24px 70px 1fr auto',
                            gap: 12, padding: '10px 0',
                            borderTop: '1px solid ' + rowBorder,
                            alignItems: 'center',
                        }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiskIcon level={r.level} width="12" height="12" />
                            </span>
                            <span style={{ fontSize: 11.5, color: subColor, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
                                {riskInning(r.level)}
                            </span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: textColor, lineHeight: 1.4 }}>
                                <strong style={{ fontWeight: 800 }}>{r.area}</strong>
                                <span style={{ color: subColor, fontWeight: 600 }}> · {r.description}</span>
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: impactColor, whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>
                                {impactTo === 'home' ? '−높음' : impactTo === 'away' ? '−낮음' : '±중간'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// E · RiskVersus — RiskE
// 팀 로고 헤더 + 아이콘·제목·회차·impact pill + 설명(들여쓰기 38px)
// ─────────────────────────────────────────────────────────────

function RiskVersus({
    risks,
    isPositive,
    homeTeamId,
    awayTeamId,
}: {
    risks: CoachRiskItem[];
    isPositive: boolean;
    homeTeamId?: string;
    awayTeamId?: string;
}) {
    const isDark = useIsDark();
    const bg = isDark ? '#1c1f28' : '#fff';
    const border = isDark ? '#2d3748' : '#e5e7eb';
    const headerBg = isDark ? '#111827' : '#fafafa';
    const headerBorder = isDark ? '#1f2937' : '#eef2f0';
    const rowBorder = isDark ? '#1f2937' : '#f1f5f9';
    const textColor = isDark ? '#e5e7eb' : '#0f1419';
    const subColor = isDark ? '#6b7280' : '#475569';
    const headerText = isDark ? '#6b7280' : '#64748b';

    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';

    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* header — 팀 로고 + 팀명에 불리 */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: headerBg, padding: '10px 18px',
                fontSize: 11, fontWeight: 800, color: headerText,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: `1px solid ${headerBorder}`,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {homeTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={homeTeamId} size={14} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                    {homeName}에 불리
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    {awayName}에 불리
                    {awayTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={awayTeamId} size={14} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                </span>
            </div>

            {risks.map((r, idx) => {
                const impactTo = riskImpactTo(r.level, isPositive);
                const isHome = impactTo === 'home';
                const isAway = impactTo === 'away';
                const isBoth = impactTo === 'both';
                const sevColor = riskSevColor(r.level);
                const pillText = isHome ? `${homeName} 불리` : isAway ? `${awayName} 불리` : '양 팀 변수';
                const pillColor = isHome ? '#b91c1c' : isAway ? '#047857' : '#854d0e';
                const pillBg = isHome
                    ? (isDark ? 'rgba(220,38,38,0.15)' : '#fef2f2')
                    : isAway
                        ? (isDark ? 'rgba(5,150,105,0.15)' : '#ecfdf5')
                        : (isDark ? 'rgba(133,77,14,0.15)' : '#fffbeb');

                return (
                    <div key={`e-${idx}`} style={{ padding: '14px 18px', borderTop: `1px solid ${rowBorder}`, position: 'relative' }}>
                        {/* 상단 accent bar */}
                        <div style={{ position: 'absolute', left: 18, right: 18, top: 0, height: 3, display: 'flex', borderRadius: 0 }}>
                            {isHome && <div style={{ width: '50%', background: isDark ? 'rgba(254,202,202,0.3)' : '#fecaca', transform: 'translateY(-1.5px)' }} />}
                            {isAway && <div style={{ width: '50%', marginLeft: 'auto', background: isDark ? 'rgba(167,243,208,0.3)' : '#a7f3d0', transform: 'translateY(-1.5px)' }} />}
                            {isBoth && <div style={{ width: '100%', background: isDark ? 'rgba(253,230,138,0.2)' : '#fde68a', transform: 'translateY(-1.5px)' }} />}
                        </div>

                        {/* 아이콘 + 제목 + 회차 + pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: sevColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiskIcon level={r.level} width="13" height="13" />
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>{r.area}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: subColor, fontFamily: 'ui-monospace, monospace' }}>
                                · {riskInning(r.level)}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: pillColor, padding: '3px 8px', borderRadius: 999, background: pillBg, whiteSpace: 'nowrap' }}>
                                {pillText}
                            </span>
                        </div>

                        {/* 설명 — 38px 들여쓰기 (아이콘 26 + gap 12) */}
                        <p style={{ margin: 0, fontSize: 13, color: subColor, fontWeight: 600, lineHeight: 1.5, paddingLeft: 38 }}>
                            {r.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main — 기존 단일 스크롤 레이아웃
// ─────────────────────────────────────────────────────────────

export default function CoachAnalysisResultView({
    analysisData,
    homeTeamId,
    awayTeamId,
}: CoachAnalysisResultViewProps) {
    if (!analysisData) return null;

    const isReviewMode = analysisData.game_status_bucket === 'COMPLETED';
    const isPositive = analysisData.dashboard.sentiment === 'positive';

    const toneLabel = isPositive
        ? isReviewMode ? '리뷰 결과 · 우세 근거' : '우세 근거'
        : isReviewMode ? '리뷰 결과 · 주의 변수' : '주의 변수';

    const toneDescription = isPositive
        ? isReviewMode
            ? '실제 승패에 유리하게 작용한 근거를 요약했습니다.'
            : '경기 전 유리하게 볼 수 있는 근거를 요약했습니다.'
        : isReviewMode
            ? '실제 경기에서 흐름을 흔든 위험 요인을 요약했습니다.'
            : '경기 중 우선 확인해야 할 위험 요인을 요약했습니다.';

    const criticalFactors = analysisData.metrics.filter((m: CoachMetric) => m.risk_level === 0);
    const strategicFactors = analysisData.metrics.filter((m: CoachMetric) => m.risk_level !== 0);
    const hasAnyMetric = criticalFactors.length > 0 || strategicFactors.length > 0;
    const hasDetailedReport = Boolean(analysisData.detailed_analysis) || Boolean(analysisData.coach_note);

    const verdictText = analysisData.verdict || analysisData.analysis_summary || analysisData.dashboard.context;
    const isFallbackVerdict = !analysisData.verdict && !analysisData.analysis_summary;

    return (
        <div role="article" className="space-y-8 pb-10">

            {/* ── Hero ──────────────────────────────────────────── */}
            <div className={`rounded-2xl border p-5 shadow-sm sm:p-7 ${
                isPositive
                    ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    : 'border-red-200/80 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
            }`}>
                <div className="flex flex-col gap-2">
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[16px] font-bold ${
                        isPositive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                    }`}>
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {toneLabel}
                    </span>
                    <p className="max-w-3xl text-[16px] font-semibold leading-relaxed text-gray-700 dark:text-gray-200">
                        {toneDescription}
                    </p>
                </div>
                <div className="mt-5 mb-8">
                    <h3 className="mb-4 flex items-start gap-3 break-keep text-xl font-bold leading-tight text-gray-900 dark:text-white sm:text-2xl">
                        {isPositive
                            ? <PredictionTrophyIcon aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 text-emerald-500 sm:h-8 sm:w-8" />
                            : <PredictionWarningTriangleIcon aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 text-red-500 sm:h-8 sm:w-8" />
                        }
                        <span>{analysisData.dashboard.headline}</span>
                    </h3>
                    <p className="break-keep text-[16px] font-bold leading-relaxed text-gray-700 dark:text-gray-200 sm:text-base">
                        {analysisData.dashboard.context}
                    </p>
                </div>
                {analysisData.dashboard.stats.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {analysisData.dashboard.stats.map((stat: DashboardStat, idx: number) => (
                            <CoachStatCard key={idx} stat={stat} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── A · 코치 판단 — VerdictA ─────────────────────── */}
            <CoachVerdictMemo
                verdict={verdictText}
                isReviewMode={isReviewMode}
                isFallback={isFallbackVerdict}
            />

            {/* ── 핵심 변수 ──────────────────────────────────────── */}
            {hasAnyMetric && (
                <div className="space-y-10">
                    {criticalFactors.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <PredictionWarningTriangleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                        {isReviewMode ? '결과를 가른 변수' : '즉시 확인할 변수'}
                                    </h4>
                                    <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                                        {isReviewMode ? '실제 경기 흐름에 가장 큰 영향을 준 항목입니다.' : '경기 흐름에 가장 큰 영향을 줄 수 있는 항목입니다.'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {criticalFactors.map((item: CoachMetric, idx: number) => (
                                    <CoachMetricCard key={`c-${idx}`} data={item} />
                                ))}
                            </div>
                        </div>
                    )}
                    {strategicFactors.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <PredictionCheckCircleIcon aria-hidden="true" className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                        {isReviewMode ? '결과로 이어진 우위 지표' : '우위 근거 지표'}
                                    </h4>
                                    <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                                        {isReviewMode ? '실제 결과로 연결된 강점이 보인 항목입니다.' : '지속적으로 관리할 수 있는 장점이 보이는 항목입니다.'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {strategicFactors.map((item: CoachMetric, idx: number) => (
                                    <CoachMetricCard key={`s-${idx}`} data={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 인사이트 ────────────────────────────────────────── */}
            <div className="grid gap-6 sm:grid-cols-2">
                <InsightSection icon={PredictionBarChartIcon}       title={isReviewMode ? '결과를 가른 이유' : '왜 중요한가'}      items={analysisData.why_it_matters} />
                <InsightSection icon={PredictionCrosshairIcon}       title={isReviewMode ? '실제 전환점' : '승부 스윙 포인트'}      items={analysisData.swing_factors} />
                <InsightSection icon={PredictionEyeIcon}             title={isReviewMode ? '다시 볼 장면' : '체크 포인트'}          items={analysisData.watch_points} />
                <InsightSection icon={PredictionHelpCircleIcon}      title="불확실성"                                              items={analysisData.uncertainty} tone="warning" />
                <InsightSection icon={PredictionCheckCircleIcon}     title={isReviewMode ? '잘 풀린 지점' : '강점 유지 포인트'}    items={analysisData.strengths} />
                <InsightSection icon={PredictionWarningTriangleIcon} title={isReviewMode ? '흔들린 지점' : '약점 관리 포인트'}     items={analysisData.weaknesses} />
            </div>

            {/* ── D+E · 리스크 관리 ─────────────────────────────── */}
            {analysisData.risks.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <PredictionWarningTriangleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
                        <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">리스크 관리 포인트</h4>
                            <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                                {isReviewMode ? '실제 결과에 영향을 준 위험 구간입니다.' : '경기 전개에서 즉시 확인이 필요한 구간입니다.'}
                            </p>
                        </div>
                    </div>
                    {/* D */}
                    <RiskTimeline risks={analysisData.risks} isPositive={isPositive} />
                    {/* E */}
                    <RiskVersus risks={analysisData.risks} isPositive={isPositive} homeTeamId={homeTeamId} awayTeamId={awayTeamId} />
                </div>
            )}

            {/* ── 상세 리포트 ──────────────────────────────────────── */}
            {hasDetailedReport && (
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                        <PredictionBarChartIcon aria-hidden="true" className="h-5 w-5 text-blue-500" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">상세 리포트</h4>
                    </div>
                    {analysisData.detailed_analysis && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <CoachMarkdown>{analysisData.detailed_analysis}</CoachMarkdown>
                        </div>
                    )}
                    {analysisData.coach_note && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <p className="mb-2 text-[16px] font-bold text-gray-900 dark:text-gray-100">코치의 한마디</p>
                            <CoachMarkdown>{analysisData.coach_note}</CoachMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
