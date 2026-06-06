import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import ErrorBoundary from './common/ErrorBoundary';

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
        const inningLabel = typeof source.inning_label === 'string' ? source.inning_label.trim() : '';
        const impact = typeof source.impact === 'string' ? source.impact.trim() : '';
        const impactToRaw = typeof source.impact_to === 'string' ? source.impact_to.trim().toLowerCase() : '';
        const impactTo = impactToRaw === 'home' || impactToRaw === 'away' || impactToRaw === 'both'
            ? impactToRaw
            : undefined;
        const inningStartRaw = Number(source.inning_start);
        const inningEndRaw = Number(source.inning_end);
        const inningStart = Number.isInteger(inningStartRaw) && inningStartRaw >= 1 && inningStartRaw <= 12
            ? inningStartRaw
            : undefined;
        const inningEnd = Number.isInteger(inningEndRaw) && inningEndRaw >= 1 && inningEndRaw <= 12
            ? inningEndRaw
            : undefined;
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
            inning_label: inningLabel || undefined,
            inning_start: inningStart,
            inning_end: inningEnd,
            impact: impact || undefined,
            impact_to: impactTo,
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
    if (result?.error || result?.manual_data_request) {
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
    isPastGame: boolean;
    isFutureGame: boolean;
    gameStatusBucket?: string | null;
    errorAction: 'login' | null;
    onLoginAction: () => void;
    onRetry?: () => void;
    loadingFallbackMessage: string;
    homeTeamId?: string;
    awayTeamId?: string;
    initialWinProbabilityHome?: number | null;
    initialDataQuality?: CoachDataQuality;
    initialSupportedFactCount?: number;
    initialUsedEvidence?: string[];
    initialGroundingWarnings?: string[];
    initialGroundingReasons?: string[];
    initialFreshnessLabel?: string | null;
}

function CoachAnalysisResultViewLoadFailureFallback({
    onRetry,
    onReload,
}: {
    onRetry: () => void;
    onReload: () => void;
}) {
    return (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="mb-3 text-[16px] font-bold">
                코치 분석 뷰를 불러오지 못했습니다.
            </p>
            <p className="mb-4 text-[15px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                일시적인 번들 로딩 이슈 또는 네트워크 오류일 수 있습니다.
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    onClick={onRetry}
                    variant="outline"
                    className="border-amber-300/80 text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:text-amber-100 dark:hover:bg-amber-900/40"
                >
                    다시 시도
                </Button>
                <Button
                    type="button"
                    onClick={onReload}
                    variant="outline"
                    className="border-amber-300/80 text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:text-amber-100 dark:hover:bg-amber-900/40"
                >
                    페이지 새로고침
                </Button>
            </div>
        </div>
    );
}

export default function CoachAnalysisDialogResultRuntime({
    loading,
    analysisStep,
    result,
    isPastGame,
    isFutureGame,
    gameStatusBucket,
    errorAction,
    onLoginAction,
    onRetry,
    loadingFallbackMessage,
    homeTeamId,
    awayTeamId,
    initialWinProbabilityHome = null,
    initialDataQuality,
    initialSupportedFactCount,
    initialUsedEvidence,
    initialGroundingWarnings,
    initialGroundingReasons,
    initialFreshnessLabel,
}: CoachAnalysisDialogResultRuntimeProps) {
    const [resultViewRetryKey, setResultViewRetryKey] = useState(0);
    const resultBoundaryToken = useMemo(
        () => [
            result?.cache_key_version ?? '',
            result?.question_signature ?? '',
            result?.focus_signature ?? '',
            result?.game_status_bucket ?? '',
            result?.request_mode ?? '',
            result?.win_probability_home ?? '',
            homeTeamId ?? '',
            awayTeamId ?? '',
        ].join('|'),
        [
            awayTeamId,
            homeTeamId,
            result?.cache_key_version,
            result?.focus_signature,
            result?.game_status_bucket,
            result?.question_signature,
            result?.request_mode,
            result?.win_probability_home,
        ],
    );
    const analysisData = useMemo(
        () => getAnalysisData({ result, isPastGame, isFutureGame, gameStatusBucket }),
        [gameStatusBucket, isFutureGame, isPastGame, result],
    );
    useEffect(() => {
        setResultViewRetryKey(0);
    }, [resultBoundaryToken]);
    const analysisDataQualityNotice = useMemo(
        () => (
            result?.error
                ? null
                : result?.manual_data_request
                ? {
                    message: MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
                    reasons: [],
                    details: [],
                }
                : getCoachBriefingDataQualityNotice(
                    result?.data_quality ?? initialDataQuality,
                    result?.grounding_reasons ?? initialGroundingReasons,
                    result?.grounding_warnings ?? initialGroundingWarnings,
                )
        ),
        [
            result?.data_quality,
            result?.error,
            result?.grounding_reasons,
            result?.grounding_warnings,
            result?.manual_data_request,
            initialDataQuality,
            initialGroundingReasons,
            initialGroundingWarnings,
        ],
    );
    const analysisDataQualityLabel = useMemo(
        () => getCoachDataQualityLabel(result?.data_quality ?? initialDataQuality),
        [initialDataQuality, result?.data_quality],
    );

    return (
        <>
            {loading && !analysisData && (
                <div className="p-6">
                    <div className="rounded-[20px] border border-[#e5e7eb] bg-[#f7fafc] p-6 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-3 text-[#2d5f4f] dark:text-emerald-200">
                            <PredictionLoaderIcon className="h-5 w-5 animate-spin shrink-0" />
                            <span className="text-[15px] font-extrabold">{analysisStep || loadingFallbackMessage}</span>
                        </div>
                        <p className="mt-2 break-keep text-[13px] font-bold leading-relaxed text-[#64748b] dark:text-slate-400">
                            응답을 C1 코치 리포트 구조로 정리하고 있습니다.
                        </p>
                    {!result && (
                        <div className="mt-5 space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                                    style={{ width: `${95 - i * 12}%` }}
                                />
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            )}

            {analysisDataQualityNotice && !analysisData && (
                <div
                    data-testid="coach-analysis-data-quality-note"
                    className="m-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            data-testid="coach-analysis-data-quality-badge"
                            className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[12px] font-extrabold text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100"
                        >
                            {analysisDataQualityLabel}
                        </span>
                        <p className="text-[14px] font-bold">
                            {analysisDataQualityNotice.message}
                        </p>
                    </div>
                </div>
            )}

            {analysisData && (
                <ErrorBoundary
                    key={`coach-analysis-result-boundary-${resultBoundaryToken}-${resultViewRetryKey}`}
                    fallback={(
                        <CoachAnalysisResultViewLoadFailureFallback
                            onRetry={() => {
                                setResultViewRetryKey((prev) => prev + 1);
                            }}
                            onReload={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.reload();
                                }
                            }}
                        />
                    )}
                >
                    <Suspense fallback={null}>
                        <CoachAnalysisResultView
                            key={`${resultBoundaryToken}-${resultViewRetryKey}`}
                            analysisData={analysisData}
                            homeTeamId={homeTeamId}
                            awayTeamId={awayTeamId}
                            winProbabilityHome={result?.win_probability_home ?? initialWinProbabilityHome ?? null}
                            dataQualityLabel={analysisDataQualityLabel}
                            dataQualityMessage={analysisDataQualityNotice?.message}
                            supportedFactCount={result?.supported_fact_count ?? initialSupportedFactCount}
                            usedEvidence={result?.used_evidence ?? initialUsedEvidence}
                            groundingWarnings={result?.grounding_warnings ?? initialGroundingWarnings}
                            groundingReasons={result?.grounding_reasons ?? initialGroundingReasons}
                            dataQuality={result?.data_quality ?? initialDataQuality}
                            generationMode={result?.generation_mode}
                            freshnessLabel={result ? '방금 갱신' : initialFreshnessLabel}
                        />
                    </Suspense>
                </ErrorBoundary>
            )}

            {result?.error && !analysisData && (
                <div className="m-6 rounded-[14px] border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="text-[14px] font-bold text-red-700 dark:text-red-300">
                        {result.error}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                    {onRetry && (
                        <Button
                            type="button"
                            variant="outline"
                            data-testid="coach-analysis-retry-cta"
                            className="border-red-300/70 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/40"
                            onClick={onRetry}
                        >
                            다시 시도
                        </Button>
                    )}
                    {errorAction === 'login' && (
                        <Button
                            type="button"
                            variant="outline"
                            data-testid="coach-analysis-login-cta"
                            className="border-red-300/70 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/40"
                            onClick={onLoginAction}
                        >
                            로그인하기
                        </Button>
                    )}
                    </div>
                </div>
            )}
        </>
    );
}
