import { type ComponentType, type SVGProps } from 'react';
import {
    CoachAnalysisData,
    CoachMetric,
    DashboardStat,
} from '../../api/coach';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getTeamColor } from '../../utils/teamColors';
import CoachMarkdown from '../common/CoachMarkdown';
import TeamLogo from '../TeamLogo';
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
import { shortTeamName } from './coachRiskHelpers';

interface CoachAnalysisResultViewProps {
    analysisData: CoachAnalysisData | null;
    homeTeamId?: string;
    awayTeamId?: string;
    winProbabilityHome?: number | null;
    dataQualityLabel?: string;
    dataQualityMessage?: string;
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

function toPercent(value: number): number {
    const pct = value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(pct)));
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
    return (
        <div className="flex items-center gap-3">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                tone === 'risk'
                    ? 'bg-[#fef2f2] text-[#b91c1c] dark:bg-rose-950 dark:text-rose-200'
                    : 'bg-[#f0f9f6] text-[#1b4338] dark:bg-emerald-950 dark:text-emerald-200'
            }`}>
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
                <h4 className="text-[15.5px] font-extrabold leading-tight text-[#0f1419] dark:text-slate-50">
                    {title}
                </h4>
                {subtitle && (
                    <p className="mt-0.5 text-[12.5px] font-bold leading-snug text-[#536471] dark:text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

interface InsightCardProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    items: string[];
    tone?: 'default' | 'warning';
}

function InsightCard({ icon: Icon, title, items, tone = 'default' }: InsightCardProps) {
    if (items.length === 0) return null;
    const isWarn = tone === 'warning';
    const containerCls = isWarn
        ? 'border-[#fde68a] bg-[#fffbeb] dark:border-amber-900/50 dark:bg-amber-950/20'
        : 'border-[#e5e7eb] bg-white dark:border-white/10 dark:bg-white/[0.03]';
    const iconCls = isWarn
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-[#1b4338] dark:text-emerald-300';
    const itemCls = isWarn
        ? 'text-amber-900 dark:text-amber-100'
        : 'text-slate-700 dark:text-slate-300';
    return (
        <div className={`space-y-2.5 rounded-[18px] border px-[18px] py-4 ${containerCls}`}>
            <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${iconCls}`} />
                <h5 className="text-[13.5px] font-extrabold leading-tight text-[#0f1419] dark:text-slate-50">
                    {title}
                </h5>
            </div>
            <ul className="space-y-1.5">
                {items.map((item, idx) => (
                    <li key={`${title}-${idx}`} className={`flex gap-2 text-[13.5px] font-semibold leading-[1.55] ${itemCls}`}>
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                        <span className="min-w-0">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function C1SummaryRail({
    analysisData,
    homeTeamId,
    awayTeamId,
    winProbabilityHome,
    isReviewMode,
    dataQualityLabel,
    dataQualityMessage,
}: {
    analysisData: CoachAnalysisData;
    homeTeamId?: string;
    awayTeamId?: string;
    winProbabilityHome: number | null;
    isReviewMode: boolean;
    dataQualityLabel?: string;
    dataQualityMessage?: string;
}) {
    const hasWinProbability = typeof winProbabilityHome === 'number' && Number.isFinite(winProbabilityHome);
    const homePct = hasWinProbability ? toPercent(winProbabilityHome as number) : null;
    const awayPct = homePct === null ? null : 100 - homePct;
    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';
    const favoredIsHome = homePct !== null ? homePct >= (awayPct ?? 0) : analysisData.dashboard.sentiment !== 'negative';
    const favoredName = favoredIsHome ? homeName : awayName;
    const favoredPct = favoredIsHome ? homePct : awayPct;
    const evidenceCount = analysisData.dashboard.stats.length + analysisData.metrics.length + analysisData.risks.length;
    const metricCount = analysisData.metrics.length;

    return (
        <aside className="r3-side min-w-0 border-b border-[#eef2f0] bg-[#f7fafc] px-[22px] py-6 dark:border-white/10 dark:bg-white/[0.02] sm:sticky sm:top-0 sm:self-start sm:border-b-0 sm:border-r">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    {isReviewMode ? '경기 리뷰' : '예측 결과'}
                </p>
                <p className="mt-2 text-[32px] font-black leading-none text-emerald-700 dark:text-emerald-300">
                    {favoredPct === null ? '--' : favoredPct}
                    {favoredPct !== null && <span className="ml-0.5 text-[17px]">%</span>}
                </p>
                <p className="mt-1 text-[13px] font-extrabold text-slate-950 dark:text-slate-50">
                    {favoredName} {favoredPct === null ? '흐름 분석' : '우세'}
                </p>
            </div>
            {homePct !== null && awayPct !== null && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-1.5 flex justify-between text-[11px] font-extrabold">
                        <span className="flex min-w-0 items-center gap-1 truncate" style={{ color: getTeamColor(homeTeamId) }}>
                            {homeTeamId && <TeamLogo teamId={homeTeamId} size={14} className="!rounded-none !bg-transparent p-0" />}
                            <span className="truncate">{homeName}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1 truncate" style={{ color: getTeamColor(awayTeamId) }}>
                            <span className="truncate">{awayName}</span>
                            {awayTeamId && <TeamLogo teamId={awayTeamId} size={14} className="!rounded-none !bg-transparent p-0" />}
                        </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div style={{ width: `${homePct}%`, background: getTeamColor(homeTeamId) }} />
                        <div style={{ width: `${awayPct}%`, background: getTeamColor(awayTeamId) }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-black">
                        <span style={{ color: getTeamColor(homeTeamId) }}>{homePct}%</span>
                        <span style={{ color: getTeamColor(awayTeamId) }}>{awayPct}%</span>
                    </div>
                </div>
            )}
            <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-slate-400">근거</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{evidenceCount}건</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-slate-400">리스크</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{analysisData.risks.length}건</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-slate-500 dark:text-slate-400">상태</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                        {isReviewMode ? '실경기 기반' : '경기 전'}
                    </span>
                </div>
                {dataQualityLabel && (
                    <div className="flex items-center justify-between text-[13px]">
                        <span className="font-bold text-slate-500 dark:text-slate-400">데이터</span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{dataQualityLabel}</span>
                    </div>
                )}
            </div>
            {dataQualityMessage && (
                <p className="break-keep text-[12px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">
                    {dataQualityMessage}
                </p>
            )}
            <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
            <nav className="space-y-1">
                {[
                    { label: '코치 판단', icon: PredictionTrophyIcon, count: null, active: true },
                    { label: '팀 비교', icon: PredictionBarChartIcon, count: metricCount },
                    { label: '키 매치업', icon: PredictionCrosshairIcon, count: analysisData.dashboard.stats.length },
                    { label: '리스크', icon: PredictionWarningTriangleIcon, count: analysisData.risks.length },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-extrabold ${
                                item.active
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                                    : 'text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.count !== null && (
                                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                    {item.count}
                                </span>
                            )}
                        </div>
                    );
                })}
            </nav>
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
    const isNarrow = useMediaQuery('(max-width: 640px)');
    const hasWinProbability = typeof winProbabilityHome === 'number' && Number.isFinite(winProbabilityHome);
    const homePct = hasWinProbability ? toPercent(winProbabilityHome as number) : null;
    const awayPct = homePct === null ? null : 100 - homePct;
    const favoredIsHome = homePct !== null ? homePct >= (awayPct ?? 0) : analysisData.dashboard.sentiment !== 'negative';
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
        <div className={`flex flex-col gap-4 p-[22px] ${
            isWinner
                ? 'bg-gradient-to-b from-[#ecfdf5] to-white dark:from-emerald-950 dark:to-[#16181c]'
                : 'bg-[#fafafa] dark:bg-black/20'
        }`}>
            <div className="flex items-center gap-2.5 text-[16px] font-black text-[#0f1419] dark:text-slate-100">
                {teamId && <TeamLogo teamId={teamId} size={32} className="!rounded-none !bg-transparent p-0" />}
                <span className="min-w-0 truncate">{name}</span>
            </div>
            <div className="text-[38px] font-black leading-none" style={{ color: isWinner ? '#047857' : '#b91c1c' }}>
                {pct === null ? '--' : pct}
                {pct !== null && <span className="ml-0.5 text-[18px]">%</span>}
            </div>
            {rows.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {rows.slice(0, 2).map((row, idx) => (
                        <span
                            key={`${name}-tag-${row.label}-${idx}`}
                            className={`rounded-full px-2 py-1 text-[11.5px] font-extrabold ${
                                isWinner
                                    ? 'bg-[#ecfdf5] text-[#047857] dark:bg-emerald-900 dark:text-emerald-100'
                                    : 'bg-[#fef2f2] text-[#b91c1c] dark:bg-rose-950 dark:text-rose-100'
                            }`}
                        >
                            {row.label || row.value}
                        </span>
                    ))}
                </div>
            )}
            <div className="h-px bg-[#eff3f4] dark:bg-white/10" />
            <div>
                {(rows.length > 0 ? rows : [{ label: '분석', value: analysisData.dashboard.sentiment, detail: analysisData.dashboard.context, tone: 'neutral' as const }]).map((row, idx) => (
                    <div
                        key={`${name}-row-${row.label}-${idx}`}
                        className="flex items-center justify-between gap-3 border-t border-dashed border-[#e5e7eb] py-2 text-[13px] font-bold first:border-t-0 dark:border-white/10"
                    >
                        <span className="min-w-0 truncate text-[#536471] dark:text-slate-400">{row.label}</span>
                        <span className="shrink-0 text-right text-[#0f1419] dark:text-slate-100" style={{ color: row.tone === 'success' ? '#047857' : row.tone === 'danger' ? '#b91c1c' : undefined }}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <section className="versus grid overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[1fr_64px_1fr]">
            {renderTeamColumn({
                teamId: homeTeamId,
                name: homeName,
                pct: homePct,
                isWinner: favoredIsHome,
                rows: homeRows,
            })}
            <div className="flex items-center justify-center border-y border-[#eef2f0] bg-[#f7f9f9] px-3 py-2 font-serif text-[20px] font-bold italic text-[#536471] dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400 md:border-x md:border-y-0">
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

export default function CoachAnalysisResultView({
    analysisData,
    homeTeamId,
    awayTeamId,
    winProbabilityHome = null,
    dataQualityLabel,
    dataQualityMessage,
}: CoachAnalysisResultViewProps) {
    if (!analysisData) return null;

    const isReviewMode = analysisData.game_status_bucket === 'COMPLETED';
    const isPositive = analysisData.dashboard.sentiment === 'positive';
    const hasDetailedReport = Boolean(analysisData.detailed_analysis) || Boolean(analysisData.coach_note);
    const verdictText = analysisData.verdict || analysisData.analysis_summary || analysisData.dashboard.context;
    const isFallbackVerdict = !analysisData.verdict && !analysisData.analysis_summary;
    const safeWinProbabilityHome = typeof winProbabilityHome === 'number' && Number.isFinite(winProbabilityHome)
        ? winProbabilityHome
        : null;

    const insights: (InsightCardProps & { id: string })[] = [
        { id: 'why',    icon: PredictionBarChartIcon,       title: isReviewMode ? '결과를 가른 이유' : '왜 중요한가',     items: analysisData.why_it_matters },
        { id: 'swing',  icon: PredictionCrosshairIcon,       title: isReviewMode ? '실제 전환점' : '승부 스윙 포인트',     items: analysisData.swing_factors },
        { id: 'watch',  icon: PredictionEyeIcon,             title: isReviewMode ? '다시 볼 장면' : '체크 포인트',         items: analysisData.watch_points },
        { id: 'uncert', icon: PredictionHelpCircleIcon,      title: '불확실성', tone: 'warning' as const,                 items: analysisData.uncertainty },
        { id: 'strong', icon: PredictionCheckCircleIcon,     title: isReviewMode ? '잘 풀린 지점' : '강점 유지 포인트',   items: analysisData.strengths },
        { id: 'weak',   icon: PredictionWarningTriangleIcon, title: isReviewMode ? '흔들린 지점' : '약점 관리 포인트',    items: analysisData.weaknesses },
    ].filter((s) => Array.isArray(s.items) && s.items.length > 0);

    return (
        <div role="article" className="dlg">
            <div className="r3-layout grid min-h-0 sm:grid-cols-[280px_minmax(0,1fr)]">
                <C1SummaryRail
                    analysisData={analysisData}
                    homeTeamId={homeTeamId}
                    awayTeamId={awayTeamId}
                    winProbabilityHome={safeWinProbabilityHome}
                    isReviewMode={isReviewMode}
                    dataQualityLabel={dataQualityLabel}
                    dataQualityMessage={dataQualityMessage}
                />

                <div className="r3-body min-w-0 space-y-[22px] p-6">
                    <C1VersusHero
                        analysisData={analysisData}
                        homeTeamId={homeTeamId}
                        awayTeamId={awayTeamId}
                        winProbabilityHome={safeWinProbabilityHome}
                    />

                    <div className="space-y-3">
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
                    </div>

                    {insights.length > 0 && (
                        <div className="space-y-3">
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
                        </div>
                    )}

                    {analysisData.risks.length > 0 && (
                        <div className="space-y-3">
                            <SectionHeading
                                icon={PredictionWarningTriangleIcon}
                                title="리스크 관리"
                                subtitle={`${analysisData.risks.length}건 · 회차 분포 + 영향 방향`}
                                tone="risk"
                            />
                            <RiskTimeline risks={analysisData.risks} isPositive={isPositive} />
                            <RiskVersus
                                risks={analysisData.risks}
                                isPositive={isPositive}
                                homeTeamId={homeTeamId}
                                awayTeamId={awayTeamId}
                            />
                        </div>
                    )}

                    {hasDetailedReport && (
                        <div className="space-y-4 pt-1">
                            <SectionHeading
                                icon={PredictionBarChartIcon}
                                title="상세 리포트"
                                subtitle="원문 분석과 코치 노트"
                            />
                            {analysisData.detailed_analysis && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950 sm:p-6">
                                    <CoachMarkdown>{analysisData.detailed_analysis}</CoachMarkdown>
                                </div>
                            )}
                            {analysisData.coach_note && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950 sm:p-6">
                                    <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-slate-950 dark:text-slate-50">
                                        <PredictionCheckCircleIcon aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                        코치의 한마디
                                    </div>
                                    <CoachMarkdown>{analysisData.coach_note}</CoachMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
