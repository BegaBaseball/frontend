import { lazy, Suspense, useMemo } from 'react';
import { Button } from './ui/button';

import {
    type CoachAnalyzeResponse,
    type CoachAnalysisData,
    type CoachDataQuality,
    type CoachMetric,
    type CoachRiskItem,
    type DashboardStat,
} from '../api/coach';
import {
    COACH_BRIEFING_DISPLAY_MESSAGE,
    COACH_BRIEFING_MANUAL_HINT,
    getCoachAnalysisFocusSectionNotice,
    getCoachBriefingDataQualityNotice,
    normalizeCoachBriefing,
    resolveCoachAnalysisPresentation,
} from '../utils/prediction';
import { MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE } from '../utils/errorUtils';
import {
    normalizeStructuredInlineText,
    normalizeStructuredInsightList,
    normalizeVerdictText,
    sanitizeMarkdown,
} from '../utils/coachAnalysisText';
import { PredictionLoaderIcon } from './prediction/PredictionShellIcons';

const CoachAnalysisResultView = lazy(() => import('./prediction/CoachAnalysisResultView'));

type ParsedCoachAnalysisData = {
    dashboard?: {
        headline?: string;
        context?: string;
        sentiment?: unknown;
        stats?: unknown[];
    };
    metrics?: unknown[];
    detailed_analysis?: unknown;
    coach_note?: unknown;
    analysis_summary?: unknown;
    verdict?: unknown;
    strengths?: unknown[];
    weaknesses?: unknown[];
    risks?: CoachRiskItem[];
    why_it_matters?: unknown[];
    swing_factors?: unknown[];
    watch_points?: unknown[];
    uncertainty?: unknown[];
};

type ParsedStructuredCoachPayload = {
    headline?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    detailed_markdown?: string;
    coach_note?: string;
    analysis?: {
        summary?: string;
        verdict?: string;
        strengths?: string[];
        weaknesses?: string[];
        risks?: CoachRiskItem[];
        why_it_matters?: string[];
        swing_factors?: string[];
        watch_points?: string[];
        uncertainty?: string[];
    };
    key_metrics?: Array<{
        label: string;
        value: string;
        status: 'good' | 'warning' | 'danger';
        trend: 'up' | 'down' | 'neutral';
        is_critical?: boolean;
    }>;
};

const focusLabelMap: Record<string, string> = {
    recent_form: '최근 전력',
    bullpen: '불펜 상태',
    starter: '선발 투수',
    matchup: '상대 전적',
    batting: '타격 생산성',
};

const focusOrder = ['recent_form', 'bullpen', 'starter', 'matchup', 'batting'];

const getCoachDataQualityLabel = (value?: CoachDataQuality): string => {
    switch (value) {
        case 'grounded':
            return '실데이터 기반';
        case 'partial':
            return '실데이터 일부 기반';
        case 'insufficient':
            return '데이터 부족';
        default:
            return '근거 확인 중';
    }
};

const normalizeFocus = (values: string[]) => {
    const seen = new Set<string>();
    return values
        .map((value) => String(value || '').trim().toLowerCase())
        .filter((value) => {
            if (!focusOrder.includes(value)) return false;
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        })
        .sort((a, b) => focusOrder.indexOf(a) - focusOrder.indexOf(b));
};

const normalizeLegacyTextBlock = (
    value: string,
    fallbackMessage = COACH_BRIEFING_DISPLAY_MESSAGE,
) => normalizeCoachBriefing(
    { message: value || '' },
    {
        fallbackTitle: 'AI 코치 상세 분석',
        fallbackMessage,
        fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
    },
).displayText;

const deriveMetricCategory = (label: string): string => {
    if (label.includes('선발')) return '선발';
    if (label.includes('불펜')) return '불펜';
    if (label.includes('OPS') || label.includes('타격')) return '타격';
    if (label.includes('최근')) return '흐름';
    if (label.includes('시리즈') || label.includes('전적')) return '매치업';
    return '핵심지표';
};

const extractMetricNumbers = (value: string): number[] => {
    const matches = value.match(/-?\d+(?:\.\d+)?/g);
    if (!matches) {
        return [];
    }
    return matches
        .map((token) => Number(token))
        .filter((token) => Number.isFinite(token));
};

const describeMetric = (label: string, value: string): string => {
    if (!value) {
        return '';
    }

    const numbers = extractMetricNumbers(value);
    if (label.includes('OPS') && numbers.length >= 2) {
        return `두 팀 OPS 차이 ${Math.abs(numbers[0] - numbers[1]).toFixed(3)}. 장타 생산성 차이를 먼저 봐야 합니다.`;
    }
    if (label.includes('불펜') && numbers.length >= 2) {
        return `두 팀 불펜 비중 차이 ${Math.abs(numbers[0] - numbers[1]).toFixed(1)}%p. 후반 운영 여력 차이로 이어질 수 있습니다.`;
    }
    if (label.includes('최근 흐름')) {
        return '최근 승패와 득실 흐름을 함께 보는 비교 항목입니다.';
    }
    if (label.includes('발표 선발')) {
        return '공식 발표된 선발 매치업 기준입니다. 초반 3이닝 흐름 해석에 직접 연결됩니다.';
    }
    if (label.includes('시리즈') || label.includes('전적')) {
        return '누적 맞대결 또는 시리즈 흐름 기준의 비교 항목입니다.';
    }
    return '확인된 수치를 경기 운영 의미로 연결한 핵심 비교 지표입니다.';
};

const normalizeMetricRisk = (riskLevel?: number): CoachMetric['risk_level'] => {
    if (riskLevel === 0 || riskLevel === 1 || riskLevel === 2) {
        return riskLevel;
    }
    return 2;
};

const normalizeMetricTrend = (trend?: string): CoachMetric['trend'] => {
    if (trend === 'up' || trend === 'down') {
        return trend;
    }
    return 'neutral';
};

const normalizeRiskItems = (risks?: Array<unknown> | null): CoachRiskItem[] => {
    if (!Array.isArray(risks)) {
        return [];
    }

    const resolved: CoachRiskItem[] = [];

    risks.forEach((risk) => {
        if (!risk || typeof risk !== 'object') {
            return;
        }

        const source = risk as Record<string, unknown>;
        const area = typeof source.area === 'string' ? source.area.trim() : '';
        const description = typeof source.description === 'string' ? source.description.trim() : '';
        const candidate = Number(source.level);
        const level = (Number.isInteger(candidate) && candidate >= 0 && candidate <= 2)
            ? (candidate as 0 | 1 | 2)
            : 1;

        if (!area || !description) {
            return;
        }

        resolved.push({
            area,
            description,
            level,
        });
    });

    return resolved;
};

const parseStructuredCoachPayload = (raw: string): ParsedStructuredCoachPayload | null => {
    try {
        const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        return parsed as ParsedStructuredCoachPayload;
    } catch {
        return null;
    }
};

const resolvePreferredText = (primary?: string, secondary?: string): string | undefined => {
    const primaryValue = typeof primary === 'string' ? primary.trim() : '';
    const secondaryValue = typeof secondary === 'string' ? secondary.trim() : '';
    if (!secondaryValue) {
        return primaryValue || undefined;
    }
    if (!primaryValue) {
        return secondaryValue;
    }
    return secondaryValue.length > primaryValue.length ? secondaryValue : primaryValue;
};

const resolvePreferredList = <T,>(primary?: T[], secondary?: T[]): T[] | undefined => {
    if (Array.isArray(secondary) && secondary.length > 0) {
        return secondary;
    }
    if (Array.isArray(primary) && primary.length > 0) {
        return primary;
    }
    return undefined;
};

const mergeStructuredCoachPayload = (
    primary: CoachAnalyzeResponse['structuredData'],
    fallback?: ParsedStructuredCoachPayload | null,
): ParsedStructuredCoachPayload | null => {
    if (!primary) {
        return fallback || null;
    }
    if (!fallback) {
        return primary;
    }

    return {
        headline: resolvePreferredText(primary.headline, fallback.headline),
        sentiment: fallback.sentiment || primary.sentiment,
        detailed_markdown: resolvePreferredText(primary.detailed_markdown, fallback.detailed_markdown),
        coach_note: resolvePreferredText(primary.coach_note, fallback.coach_note),
        key_metrics: resolvePreferredList(primary.key_metrics, fallback.key_metrics),
        analysis: {
            summary: resolvePreferredText(primary.analysis?.summary, fallback.analysis?.summary),
            verdict: resolvePreferredText(primary.analysis?.verdict, fallback.analysis?.verdict),
            strengths: resolvePreferredList(primary.analysis?.strengths, fallback.analysis?.strengths) || [],
            weaknesses: resolvePreferredList(primary.analysis?.weaknesses, fallback.analysis?.weaknesses) || [],
            risks: resolvePreferredList(primary.analysis?.risks, fallback.analysis?.risks) || [],
            why_it_matters: resolvePreferredList(primary.analysis?.why_it_matters, fallback.analysis?.why_it_matters),
            swing_factors: resolvePreferredList(primary.analysis?.swing_factors, fallback.analysis?.swing_factors),
            watch_points: resolvePreferredList(primary.analysis?.watch_points, fallback.analysis?.watch_points),
            uncertainty: resolvePreferredList(primary.analysis?.uncertainty, fallback.analysis?.uncertainty),
        },
    };
};

const normalizeSentiment = (value?: string): CoachAnalysisData['dashboard']['sentiment'] => {
    if (value === 'positive' || value === 'negative' || value === 'neutral') {
        return value;
    }
    return 'neutral';
};

export const getAnalysisData = ({
    result,
    isPastGame,
    isFutureGame,
    gameStatusBucket,
}: {
    result: CoachAnalyzeResponse | null;
    isPastGame: boolean;
    isFutureGame: boolean;
    gameStatusBucket?: string | null;
}): CoachAnalysisData | null => {
    if (result?.manual_data_request) {
        return null;
    }

    const presentation = resolveCoachAnalysisPresentation({
        isPastGame,
        isFutureGame,
        gameStatusBucket: result?.game_status_bucket ?? gameStatusBucket,
    });
    const isReviewMode = presentation.mode === 'review';
    const defaultAnalysisTitle = presentation.title;
    const defaultAnalysisMessage = isReviewMode
        ? '실데이터를 바탕으로 경기 결과를 복기한 리포트입니다.'
        : presentation.mode === 'prediction'
            ? '실데이터를 바탕으로 승부처와 전개 가능성을 전망한 리포트입니다.'
            : '실데이터를 바탕으로 승부처를 해석한 리포트입니다.';

    const normalizeDashboardContext = (headline: string, context: string) => normalizeCoachBriefing(
        {
            title: headline,
            message: context || '',
        },
        {
            fallbackTitle: defaultAnalysisTitle,
            fallbackMessage: defaultAnalysisMessage,
            fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
        },
    );

    const normalizeAnalysisSection = (analysis?: {
        summary?: string;
        verdict?: string;
        strengths?: string[];
        weaknesses?: string[];
        risks?: CoachRiskItem[];
        why_it_matters?: string[];
        swing_factors?: string[];
        watch_points?: string[];
        uncertainty?: string[];
    }) => ({
        summary: normalizeStructuredInlineText(analysis?.summary || '', ''),
        verdict: normalizeVerdictText(analysis?.verdict || '', ''),
        strengths: normalizeStructuredInsightList(analysis?.strengths),
        weaknesses: normalizeStructuredInsightList(analysis?.weaknesses),
        risks: normalizeRiskItems(Array.isArray(analysis?.risks) ? analysis.risks : null),
        why_it_matters: normalizeStructuredInsightList(analysis?.why_it_matters),
        swing_factors: normalizeStructuredInsightList(analysis?.swing_factors),
        watch_points: normalizeStructuredInsightList(analysis?.watch_points),
        uncertainty: normalizeStructuredInsightList(analysis?.uncertainty),
    });

    const mapStructuredMetrics = (metrics?: Array<{
        label: string;
        value: string;
        status: 'good' | 'warning' | 'danger';
        trend: 'up' | 'down' | 'neutral';
        is_critical: boolean;
    }>) => ({
        stats: (metrics?.map((metric) => ({
            label: metric.label,
            value: metric.value,
            status: metric.status,
            trend: metric.trend,
            is_critical: metric.is_critical,
        })) || []) as DashboardStat[],
        metricCards: (metrics?.map((metric) => ({
            category: deriveMetricCategory(metric.label),
            name: metric.label,
            value: metric.value,
            description: describeMetric(metric.label, metric.value),
            risk_level: (metric.status === 'danger' ? 0 : metric.status === 'warning' ? 1 : 2) as 0 | 1 | 2,
            trend: metric.trend,
        })) || []) as CoachMetric[],
    });

    const buildAnalysisData = ({
        headline,
        sentiment,
        keyMetrics,
        analysis,
        detailedMarkdown,
        coachNote,
    }: {
        headline: string;
        sentiment?: 'positive' | 'negative' | 'neutral';
        keyMetrics?: Array<{
            label: string;
            value: string;
            status: 'good' | 'warning' | 'danger';
            trend: 'up' | 'down' | 'neutral';
            is_critical: boolean;
        }>;
        analysis?: {
            summary?: string;
            verdict?: string;
            strengths?: string[];
            weaknesses?: string[];
            risks?: CoachRiskItem[];
            why_it_matters?: string[];
            swing_factors?: string[];
            watch_points?: string[];
            uncertainty?: string[];
        };
        detailedMarkdown?: string;
        coachNote?: string;
    }): CoachAnalysisData => {
        const normalizedAnalysis = normalizeAnalysisSection(analysis);
        const mappedMetrics = mapStructuredMetrics(keyMetrics);
        const normalizedHeadline = normalizeStructuredInlineText(
            headline || '',
            defaultAnalysisTitle,
        );
        const normalizedContext = normalizeStructuredInlineText(
            normalizedAnalysis.summary
                || normalizedAnalysis.verdict
                || detailedMarkdown
                || coachNote
                || '',
            defaultAnalysisMessage,
        );

        return {
            dashboard: {
                headline: normalizedHeadline,
                context: normalizedContext,
                sentiment: normalizeSentiment(sentiment),
                stats: mappedMetrics.stats,
            },
            metrics: mappedMetrics.metricCards,
            detailed_analysis: sanitizeMarkdown(detailedMarkdown || ''),
            coach_note: sanitizeMarkdown(
                coachNote || '',
                '코치 노트가 제공되지 않았습니다.',
            ),
            // 구조화 분석 미제공 시 detailed_markdown 첫 비-헤딩 줄에서 파생
            analysis_summary: normalizedAnalysis.summary || normalizedAnalysis.verdict,
            verdict: normalizedAnalysis.verdict
                || normalizedAnalysis.summary
                || normalizeStructuredInlineText(
                    (detailedMarkdown || '')
                        .split('\n')
                        .find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('-'))
                    ?? '',
                    '',
                ),
            strengths: normalizedAnalysis.strengths,
            weaknesses: normalizedAnalysis.weaknesses,
            risks: normalizedAnalysis.risks,
            why_it_matters: normalizedAnalysis.why_it_matters,
            swing_factors: normalizedAnalysis.swing_factors,
            watch_points: normalizedAnalysis.watch_points,
            uncertainty: normalizedAnalysis.uncertainty,
            game_status_bucket: result?.game_status_bucket,
        };
    };

    const normalizeCoachAnalysisData = (data?: ParsedCoachAnalysisData): CoachAnalysisData => ({
        dashboard: {
            headline: normalizeStructuredInlineText(
                typeof data?.dashboard?.headline === 'string' ? data.dashboard.headline : '',
                defaultAnalysisTitle,
            ),
            context: normalizeStructuredInlineText(
                typeof data?.dashboard?.context === 'string' ? data.dashboard.context : '',
                defaultAnalysisMessage,
            ),
            sentiment: normalizeSentiment(
                typeof data?.dashboard?.sentiment === 'string'
                    ? data.dashboard.sentiment
                    : undefined,
            ),
            stats: (Array.isArray(data?.dashboard?.stats)
                ? data.dashboard.stats
                    .map((stat) => {
                        const value = stat as {
                            label?: string;
                            value?: string;
                            status?: string;
                            trend?: 'up' | 'down' | 'neutral';
                            is_critical?: boolean;
                        };
                        return {
                            label: typeof value?.label === 'string' ? value.label : '',
                            value: typeof value?.value === 'string' ? value.value : '',
                            status: value?.status ?? 'neutral',
                            trend: value?.trend === 'up' || value?.trend === 'down' || value?.trend === 'neutral'
                                ? value.trend
                                : 'neutral',
                            is_critical: Boolean(value?.is_critical),
                        } as DashboardStat;
                    })
                : []
            ),
        },
        metrics: (Array.isArray(data?.metrics) ? data.metrics : []).map((metric) => {
            const safeMetric = metric as {
                category?: string;
                name?: string;
                value?: string;
                description?: string;
                risk_level?: number;
                trend?: string;
            };
            return ({
                category: typeof safeMetric.category === 'string'
                    ? safeMetric.category
                    : deriveMetricCategory(typeof safeMetric.name === 'string' ? safeMetric.name : ''),
                description: typeof safeMetric.description === 'string'
                    ? safeMetric.description
                    : describeMetric(
                        typeof safeMetric.name === 'string' ? safeMetric.name : '',
                        typeof safeMetric.value === 'string' ? safeMetric.value : '',
                    ),
                name: typeof safeMetric.name === 'string' ? safeMetric.name : '',
                value: typeof safeMetric.value === 'string' ? safeMetric.value : '',
                risk_level: normalizeMetricRisk(typeof safeMetric.risk_level === 'number' ? safeMetric.risk_level : undefined),
                trend: normalizeMetricTrend(typeof safeMetric.trend === 'string' ? safeMetric.trend : undefined),
            });
        }),
        analysis_summary: normalizeStructuredInlineText(typeof data?.analysis_summary === 'string' ? data.analysis_summary : '', ''),
        verdict: normalizeVerdictText(typeof data?.verdict === 'string' ? data.verdict : '', ''),
        strengths: normalizeStructuredInsightList(data?.strengths),
        weaknesses: normalizeStructuredInsightList(data?.weaknesses),
        risks: normalizeRiskItems(Array.isArray(data?.risks) ? data.risks : null),
        why_it_matters: normalizeStructuredInsightList(data?.why_it_matters),
        swing_factors: normalizeStructuredInsightList(data?.swing_factors),
        watch_points: normalizeStructuredInsightList(data?.watch_points),
        uncertainty: normalizeStructuredInsightList(data?.uncertainty),
        detailed_analysis: sanitizeMarkdown(
            typeof data?.detailed_analysis === 'string' ? data.detailed_analysis : '',
            COACH_BRIEFING_DISPLAY_MESSAGE,
        ),
        coach_note: sanitizeMarkdown(
            typeof data?.coach_note === 'string' ? data.coach_note : '',
            '기존 형식의 코치 노트가 없습니다.',
        ),
        game_status_bucket: result?.game_status_bucket,
    });

    if (result?.data) {
        return normalizeCoachAnalysisData(result.data);
    }

    if (result?.structuredData) {
        const rawPayload = parseStructuredCoachPayload(result.raw_answer || result.answer || '');
        const structured = mergeStructuredCoachPayload(result.structuredData, rawPayload);
        if (!structured) {
            return null;
        }
        return buildAnalysisData({
            headline: structured.headline || defaultAnalysisTitle,
            sentiment: normalizeSentiment(structured.sentiment),
            keyMetrics: (structured.key_metrics ?? []).map((metric) => ({
                ...metric,
                is_critical: Boolean(metric.is_critical),
            })),
            analysis: structured.analysis,
            detailedMarkdown: structured.detailed_markdown,
            coachNote: structured.coach_note,
        });
    }

    if (!result?.raw_answer && !result?.answer) return null;

    const raw = result.raw_answer || result.answer || '';

    try {
        const parsedPayload = parseStructuredCoachPayload(raw);
        if (parsedPayload && parsedPayload.headline) {
            return buildAnalysisData({
                headline: parsedPayload.headline || defaultAnalysisTitle,
                sentiment: normalizeSentiment(parsedPayload.sentiment),
                keyMetrics: parsedPayload.key_metrics?.map((metric) => ({
                    ...metric,
                    is_critical: Boolean(metric.is_critical),
                })),
                analysis: parsedPayload.analysis,
                detailedMarkdown: parsedPayload.detailed_markdown,
                coachNote: parsedPayload.coach_note,
            });
        }

        if (parsedPayload && 'dashboard' in (parsedPayload as ParsedCoachAnalysisData)) {
            return normalizeCoachAnalysisData(parsedPayload as ParsedCoachAnalysisData);
        }
    } catch (error) {
        console.warn('Fallback JSON parse failed', error);
    }

    const rawHeadline = raw.match(/### (.*)/)?.[1] || 'AI 분석 리포트';
    const contextFallback = raw.match(/## 🔍 AI 시즌 요약\n([\s\S]*?)\n\n/)?.[1]?.trim()
        || '데이터를 기반으로 분석된 팀 상태입니다.';
    const normalizedContext = normalizeDashboardContext(rawHeadline, contextFallback);

    return {
        dashboard: {
            headline: normalizedContext.title,
            context: normalizedContext.displayText,
            sentiment: normalizeSentiment((raw.includes('🚨') || raw.includes('▼')) ? 'negative' : 'positive'),
            stats: [] as DashboardStat[],
        },
        metrics: [] as CoachMetric[],
        detailed_analysis: normalizeLegacyTextBlock(raw),
        coach_note: normalizeLegacyTextBlock(
            '기존 형식의 데이터가 감지되었습니다. 상세 리포트를 참고해주세요.',
            '기존 형식의 데이터가 감지되었습니다. 상세 리포트를 참고해주세요.',
        ),
        analysis_summary: '',
        verdict: '',
        strengths: [],
        weaknesses: [],
        risks: [],
        why_it_matters: [],
        swing_factors: [],
        watch_points: [],
        uncertainty: [],
    };
};

interface CoachAnalysisDialogResultRuntimeProps {
    loading: boolean;
    analysisStep: string;
    result: CoachAnalyzeResponse | null;
    selectedFocus: string[];
    isPastGame: boolean;
    isFutureGame: boolean;
    gameStatusBucket?: string | null;
    errorAction: 'login' | null;
    onLoginAction: () => void;
    loadingFallbackMessage: string;
    homeTeamId?: string;
    awayTeamId?: string;
}

export default function CoachAnalysisDialogResultRuntime({
    loading,
    analysisStep,
    result,
    selectedFocus,
    isPastGame,
    isFutureGame,
    gameStatusBucket,
    errorAction,
    onLoginAction,
    loadingFallbackMessage,
    homeTeamId,
    awayTeamId,
}: CoachAnalysisDialogResultRuntimeProps) {
    const analysisData = useMemo(
        () => getAnalysisData({ result, isPastGame, isFutureGame, gameStatusBucket }),
        [gameStatusBucket, isFutureGame, isPastGame, result],
    );
    const analysisDataQualityNotice = useMemo(
        () => (
            result?.manual_data_request
                ? {
                    message: MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
                    reasons: [],
                    details: [],
                }
                : getCoachBriefingDataQualityNotice(
                    result?.data_quality,
                    result?.grounding_reasons,
                    result?.grounding_warnings,
                )
        ),
        [
            result?.data_quality,
            result?.grounding_reasons,
            result?.grounding_warnings,
            result?.manual_data_request,
        ],
    );
    const analysisDataQualityLabel = useMemo(
        () => getCoachDataQualityLabel(result?.data_quality),
        [result?.data_quality],
    );
    const focusSectionNotice = useMemo(
        () => getCoachAnalysisFocusSectionNotice(result?.missing_focus_sections),
        [result?.missing_focus_sections],
    );
    const selectedFocusNormalized = useMemo(
        () => normalizeFocus(selectedFocus),
        [selectedFocus],
    );
    const resolvedFocus = useMemo(
        () => normalizeFocus(result?.resolved_focus || []),
        [result?.resolved_focus],
    );
    const hasFocusMeta = typeof result?.focus_signature === 'string';
    const focusMismatch = hasFocusMeta
        && selectedFocusNormalized.join('+') !== resolvedFocus.join('+');

    return (
        <>
            {loading && !analysisData && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-[16px] text-primary dark:border-primary/40 dark:bg-primary/10 flex items-center gap-2">
                        <PredictionLoaderIcon className="h-4 w-4 animate-spin shrink-0 text-primary" />
                        <span>{analysisStep || loadingFallbackMessage}</span>
                    </div>
                    {!result && (
                        <div className="space-y-3 px-1">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-4 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
                                    style={{ width: `${95 - i * 12}%` }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {hasFocusMeta && (
                <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/70 dark:bg-emerald-950/10 p-4 space-y-2">
                    <p className="text-[16px] font-semibold text-emerald-700 dark:text-emerald-300">
                        이번 분석 기준 focus
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {resolvedFocus.length > 0 ? (
                            resolvedFocus.map((focusId) => (
                                <span
                                    key={focusId}
                                className="inline-flex items-center rounded-full border border-emerald-300/60 dark:border-emerald-700/40 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-[16px] font-semibold text-emerald-700 dark:text-emerald-200"
                                >
                                    {focusLabelMap[focusId] || focusId}
                                </span>
                            ))
                        ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-300/60 dark:border-emerald-700/40 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-[16px] font-semibold text-emerald-700 dark:text-emerald-200">
                                종합 분석
                            </span>
                        )}
                    </div>
                    {focusMismatch && (
                        <p className="text-[16px] text-amber-700 dark:text-amber-300 font-semibold">
                            선택한 focus와 실제 적용된 focus가 달라 일부 항목이 자동으로 제외되었습니다.
                        </p>
                    )}
                    {result?.focus_section_missing && (
                        <p className="text-[16px] text-amber-700 dark:text-amber-300 font-semibold">
                            {focusSectionNotice || '일부 focus 섹션이 누락되어 다음 재생성에서 보강될 수 있습니다.'}
                        </p>
                    )}
                </div>
            )}

            {analysisDataQualityNotice && (
                <div
                    data-testid="coach-analysis-data-quality-note"
                    className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-100"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            data-testid="coach-analysis-data-quality-badge"
                            className="inline-flex items-center rounded-full border border-amber-300/70 bg-white/80 px-2.5 py-1 text-[16px] font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100"
                        >
                            {analysisDataQualityLabel}
                        </span>
                        <p className="text-[16px] font-semibold">
                            {analysisDataQualityNotice.message}
                        </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {analysisDataQualityNotice.reasons.map((reason) => (
                            <span
                                key={reason}
                                data-testid="coach-analysis-grounding-reason"
                                className="inline-flex items-center rounded-full border border-amber-300/70 bg-white/80 px-2.5 py-1 text-[16px] font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100"
                            >
                                {reason}
                            </span>
                        ))}
                    </div>
                    {analysisDataQualityNotice.details.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {analysisDataQualityNotice.details.map((detail) => (
                                <p
                                    key={detail}
                                    data-testid="coach-analysis-grounding-detail"
                                    className="text-[16px] font-semibold leading-relaxed text-amber-800/90 dark:text-amber-100/90"
                                >
                                    {detail}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {analysisData && (
                <Suspense fallback={null}>
                    <CoachAnalysisResultView
                        analysisData={analysisData}
                        homeTeamId={homeTeamId}
                        awayTeamId={awayTeamId}
                    />
                </Suspense>
            )}

            {result?.error && !analysisData && (
                <div className="rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 p-4">
                    <p className="text-[16px] font-semibold text-red-700 dark:text-red-300">
                        {result.error}
                    </p>
                    {errorAction === 'login' && (
                        <Button
                            type="button"
                            variant="outline"
                            data-testid="coach-analysis-login-cta"
                            className="mt-3 border-red-300/70 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/40"
                            onClick={onLoginAction}
                        >
                            로그인하기
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}
