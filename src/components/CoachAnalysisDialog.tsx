import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import {
    Loader2, Zap, TrendingUp, Users, Shield, BarChart2
} from 'lucide-react';
import {
    analyzeTeam,
    CoachAnalyzeResponse,
    CoachAnalysisData,
    isCoachAnalyzeError,
    CoachMetric,
    CoachRiskItem,
    DashboardStat,
} from '../api/coach';
import { TEAM_LIST, TEAM_NAME_TO_ID, getRandomTeamName, TEAM_DATA } from '../constants/teams';
import TeamLogo from './TeamLogo';
import { motion, AnimatePresence } from 'framer-motion';
import {
    COACH_BRIEFING_DISPLAY_MESSAGE,
    COACH_BRIEFING_MANUAL_HINT,
    normalizeCoachBriefing,
} from '../utils/prediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import CoachAnalysisResultView from './prediction/CoachAnalysisResultView';

const isAbortError = (error: unknown): boolean => {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return true;
    }
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return true;
        }
        const text = error.message.toLowerCase();
        return text.includes('abort') || text.includes('aborted');
    }
    const text = String(error ?? '').toLowerCase();
    return text.includes('aborterror') || text.includes('aborted') || text.includes('abort');
};

const resolveLeagueTypeCode = (
    leagueType?: string,
    stageLabel?: string,
): number | undefined => {
    const normalizedStage = String(stageLabel || '').trim().toUpperCase();
    if (normalizedStage === 'WC') return 2;
    if (normalizedStage === 'SEMI_PO' || normalizedStage === 'DS') return 3;
    if (normalizedStage === 'PO') return 4;
    if (normalizedStage === 'KS') return 5;

    const normalizedLeagueType = String(leagueType || '').trim().toUpperCase();
    if (normalizedLeagueType === 'REGULAR') return 0;
    if (normalizedLeagueType === 'PRE') return 1;
    return undefined;
};

const normalizeTextBlock = (
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

const normalizeInsightList = (values?: unknown[]): string[] => (
    Array.isArray(values)
        ? values
            .map((value) => (typeof value === 'string' ? normalizeTextBlock(value, '') : ''))
            .filter((value) => Boolean(value))
        : []
);

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

const ANALYSIS_LOADING_FALLBACK_MESSAGE = 'AI 코치 분석을 시작합니다.';

// Subcomponents transferred to separate files.

// --- Main Component ---
interface CoachAnalysisDialogProps {
    trigger?: ReactNode;
    initialTeam?: string;
    homeTeamId?: string;
    awayTeamId?: string;
    gameId?: string;
    gameDate?: string;
    seasonId?: number | string;
    leagueType?: string;
    round?: string;
    gameNo?: number;
    homePitcher?: string | null;
    awayPitcher?: string | null;
}

export default function CoachAnalysisDialog({
    trigger,
    initialTeam,
    homeTeamId,
    awayTeamId,
    gameId,
    gameDate,
    seasonId,
    leagueType,
    round,
    gameNo,
    homePitcher,
    awayPitcher,
}: CoachAnalysisDialogProps) {
    const getInitialTeamName = (teamId?: string) => {
        if (!teamId) return getRandomTeamName();
        // Try to match ID to full name from TEAM_DATA
        const data = TEAM_DATA[teamId];
        if (data && data.fullName !== '없음') return data.fullName;
        // Fallback for names that might already be full or short
        return TEAM_LIST.find(t => t.includes(teamId)) || teamId;
    };

    const selectableTeamNames = useMemo(() => {
        if (homeTeamId && awayTeamId) {
            return Array.from(new Set([
                getInitialTeamName(homeTeamId),
                getInitialTeamName(awayTeamId),
            ]));
        }
        return TEAM_LIST.slice(1);
    }, [awayTeamId, homeTeamId]);

    const buildDefaultFocus = () => {
        const defaults = ['recent_form', 'bullpen', 'batting'];
        if (gameId && homeTeamId && awayTeamId) {
            defaults.push('matchup');
        }
        if (homePitcher || awayPitcher) {
            defaults.push('starter');
        }
        return Array.from(new Set(defaults));
    };

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>(getInitialTeamName(initialTeam));
    const [focus, setFocus] = useState<string[]>(buildDefaultFocus());
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState<string>('');
    const [errorAction, setErrorAction] = useState<'login' | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setSelectedTeam(getInitialTeamName(initialTeam));
            setFocus(normalizeFocusLocal(buildDefaultFocus()));
            setResult(null);
            setAnalysisStep('');
            setErrorAction(null);
        }
    }, [isOpen, initialTeam, homeTeamId, awayTeamId, gameId, homePitcher, awayPitcher]);

    const focusOptions = [
        { id: 'recent_form', label: '최근 전력', icon: TrendingUp, desc: '최근 5경기 승률 및 타격감' },
        { id: 'bullpen', label: '불펜 상태', icon: Shield, desc: '필승조 가동 가능 여부' },
        { id: 'matchup', label: '상대 전적', icon: Users, desc: '이번 시즌 상대 승률' },
        { id: 'starter', label: '선발 투수', icon: Zap, desc: '선발 맞대결 분석' },
        { id: 'batting', label: '타격 생산성', icon: BarChart2, desc: 'OPS·wRC+ 등 타격 지표 분석' },
    ];
    const focusLabelMap: Record<string, string> = {
        recent_form: '최근 전력',
        bullpen: '불펜 상태',
        starter: '선발 투수',
        matchup: '상대 전적',
        batting: '타격 생산성',
    };
    const focusOrder = ['recent_form', 'bullpen', 'starter', 'matchup', 'batting'];
    const normalizeFocusLocal = (values: string[]) => {
        const seen = new Set<string>();
        return values
            .map(value => String(value || '').trim().toLowerCase())
            .filter(value => {
                if (!focusOrder.includes(value)) return false;
                if (seen.has(value)) return false;
                seen.add(value);
                return true;
            })
            .sort((a, b) => focusOrder.indexOf(a) - focusOrder.indexOf(b));
    };

    const resolveFallbackSeasonYear = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const month = now.getMonth() + 1;
        return month <= 2 ? currentYear - 1 : currentYear;
    };

    const resolveSeasonYear = () => {
        if (gameDate) {
            const match = String(gameDate).match(/^(\d{4})/);
            if (match) {
                const parsed = Number(match[1]);
                if (Number.isInteger(parsed) && parsed >= 1982 && parsed <= 2100) {
                    return parsed;
                }
            }
        }

        if (seasonId !== undefined && seasonId !== null) {
            const match = String(seasonId).match(/^(\d{4})/);
            if (match) {
                const parsed = Number(match[1]);
                if (Number.isInteger(parsed) && parsed >= 1982 && parsed <= 2100) {
                    return parsed;
                }
            }
        }

        return resolveFallbackSeasonYear();
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysisStep('감독님이 헤드셋 끼고 준비 중...');
        setResult(null);
        setErrorAction(null);

        const steps = [
            '상대팀 벤치 몰래 훔쳐보는 중...',
            '타율 계산하다 소수점에서 길 잃은 중...',
            '불펜에서 몸 푸는 중... 아, 그건 투수고요',
            '야구의 신에게 잠깐 자문 구하는 중...',
            '9회말 역전 드라마 시나리오 집필 중...',
            '감독님 표정 읽기 AI 가동 중...',
            '사인 보내는 중이니까 조용히 해주세요...',
            '전술 노트에 커피 쏟아서 다시 쓰는 중...',
            '삼진 아웃 시뮬레이션 999번째 돌리는 중...',
            '거의 다 됐습니다, 마지막 사인 확인 중...'
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                setAnalysisStep(steps[i]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 1500);

        try {
            const seasonYear = resolveSeasonYear();
            const leagueTypeCode = resolveLeagueTypeCode(leagueType, round);
            const selectedTeamId = TEAM_NAME_TO_ID[selectedTeam] || selectedTeam;
            const opponentTeamId = selectedTeamId === homeTeamId
                ? awayTeamId
                : selectedTeamId === awayTeamId
                    ? homeTeamId
                    : undefined;

            await analyzeTeam({
                home_team_id: selectedTeamId,
                away_team_id: opponentTeamId,
                request_mode: 'manual_detail',
                focus: normalizeFocusLocal(focus),
                game_id: gameId,
                league_context: {
                    season: seasonId,
                    season_year: seasonYear,
                    game_date: gameDate,
                    league_type: leagueType,
                    league_type_code: leagueTypeCode,
                    round: round,
                    game_no: gameNo,
                    stage_label: round,
                    series_game_no: gameNo,
                    home_pitcher: homePitcher || undefined,
                    away_pitcher: awayPitcher || undefined,
                },
            }, (currentText) => {
                // Real-time update
                setResult({ answer: currentText });
            }).then(finalResult => {
                setResult(finalResult);
            });

        } catch (error) {
            console.error('Coach analysis failed:', error);
            const message = error instanceof Error ? error.message : String(error ?? '');
            if (isAbortError(error)) {
                return;
            }
            if (message.includes('unable_to_resolve_analysis_year')) {
                setResult({
                    error: '시즌 연도를 확인하지 못했습니다. 날짜/시즌 정보를 다시 확인해주세요.'
                });
            } else if (isCoachAnalyzeError(error) && error.code === 'AUTH_EXPIRED') {
                setResult({
                    error: '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.'
                });
                setErrorAction('login');
            } else {
                setResult({ error: '분석 중 오류가 발생했습니다.' });
            }
        } finally {
            setLoading(false);
            setAnalysisStep('');
            clearInterval(interval);
        }
    };

    const toggleFocus = (id: string) => {
        setFocus(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const getAnalysisData = (): CoachAnalysisData | null => {
        const isReviewMode = result?.game_status_bucket === 'COMPLETED';
        const defaultAnalysisTitle = isReviewMode ? 'AI 코치 경기 리뷰' : 'AI 코치 상세 분석';
        const defaultAnalysisMessage = isReviewMode
            ? '실데이터를 바탕으로 경기 결과를 복기한 리포트입니다.'
            : '실데이터를 바탕으로 승부처를 해석한 리포트입니다.';

        const normalizeSentiment = (value?: string): CoachAnalysisData['dashboard']['sentiment'] => {
            if (value === 'positive' || value === 'negative' || value === 'neutral') {
                return value;
            }
            return 'neutral';
        };

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
            summary: normalizeTextBlock(analysis?.summary || '', ''),
            verdict: normalizeTextBlock(analysis?.verdict || '', ''),
            strengths: normalizeInsightList(analysis?.strengths),
            weaknesses: normalizeInsightList(analysis?.weaknesses),
            risks: normalizeRiskItems(Array.isArray(analysis?.risks) ? analysis.risks : null),
            why_it_matters: normalizeInsightList(analysis?.why_it_matters),
            swing_factors: normalizeInsightList(analysis?.swing_factors),
            watch_points: normalizeInsightList(analysis?.watch_points),
            uncertainty: normalizeInsightList(analysis?.uncertainty),
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
            const normalizedContext = normalizeDashboardContext(
                headline || defaultAnalysisTitle,
                normalizedAnalysis.summary
                    || normalizedAnalysis.verdict
                    || normalizeTextBlock(detailedMarkdown || coachNote || ''),
            );

            return {
                dashboard: {
                    headline: normalizedContext.title,
                    context: normalizedContext.displayText,
                    sentiment: normalizeSentiment(sentiment),
                    stats: mappedMetrics.stats,
                },
                metrics: mappedMetrics.metricCards,
                detailed_analysis: normalizeTextBlock(detailedMarkdown || ''),
                coach_note: normalizeTextBlock(
                    coachNote || '',
                    '코치 노트가 제공되지 않았습니다.',
                ),
                analysis_summary: normalizedAnalysis.summary,
                verdict: normalizedAnalysis.verdict,
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
            headline: typeof data?.dashboard?.headline === 'string' ? data.dashboard.headline : defaultAnalysisTitle,
            context: normalizeTextBlock(
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
            analysis_summary: normalizeTextBlock(typeof data?.analysis_summary === 'string' ? data.analysis_summary : '', ''),
            verdict: normalizeTextBlock(typeof data?.verdict === 'string' ? data.verdict : '', ''),
            strengths: normalizeInsightList(data?.strengths),
            weaknesses: normalizeInsightList(data?.weaknesses),
            risks: normalizeRiskItems(Array.isArray(data?.risks) ? data.risks : null),
            why_it_matters: normalizeInsightList(data?.why_it_matters),
            swing_factors: normalizeInsightList(data?.swing_factors),
            watch_points: normalizeInsightList(data?.watch_points),
            uncertainty: normalizeInsightList(data?.uncertainty),
            detailed_analysis: normalizeTextBlock(
                typeof data?.detailed_analysis === 'string' ? data.detailed_analysis : '',
                COACH_BRIEFING_DISPLAY_MESSAGE,
            ),
            coach_note: normalizeTextBlock(
                typeof data?.coach_note === 'string' ? data.coach_note : '',
                '기존 형식의 코치 노트가 없습니다.',
            ),
            game_status_bucket: result?.game_status_bucket,
        });

        if (result?.data) {
            return normalizeCoachAnalysisData(result.data);
        }

        if (result?.structuredData) {
            const structured = result.structuredData;
            return buildAnalysisData({
                headline: structured.headline || defaultAnalysisTitle,
                sentiment: normalizeSentiment(structured.sentiment),
                keyMetrics: structured.key_metrics,
                analysis: structured.analysis,
                detailedMarkdown: structured.detailed_markdown,
                coachNote: structured.coach_note,
            });
        }

        if (!result?.raw_answer && !result?.answer) return null;

        const raw = result?.raw_answer || result?.answer || '';

        try {
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.dashboard) {
                        return normalizeCoachAnalysisData(parsed as ParsedCoachAnalysisData);
                    }

                    if (parsed.headline) {
                        const parsedPayload = parsed as {
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
                }
            }
        } catch (error) {
            console.warn('Fallback JSON parse failed', error);
        }

            const rawHeadline = raw.match(/### (.*)/)?.[1] || 'AI 분석 리포트';
            const contextFallback = raw.match(/## 🔍 AI 시즌 요약\n([\s\S]*?)\n\n/)?.[1]?.trim() ||
                '데이터를 기반으로 분석된 팀 상태입니다.';
            const normalizedContext = normalizeDashboardContext(rawHeadline, contextFallback);

            return {
                dashboard: {
                    headline: normalizedContext.title,
                    context: normalizedContext.displayText,
                    sentiment: normalizeSentiment((raw.includes('🚨') || raw.includes('▼')) ? 'negative' : 'positive'),
                    stats: [] as DashboardStat[],
                },
                metrics: [] as CoachMetric[],
                detailed_analysis: normalizeTextBlock(raw),
                coach_note: normalizeTextBlock(
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

    const analysisData = useMemo(() => getAnalysisData(), [result]);
    const selectedFocusNormalized = normalizeFocusLocal(focus);
    const resolvedFocus = normalizeFocusLocal(result?.resolved_focus || []);
    const hasFocusMeta = typeof result?.focus_signature === 'string';
    const focusMismatch = hasFocusMeta
        && selectedFocusNormalized.join('+') !== resolvedFocus.join('+');
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 px-8 h-12 rounded-full font-bold">
                        <Zap className="w-4 h-4 fill-white" />
                        AI 코치 상세 분석
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-secondary border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] p-0">
            <DialogHeader className="p-4 sm:p-6 shrink-0 bg-white dark:bg-black/30 border-b border-gray-100 dark:border-gray-800">
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        AI 코치 상세 분석
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {homeTeamId && awayTeamId
                            ? `${getInitialTeamName(homeTeamId)} vs ${getInitialTeamName(awayTeamId)} 승부처를 실데이터 기반으로 해석합니다.`
                            : `${selectedTeam} 전략 및 지표를 실데이터와 함께 해석합니다.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-7 sm:space-y-8 bg-gray-50/60 dark:bg-black/40 relative">
                    {/* Team Selection Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                {homeTeamId && awayTeamId ? '분석 기준 팀 선택' : '분석 대상 팀 선택'}
                            </Label>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1">
                            {selectableTeamNames.map((teamName) => {
                                const isSelected = selectedTeam === teamName;
                                return (
                                    <motion.button
                                        key={teamName}
                                        type="button"
                                        whileTap={{ scale: 0.98 }}
                                        disabled={loading}
                                        onClick={() => {
                                            if (loading) return;
                                            setSelectedTeam(teamName);
                                        }}
                                        className={`
                                            relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border
                                                ${isSelected
                                                ? 'bg-white dark:bg-card border-primary/30 shadow-sm ring-2 ring-primary'
                                                : 'bg-white dark:bg-card/50 border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-gray-700'
                                            }
                                            ${loading ? 'opacity-60 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 relative flex items-center justify-center">
                                            <TeamLogo team={teamName} size={48} className={`w-full h-full transition-all duration-500 ${isSelected ? 'scale-110 drop-shadow-md' : 'opacity-60 grayscale-[0.5]'}`} />
                                        </div>
                                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                                            {teamName}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Focus Points Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            분석 집중 항목
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {focusOptions.map((opt) => {
                                const isActive = focus.includes(opt.id);
                                return (
                                    <motion.button
                                        key={opt.id}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => {
                                            if (loading) return;
                                            toggleFocus(opt.id);
                                        }}
                                        className={`
                                            flex items-start gap-4 p-4 sm:p-5 rounded-2xl transition-all border
                                            ${isActive
                                                ? 'bg-white dark:bg-emerald-950/10 border-primary/30 shadow-sm ring-1 ring-primary'
                                                : 'bg-white dark:bg-card/50 border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-gray-700'
                                            }
                                            ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                        `}
                                    >
                                        <div className={`p-2.5 sm:p-3 rounded-xl transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-secondary text-gray-500'}`}>
                                            <opt.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-semibold text-sm mb-1 ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {opt.label}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                {opt.desc}
                                            </p>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Action Button Section */}
                    <div className="p-1">
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            data-testid="coach-analysis-run-button"
                            className="w-full bg-primary hover:bg-primary-dark text-white h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
                        >
                            {loading ? (
                                <div className="flex min-w-0 items-center gap-4">
                                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    <span className="min-w-0 text-sm font-medium">
                                        {analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE}
                                    </span>
                                    <span className="ml-auto flex min-w-[34px] justify-end gap-1 text-white/85" aria-hidden="true">
                                        <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-white" />
                                        <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-white" />
                                        <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-white" />
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4">
                                    <Zap className="w-5 h-5 text-white" />
                                    <span>AI 코치 상세 분석 시작</span>
                                </div>
                            )}
                        </Button>
                    </div>

                    {loading && !analysisData && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary dark:border-primary/40 dark:bg-primary/10 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                            <span>{analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE}</span>
                        </div>
                    )}

                    {/* Results Presentation (AnimatePresence for smooth swap) */}
                    {hasFocusMeta && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/70 dark:bg-emerald-950/10 p-4 space-y-2"
                        >
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                이번 분석 기준 focus
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {resolvedFocus.length > 0 ? (
                                    resolvedFocus.map((focusId) => (
                                        <span
                                            key={focusId}
                                            className="inline-flex items-center rounded-full border border-emerald-300/60 dark:border-emerald-700/40 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200"
                                        >
                                            {focusLabelMap[focusId] || focusId}
                                        </span>
                                    ))
                                ) : (
                                    <span className="inline-flex items-center rounded-full border border-emerald-300/60 dark:border-emerald-700/40 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200">
                                        종합 분석
                                    </span>
                                )}
                            </div>
                            {focusMismatch && (
                                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                                    선택한 focus와 실제 적용된 focus가 달라 일부 항목이 자동으로 제외되었습니다.
                                </p>
                            )}
                            {result?.focus_section_missing && (
                                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                                    일부 focus 섹션이 누락되어 다음 재생성에서 보강될 수 있습니다.
                                </p>
                            )}
                        </motion.div>
                    )}
                    <AnimatePresence mode="wait">
                        {analysisData && (
                            <CoachAnalysisResultView analysisData={analysisData} />
                        )}
                    </AnimatePresence>

                    {result?.error && !analysisData && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 p-4"
                        >
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                {result.error}
                            </p>
                            {errorAction === 'login' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    data-testid="coach-analysis-login-cta"
                                    className="mt-3 border-red-300/70 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-200 dark:hover:bg-red-950/40"
                                    onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                                >
                                    로그인하기
                                </Button>
                            )}
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
