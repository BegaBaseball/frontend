import { type ComponentType, type SVGProps, useCallback, useEffect, useState } from 'react';
import {
    CoachAnalysisData,
    CoachDataQuality,
    CoachGenerationMode,
    CoachMetric,
    DashboardStat,
} from '../../api/coach';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import CoachMarkdown from '../common/CoachMarkdown';
import TeamLogo from '../TeamLogo';
import { resolveWinProbabilityDisplay } from '../../utils/coachWinProbability';
import { getTeamColor } from '../../utils/teamColors';
import {
    getEvidenceSourceGroups,
    pickCoreEvidenceCodes,
    resolveCoachEvidenceCount,
    resolveEvidenceSources,
} from './coachEvidenceLabels';
import {
    PredictionBarChartIcon,
    PredictionCheckCircleIcon,
    PredictionCrosshairIcon,
    PredictionEyeIcon,
    PredictionHelpCircleIcon,
    PredictionTrophyIcon,
    PredictionWarningTriangleIcon,
} from './PredictionShellIcons';
import CoachVerdictMemo from './CoachVerdictMemo';
import RiskTimeline from './RiskTimeline';
import RiskVersus from './RiskVersus';
import { shortTeamName, useIsDark } from './coachRiskHelpers';
import { getCoachTokens, IMPACT } from './coachStyleTokens';

interface CoachAnalysisResultViewProps {
    analysisData: CoachAnalysisData | null;
    homeTeamId?: string;
    awayTeamId?: string;
    winProbabilityHome?: number | null;
    dataQualityLabel?: string;
    dataQualityMessage?: string;
    supportedFactCount?: number;
    usedEvidence?: string[];
    dataQuality?: CoachDataQuality;
    groundingWarnings?: string[];
    groundingReasons?: string[];
    generationMode?: CoachGenerationMode;
    freshnessLabel?: string | null;
}

/** data_quality 별 톤(칩/사이드바 행). 신규 하드코딩 hex 없이 Tailwind arbitrary class 재사용. */
const DATA_QUALITY_TONE: Record<CoachDataQuality, { chip: string; row: string }> = {
    grounded: {
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
        row: 'text-emerald-700 dark:text-emerald-300',
    },
    partial: {
        chip: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
        row: 'text-amber-700 dark:text-amber-300',
    },
    insufficient: {
        chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
        row: 'text-rose-700 dark:text-rose-300',
    },
};

const NEUTRAL_TONE = {
    chip: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white',
    row: 'text-slate-700 dark:text-white',
};

/** 가짜 합산 카운트 대신 실데이터 근거 수: 검증 fact 수 우선, 없으면 사용한 근거 소스 수. */
function resolveEvidenceCount(supportedFactCount?: number, usedEvidence?: string[]): number {
    return resolveCoachEvidenceCount({ supportedFactCount, usedEvidence });
}

interface SectionHeadingProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    subtitle?: string;
    tone?: 'default' | 'risk';
}

interface SignalItem {
    label: string;
    value: string;
    detail: string;
    tone: 'danger' | 'warning' | 'success' | 'neutral';
}

function metricTone(riskLevel: CoachMetric['risk_level']): SignalItem['tone'] {
    if (riskLevel === 0) return 'danger';
    if (riskLevel === 1) return 'warning';
    return 'success';
}

function statTone(stat: DashboardStat): SignalItem['tone'] {
    if (stat.is_critical) return 'danger';
    if (stat.trend === 'up') return 'success';
    if (stat.trend === 'down') return 'warning';
    return 'neutral';
}

function buildSignals(analysisData: CoachAnalysisData): SignalItem[] {
    const stats = analysisData.dashboard.stats.map((stat) => ({
        label: stat.label,
        value: stat.value,
        detail: stat.status,
        tone: statTone(stat),
    }));

    const metrics = analysisData.metrics.map((metric) => ({
        label: metric.category || metric.name,
        value: metric.value || metric.name,
        detail: metric.description,
        tone: metricTone(metric.risk_level),
    }));

    return [...stats, ...metrics].filter((item) => item.label || item.value || item.detail);
}

function SectionHeading({
    icon: Icon,
    title,
    subtitle,
    tone = 'default',
}: SectionHeadingProps) {
    const t = getCoachTokens(useIsDark());
    const chipStyle = tone === 'risk'
        ? { background: t.c1SecChipRiskBg, color: t.c1SecChipRiskFg }
        : { background: t.c1SecChipDefBg, color: t.c1SecChipDefFg };
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={chipStyle}>
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
                <h4 className="text-[15.5px] font-extrabold leading-tight" style={{ color: t.c1TextHeading }}>
                    {title}
                </h4>
                {subtitle && (
                    <p className="mt-0.5 text-[12.5px] font-bold leading-snug" style={{ color: t.c1TextSub }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

type InsightTone = 'default' | 'warning' | 'critical' | 'positive';

interface InsightCardProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    items: string[];
    tone?: InsightTone;
}

// 컨테이너 border/bg 와 default 아이콘만 토큰화. icon/item 색은 named Tailwind 클래스(이미 디자인 토큰) 유지.
const INSIGHT_TONE_CLS: Record<InsightTone, { icon: string; item: string }> = {
    critical: { icon: 'text-rose-600 dark:text-rose-300', item: 'text-rose-900 dark:text-rose-100' },
    warning: { icon: 'text-amber-600 dark:text-amber-300', item: 'text-amber-900 dark:text-amber-100' },
    positive: { icon: 'text-emerald-600 dark:text-emerald-300', item: 'text-emerald-900/90 dark:text-emerald-100/90' },
    default: { icon: '', item: 'text-slate-700 dark:text-white' },
};

function insightContainerStyle(tone: InsightTone, t: ReturnType<typeof getCoachTokens>) {
    switch (tone) {
        case 'critical': return { borderColor: t.c1InsCritBorder, background: t.c1InsCritBg };
        case 'warning': return { borderColor: t.c1InsWarnBorder, background: t.c1InsWarnBg };
        case 'positive': return { borderColor: t.c1InsPosBorder, background: t.c1InsPosBg };
        default: return { borderColor: t.c1InsDefBorder, background: t.c1InsDefBg };
    }
}

function InsightCard({ icon: Icon, title, items, tone = 'default' }: InsightCardProps) {
    const t = getCoachTokens(useIsDark());
    if (items.length === 0) return null;
    const cls = INSIGHT_TONE_CLS[tone];
    const iconStyle = tone === 'default' ? { color: t.c1InsDefIcon } : undefined;
    return (
        <div className="space-y-2.5 rounded-[18px] border px-[18px] py-4" style={insightContainerStyle(tone, t)}>
            <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${cls.icon}`} style={iconStyle} />
                <h5 className="text-[13.5px] font-extrabold leading-tight" style={{ color: t.c1TextHeading }}>
                    {title}
                </h5>
            </div>
            <ul className="space-y-1.5">
                {items.map((item, idx) => (
                    <li key={`${title}-${idx}`} className={`flex gap-2 text-[13.5px] font-semibold leading-[1.55] ${cls.item}`}>
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                        <span className="min-w-0">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface SectionNavItem {
    id: string;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    count: number | null;
}

/** 본문 스크롤 조상을 root 로 삼아 현재 노출 섹션을 추적 (다이얼로그 셸의 overflow-y-auto). */
function useActiveSection(ids: string[]): string {
    const key = ids.join('|');
    const [active, setActive] = useState<string>(ids[0] ?? '');
    useEffect(() => {
        if (typeof document === 'undefined' || ids.length === 0) return;
        const els = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => Boolean(el));
        if (els.length === 0) return;
        let root: HTMLElement | null = els[0].parentElement;
        while (root) {
            const oy = getComputedStyle(root).overflowY;
            if (oy === 'auto' || oy === 'scroll') break;
            root = root.parentElement;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { root, rootMargin: '0px 0px -55% 0px', threshold: 0 },
        );
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
    return active;
}

function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function C1SummaryRail({
    analysisData,
    homeTeamId,
    awayTeamId,
    winProbabilityHome,
    isReviewMode,
    dataQualityLabel,
    dataQualityMessage,
    dataQuality,
    generationMode,
    supportedFactCount,
    usedEvidence,
    groundingWarnings,
    groundingReasons,
    sections,
    activeId,
    onJump,
    freshnessLabel,
}: {
    analysisData: CoachAnalysisData;
    homeTeamId?: string;
    awayTeamId?: string;
    winProbabilityHome: number | null;
    isReviewMode: boolean;
    dataQualityLabel?: string;
    dataQualityMessage?: string;
    dataQuality?: CoachDataQuality;
    generationMode?: CoachGenerationMode;
    supportedFactCount?: number;
    usedEvidence?: string[];
    groundingWarnings?: string[];
    groundingReasons?: string[];
    sections: SectionNavItem[];
    activeId: string;
    onJump: (id: string) => void;
    freshnessLabel?: string | null;
}) {
    const t = getCoachTokens(useIsDark());
    const [showAllEvidence, setShowAllEvidence] = useState(false);
    const winProbability = resolveWinProbabilityDisplay(winProbabilityHome);
    const homePct = winProbability?.homePct ?? null;
    const awayPct = winProbability?.awayPct ?? null;
    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';
    const favoredIsHome = winProbability ? winProbability.favoredSide === 'home' : analysisData.dashboard.sentiment !== 'negative';
    const favoredName = favoredIsHome ? homeName : awayName;
    const diff = winProbability?.diffPct ?? null;
    const favoredPct = winProbability?.favoredPct ?? null;
    const homeColor = getTeamColor(homeTeamId);
    const awayColor = getTeamColor(awayTeamId);
    const favoredColor = favoredIsHome ? homeColor : awayColor;
    // 실데이터 근거 수(가짜 합산 제거): 검증 fact 수 우선, 없으면 근거 소스 수.
    const evidenceCount = resolveEvidenceCount(supportedFactCount, usedEvidence);
    const evidenceSources = resolveEvidenceSources(usedEvidence);
    const coreEvidenceSources = pickCoreEvidenceCodes(evidenceSources, {
        dataQuality,
        groundingWarnings,
        groundingReasons,
    });
    const hasCoreEvidenceTrim = evidenceSources.length > coreEvidenceSources.length;
    const visibleEvidenceSources = (showAllEvidence && hasCoreEvidenceTrim)
        ? evidenceSources
        : coreEvidenceSources;
    const displayEvidenceCount = hasCoreEvidenceTrim ? visibleEvidenceSources.length : evidenceSources.length;
    const groupedEvidenceSources = getEvidenceSourceGroups(visibleEvidenceSources);
    const evidenceSummaryCount = hasCoreEvidenceTrim && !showAllEvidence ? coreEvidenceSources.length : evidenceSources.length;
    const summaryTitle = `핵심 근거 ${evidenceSummaryCount}개`;
    const qualityRowTone = (dataQuality && DATA_QUALITY_TONE[dataQuality]?.row) || NEUTRAL_TONE.row;

    // A3: 승률 큰 % + split 바 제거. versus hero 가 팀별 %를 소유하므로 사이드바는 한 줄 요약만.
    const favoredLine = diff === null
        ? `${favoredName} 흐름 분석`
        : diff <= 8
            ? '박빙 매치업'
            : `${favoredName} 우세 · ${diff}%p`;

    return (
        <aside
            className="r3-side min-w-0 border-b px-[22px] py-6 sm:sticky sm:top-0 sm:self-start sm:border-b-0 sm:border-r"
            style={{ borderColor: t.c1RailBorder, background: t.c1RailBg }}
        >
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-white">
                    {isReviewMode ? '경기 리뷰' : '예측 결과'}
                </p>
                {favoredPct !== null && (
                    <p
                        className="mt-2 text-[32px] font-black leading-none tracking-[-0.04em]"
                        style={{ color: favoredColor }}
                    >
                        {favoredPct}<span className="ml-0.5 text-[18px]">%</span>
                    </p>
                )}
                <p className="mt-1.5 text-[15px] font-black leading-snug text-slate-950 dark:text-white">
                    {favoredLine}
                </p>
            </div>
            {homePct !== null && awayPct !== null && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-1.5 flex justify-between text-[11.5px] font-extrabold">
                        <span className="inline-flex items-center gap-1" style={{ color: awayColor }}>
                            {awayTeamId && <TeamLogo teamId={awayTeamId} size={13} className="!rounded-none !bg-transparent p-0" />}
                            {awayName}
                        </span>
                        <span className="inline-flex items-center gap-1" style={{ color: homeColor }}>
                            {homeName}
                            {homeTeamId && <TeamLogo teamId={homeTeamId} size={13} className="!rounded-none !bg-transparent p-0" />}
                        </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <span style={{ width: `${awayPct}%`, background: awayColor }} />
                        <span style={{ width: `${homePct}%`, background: homeColor }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11.5px] font-extrabold">
                        <span style={{ color: awayColor }}>{awayPct}%</span>
                        <span style={{ color: homeColor }}>{homePct}%</span>
                    </div>
                </div>
            )}
            <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-white">근거</span>
                    <span data-testid="coach-evidence-count" className="font-extrabold text-slate-900 dark:text-white">
                        {evidenceCount > 0 ? `${evidenceCount}건` : '확인 중'}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-white">리스크</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                        {analysisData.risks.length > 0 ? `${analysisData.risks.length}건` : '없음'}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-white">상태</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                        {isReviewMode ? '실경기 기반' : '경기 전'}
                    </span>
                </div>
                {dataQualityLabel && (
                    <div className="flex items-center justify-between text-[13px]">
                        <span className="font-bold text-slate-500 dark:text-white">데이터</span>
                        <span className={`font-extrabold ${qualityRowTone}`}>{dataQualityLabel}</span>
                    </div>
                )}
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-white">갱신</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                        {freshnessLabel || '최신 갱신'}
                    </span>
                </div>
            </div>
            {generationMode === 'evidence_fallback' && (
                <p className="mt-2 break-keep text-[12px] font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                    근거가 제한적이라 보수적으로 요약했습니다.
                </p>
            )}
            {dataQualityMessage && (
                <p className="mt-2 break-keep text-[12px] font-bold leading-relaxed text-slate-500 dark:text-white">
                    {dataQualityMessage}
                </p>
            )}
            <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
            {/* A1: 실제 존재 섹션과 1:1, 클릭 점프 + scroll-spy active */}
            <nav className="space-y-1" aria-label="섹션 이동">
                {sections.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === activeId;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onJump(item.id)}
                            aria-current={active ? 'location' : undefined}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-extrabold transition-colors ${
                                active
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-white dark:hover:bg-white/5'
                            }`}
                        >
                            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.count !== null && (
                                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-700 dark:text-white">
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
            {evidenceSources.length > 0 && (
                <details
                    data-testid="coach-evidence-sources"
                    className="group mt-4 rounded-lg border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-white/[0.03]"
                    open={showAllEvidence}
                    onToggle={(event) => {
                        const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
                        setShowAllEvidence(nextOpen);
                    }}
                >
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[12px] font-extrabold text-slate-600 dark:text-white">
                        <span className="flex-1">{summaryTitle}</span>
                        {hasCoreEvidenceTrim ? (
                            <span className="text-[11px] font-bold text-slate-400 group-open:hidden">
                                전체 보기
                            </span>
                        ) : null}
                        {hasCoreEvidenceTrim ? (
                            <span className="hidden text-[11px] font-bold text-slate-400 group-open:inline">
                                핵심 근거만
                            </span>
                        ) : null}
                    </summary>
                    <div className="space-y-2 px-3 pb-3 pt-1">
                        {!showAllEvidence && hasCoreEvidenceTrim ? (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-bold leading-tight text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                                근거 품질 제약으로 핵심 항목 위주로 먼저 노출합니다.
                            </p>
                        ) : null}
                        {groupedEvidenceSources.map((group) => (
                            <div
                                key={group.category}
                                className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                                <div className="bg-slate-50 px-2 py-1.5 text-[11px] font-extrabold text-slate-500 dark:bg-white/[0.05] dark:text-white">
                                    {group.title}
                                </div>
                                <ul className="space-y-1.5 px-2 py-1.5">
                                    {group.items.map((item) => (
                                        <li
                                            key={item.code}
                                            title={item.description}
                                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left dark:border-slate-700 dark:bg-white/[0.03]"
                                        >
                                            <p className="text-[12px] font-extrabold text-slate-700 dark:text-white">
                                                {item.label}
                                            </p>
                                            <p className="mt-0.5 break-keep text-[10.5px] font-medium leading-snug text-slate-500 dark:text-white">
                                                {item.description}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        {displayEvidenceCount === 0 ? (
                            <p className="rounded-md border border-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-700 dark:border-amber-900/30 dark:text-amber-200">
                                표시 가능한 핵심 근거가 부족해 요약만 노출합니다.
                            </p>
                        ) : null}
                    </div>
                </details>
            )}
        </aside>
    );
}

function C1VersusHero({
    analysisData,
    homeTeamId,
    awayTeamId,
    winProbabilityHome,
}: {
    analysisData: CoachAnalysisData;
    homeTeamId?: string;
    awayTeamId?: string;
    winProbabilityHome: number | null;
}) {
    const t = getCoachTokens(useIsDark());
    const isNarrow = useMediaQuery('(max-width: 640px)');
    const winProbability = resolveWinProbabilityDisplay(winProbabilityHome);
    const homePct = winProbability?.homePct ?? null;
    const awayPct = winProbability?.awayPct ?? null;
    const favoredIsHome = winProbability ? winProbability.favoredSide === 'home' : analysisData.dashboard.sentiment !== 'negative';
    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';
    const signals = buildSignals(analysisData);
    const rowCount = isNarrow ? 2 : 3;
    const homeRows = signals.slice(0, rowCount);
    const awayRows = (signals.length > rowCount ? signals.slice(rowCount, rowCount * 2) : signals.slice(0, rowCount));

    const renderTeamColumn = ({
        teamId,
        name,
        pct,
        isWinner,
        rows,
    }: {
        teamId?: string;
        name: string;
        pct: number | null;
        isWinner: boolean;
        rows: SignalItem[];
    }) => (
        <div
            className="flex flex-col gap-4 p-[22px]"
            style={{
                background: isWinner
                    ? `linear-gradient(to bottom, ${t.c1HeroWinnerFrom}, ${t.c1HeroWinnerTo})`
                    : t.c1HeroLoserBg,
            }}
        >
            <div className="flex items-center gap-2.5 text-[16px] font-black" style={{ color: t.c1TextStrong }}>
                {teamId && <TeamLogo teamId={teamId} size={32} className="!rounded-none !bg-transparent p-0" />}
                <span className="min-w-0 truncate">{name}</span>
            </div>
            <div className="text-[38px] font-black leading-none" style={{ color: isWinner ? IMPACT.away : IMPACT.home }}>
                {pct === null ? '--' : pct}
                {pct !== null && <span className="ml-0.5 text-[18px]">%</span>}
            </div>
            {rows.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {rows.slice(0, 2).map((row, idx) => (
                        <span
                            key={`${name}-tag-${row.label}-${idx}`}
                            className="rounded-full px-2 py-1 text-[11.5px] font-extrabold"
                            style={isWinner
                                ? { background: t.c1TagWinBg, color: t.c1TagWinFg }
                                : { background: t.c1TagLoseBg, color: t.c1TagLoseFg }}
                        >
                            {row.label || row.value}
                        </span>
                    ))}
                </div>
            )}
            <div className="h-px" style={{ background: t.c1HeroInnerDivider }} />
            <div>
                {(rows.length > 0 ? rows : [{ label: '분석', value: analysisData.dashboard.sentiment, detail: analysisData.dashboard.context, tone: 'neutral' as const }]).map((row, idx) => (
                    <div
                        key={`${name}-row-${row.label}-${idx}`}
                        className="flex items-center justify-between gap-3 border-t border-dashed py-2 text-[13px] font-bold first:border-t-0"
                        style={{ borderColor: t.c1HeroRowBorder }}
                    >
                        <span className="min-w-0 truncate" style={{ color: t.c1TextSub }}>{row.label}</span>
                        <span
                            className="shrink-0 text-right"
                            style={{ color: row.tone === 'success' ? IMPACT.away : row.tone === 'danger' ? IMPACT.home : t.c1TextStrong }}
                        >
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <section
            className="versus grid overflow-hidden rounded-[20px] border md:grid-cols-[1fr_64px_1fr]"
            style={{ borderColor: t.c1HeroOuterBorder, background: t.c1HeroCardBg }}
        >
            {renderTeamColumn({
                teamId: homeTeamId,
                name: homeName,
                pct: homePct,
                isWinner: favoredIsHome,
                rows: homeRows,
            })}
            <div
                className="flex items-center justify-center border-y px-3 py-2 font-serif text-[20px] font-bold italic md:border-x md:border-y-0"
                style={{ borderColor: t.c1HeroVsBorder, background: t.c1HeroVsBg, color: t.c1TextSub }}
            >
                VS
            </div>
            {renderTeamColumn({
                teamId: awayTeamId,
                name: awayName,
                pct: awayPct,
                isWinner: !favoredIsHome,
                rows: awayRows,
            })}
        </section>
    );
}

/** 리스크가 0건일 때 섹션을 숨기지 않고 차분한 빈 상태로 노출. 토큰은 리스크 카드와 동일. */
function RiskEmptyState({ isReviewMode }: { isReviewMode: boolean }) {
    const t = getCoachTokens(useIsDark());
    return (
        <div
            data-testid="coach-risk-empty"
            role="note"
            aria-label="식별된 리스크 없음"
            style={{
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: t.c1SecChipDefBg,
                    color: t.c1SecChipDefFg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <PredictionCheckCircleIcon className="h-4 w-4" />
            </span>
            <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, lineHeight: 1.4, color: t.textColor, wordBreak: 'keep-all' }}>
                    {isReviewMode
                        ? '경기에서 두드러진 리스크 요인이 나타나지 않았습니다.'
                        : '현재 데이터 기준 특이 리스크가 식별되지 않았습니다.'}
                </p>
                {!isReviewMode && (
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, color: t.subColor, wordBreak: 'keep-all' }}>
                        데이터가 더 들어오면 회차 분포·영향 방향으로 업데이트됩니다.
                    </p>
                )}
            </div>
        </div>
    );
}

export default function CoachAnalysisResultView({
    analysisData,
    homeTeamId,
    awayTeamId,
    winProbabilityHome = null,
    dataQualityLabel,
    dataQualityMessage,
    supportedFactCount,
    usedEvidence,
    dataQuality,
    groundingWarnings,
    groundingReasons,
    generationMode,
    freshnessLabel,
}: CoachAnalysisResultViewProps) {
    const isMobileSheet = useMediaQuery('(max-width: 640px)');
    const isReviewMode = analysisData?.game_status_bucket === 'COMPLETED';
    const isPositive = analysisData?.dashboard.sentiment === 'positive';
    // 근거 신뢰 칩: 실데이터 근거 수 + 데이터 품질 라벨. 둘 다 없으면 미렌더.
    const evidenceCount = resolveEvidenceCount(supportedFactCount, usedEvidence);
    const evidenceChipTone = (dataQuality && DATA_QUALITY_TONE[dataQuality]?.chip) || NEUTRAL_TONE.chip;
    const showEvidenceChip = evidenceCount > 0 || Boolean(dataQualityLabel);
    const hasDetailedReport = Boolean(analysisData?.detailed_analysis) || Boolean(analysisData?.coach_note);
    const hasRisks = Boolean(analysisData && analysisData.risks.length > 0);
    const verdictText = analysisData
        ? (analysisData.verdict || analysisData.analysis_summary || analysisData.dashboard.context)
        : '';
    const isFallbackVerdict = !analysisData?.verdict && !analysisData?.analysis_summary;
    const safeWinProbabilityHome = typeof winProbabilityHome === 'number' && Number.isFinite(winProbabilityHome)
        ? winProbabilityHome
        : null;

    // A4: 위험계열(약점·불확실성) 먼저+강조, 중립 근거 중간, 긍정(강점) 마지막+차분.
    const insights: (InsightCardProps & { id: string })[] = analysisData ? [
        { id: 'weak',   icon: PredictionWarningTriangleIcon, title: isReviewMode ? '흔들린 지점' : '약점 관리 포인트',    items: analysisData.weaknesses,    tone: 'critical' as const },
        { id: 'uncert', icon: PredictionHelpCircleIcon,      title: '불확실성',                                          items: analysisData.uncertainty,   tone: 'warning' as const },
        { id: 'why',    icon: PredictionBarChartIcon,        title: isReviewMode ? '결과를 가른 이유' : '왜 중요한가',    items: analysisData.why_it_matters, tone: 'default' as const },
        { id: 'swing',  icon: PredictionCrosshairIcon,        title: isReviewMode ? '실제 전환점' : '승부 스윙 포인트',    items: analysisData.swing_factors,  tone: 'default' as const },
        { id: 'watch',  icon: PredictionEyeIcon,             title: isReviewMode ? '다시 볼 장면' : '체크 포인트',        items: analysisData.watch_points,   tone: 'default' as const },
        { id: 'strong', icon: PredictionCheckCircleIcon,     title: isReviewMode ? '잘 풀린 지점' : '강점 유지 포인트',   items: analysisData.strengths,      tone: 'positive' as const },
    ].filter((s) => Array.isArray(s.items) && s.items.length > 0) : [];

    // A1: 본문에 실제 렌더되는 섹션만 nav/scroll-spy 대상으로.
    const SEC = { verdict: 'coach-section-verdict', insights: 'coach-section-insights', risks: 'coach-section-risks', detail: 'coach-section-detail' };
    const sections: SectionNavItem[] = analysisData ? [
        { id: SEC.verdict, label: '코치 판단', icon: isPositive ? PredictionTrophyIcon : PredictionCrosshairIcon, count: null },
        ...(insights.length > 0 ? [{ id: SEC.insights, label: '인사이트', icon: PredictionBarChartIcon, count: insights.length }] : []),
        { id: SEC.risks, label: '리스크', icon: PredictionWarningTriangleIcon, count: hasRisks ? analysisData.risks.length : null },
        ...(hasDetailedReport ? [{ id: SEC.detail, label: '상세 리포트', icon: PredictionEyeIcon, count: null }] : []),
    ] : [];
    // 훅은 early-return 앞에서 무조건 호출 (Rules of Hooks)
    const activeId = useActiveSection(sections.map((s) => s.id));
    const handleJump = useCallback((id: string) => scrollToSection(id), []);

    if (!analysisData) return null;

    return (
        <div role="article" className="dlg">
            <div className="r3-layout grid min-h-0 sm:grid-cols-[280px_minmax(0,1fr)]">
                {!isMobileSheet && (
                <C1SummaryRail
                    analysisData={analysisData}
                    homeTeamId={homeTeamId}
                    awayTeamId={awayTeamId}
                    winProbabilityHome={safeWinProbabilityHome}
                    isReviewMode={isReviewMode}
                    dataQualityLabel={dataQualityLabel}
                    dataQualityMessage={dataQualityMessage}
                    dataQuality={dataQuality}
                    generationMode={generationMode}
                    supportedFactCount={supportedFactCount}
                    usedEvidence={usedEvidence}
                    groundingWarnings={groundingWarnings}
                    groundingReasons={groundingReasons}
                    sections={sections}
                    activeId={activeId}
                    onJump={handleJump}
                    freshnessLabel={freshnessLabel}
                />
                )}

                <div className="r3-body min-w-0 p-4 sm:p-6">
                    {/* 근거 투명성 칩: AI 환각이 아닌 실데이터 기반임을 첫 시선 위치에서 신호 */}
                    {showEvidenceChip && (
                        <span
                            data-testid="coach-evidence-chip"
                            className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${evidenceChipTone}`}
                        >
                            <PredictionCheckCircleIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                            {evidenceCount > 0 ? `${evidenceCount}개 실데이터 근거` : '실데이터 근거'}
                            {dataQualityLabel && <span className="opacity-70">· {dataQualityLabel}</span>}
                        </span>
                    )}

                    {/* A2: 핵심 결론 한 줄 — 첫 시선 집중 */}
                    <p className={`mb-4 break-keep text-[17px] font-black leading-snug tracking-[-0.01em] sm:text-[19px] ${
                        isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                    }`}>
                        {analysisData.dashboard.headline}
                    </p>

                    {isMobileSheet && (
                        <div className="mb-3">
                            <SectionHeading
                                icon={PredictionBarChartIcon}
                                title="팀 비교"
                                subtitle="승률과 핵심 매치업"
                            />
                        </div>
                    )}

                    <C1VersusHero
                        analysisData={analysisData}
                        homeTeamId={homeTeamId}
                        awayTeamId={awayTeamId}
                        winProbabilityHome={safeWinProbabilityHome}
                    />

                    {/* A2: 균일 리듬 → 1차 섹션 사이 큰 여백(mt-9)으로 그룹 경계 강화 */}
                    <section id={SEC.verdict} data-testid="coach-section-verdict" aria-label="코치 판단" className="mt-9 scroll-mt-4 space-y-3">
                        <SectionHeading
                            icon={isPositive ? PredictionTrophyIcon : PredictionCrosshairIcon}
                            title="코치 판단"
                            subtitle={isReviewMode ? 'AI 코치 메모 · 경기 리뷰' : 'AI 코치 메모 · 경기 전 분석'}
                        />
                        <CoachVerdictMemo
                            verdict={verdictText}
                            isReviewMode={isReviewMode}
                            isFallback={isFallbackVerdict}
                        />
                    </section>

                    {isMobileSheet && (
                        <section id={SEC.risks} data-testid="coach-section-risks" aria-label="리스크 관리" className="mt-9 scroll-mt-4 space-y-3">
                            <SectionHeading
                                icon={PredictionWarningTriangleIcon}
                                title="리스크 관리"
                                subtitle={hasRisks
                                    ? `${analysisData.risks.length}건 · 회차 분포 + 영향 방향`
                                    : (isReviewMode ? '두드러진 리스크 없음' : '식별된 주요 리스크 없음')}
                                tone="risk"
                            />
                            {hasRisks ? (
                                <>
                                    <RiskTimeline risks={analysisData.risks} isPositive={isPositive} />
                                    <RiskVersus
                                        risks={analysisData.risks}
                                        isPositive={isPositive}
                                        homeTeamId={homeTeamId}
                                        awayTeamId={awayTeamId}
                                    />
                                </>
                            ) : (
                                <RiskEmptyState isReviewMode={isReviewMode} />
                            )}
                        </section>
                    )}

                    {insights.length > 0 && (
                        <section id={SEC.insights} data-testid="coach-section-insights" aria-label="인사이트" className="mt-9 scroll-mt-4 space-y-3">
                            <SectionHeading
                                icon={PredictionBarChartIcon}
                                title="인사이트"
                                subtitle={`${insights.length}개 항목 · 판단 근거와 관전 포인트`}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                {insights.map(({ id, icon, title, items, tone }) => (
                                    <InsightCard key={id} icon={icon} title={title} items={items} tone={tone} />
                                ))}
                            </div>
                        </section>
                    )}

                    {!isMobileSheet && (
                    <section id={SEC.risks} data-testid="coach-section-risks" aria-label="리스크 관리" className="mt-9 scroll-mt-4 space-y-3">
                        <SectionHeading
                            icon={PredictionWarningTriangleIcon}
                            title="리스크 관리"
                            subtitle={hasRisks
                                ? `${analysisData.risks.length}건 · 회차 분포 + 영향 방향`
                                : (isReviewMode ? '두드러진 리스크 없음' : '식별된 주요 리스크 없음')}
                            tone="risk"
                        />
                        {hasRisks ? (
                            <>
                                <RiskTimeline risks={analysisData.risks} isPositive={isPositive} />
                                <RiskVersus
                                    risks={analysisData.risks}
                                    isPositive={isPositive}
                                    homeTeamId={homeTeamId}
                                    awayTeamId={awayTeamId}
                                />
                            </>
                        ) : (
                            <RiskEmptyState isReviewMode={isReviewMode} />
                        )}
                    </section>
                    )}

                    {hasDetailedReport && (
                        <section id={SEC.detail} data-testid="coach-section-detail" aria-label="상세 리포트" className="mt-9 scroll-mt-4">
                            {/* A2: 길고 밀도 높은 원문은 기본 접기 — 첫 스캔 부담 제거 */}
                            <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-[15px] font-extrabold text-slate-950 dark:text-white">
                                    <PredictionBarChartIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-300" />
                                    <span className="flex-1">상세 리포트</span>
                                    <span className="text-[12.5px] font-bold text-slate-500 dark:text-white group-open:hidden">원문 분석 보기</span>
                                    <span className="hidden text-[12.5px] font-bold text-slate-500 dark:text-white group-open:inline">접기</span>
                                </summary>
                                <div className="space-y-4 px-5 pb-5 pt-1">
                                    {analysisData.detailed_analysis && (
                                        <CoachMarkdown>{analysisData.detailed_analysis}</CoachMarkdown>
                                    )}
                                    {analysisData.coach_note && (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                                            <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-slate-950 dark:text-white">
                                                <PredictionCheckCircleIcon aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                                코치의 한마디
                                            </div>
                                            <CoachMarkdown>{analysisData.coach_note}</CoachMarkdown>
                                        </div>
                                    )}
                                </div>
                            </details>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
