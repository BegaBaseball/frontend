import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
    Loader2, Zap, TrendingUp, Users, Shield, BarChart2
} from 'lucide-react';
import {
    analyzeTeam,
    type CoachAnalyzeResponse,
    isCoachAnalyzeError,
} from '../api/coach';
import { TEAM_LIST, TEAM_NAME_TO_ID, getRandomTeamName, TEAM_DATA } from '../constants/teams';
import TeamLogo from './TeamLogo';
import {
    resolveCoachAnalysisPresentation,
} from '../utils/prediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import PlainDialog from './ui/plain-dialog';

const CoachAnalysisDialogResultRuntime = lazy(() => import('./CoachAnalysisDialogResultRuntime'));

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

const ANALYSIS_LOADING_FALLBACK_MESSAGE = 'AI 코치 분석을 시작합니다.';

function CoachAnalysisDialogResultRuntimeFallback({
    loading,
    analysisStep,
}: {
    loading: boolean;
    analysisStep: string;
}) {
    if (!loading) {
        return null;
    }

    return (
            <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-[16px] text-primary dark:border-primary/40 dark:bg-primary/10 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                <span>{analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE}</span>
            </div>
            <div className="space-y-3 px-1">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="h-4 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
                        style={{ width: `${95 - i * 12}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

// Subcomponents transferred to separate files.

interface CoachAnalysisDialogRuntimeProps {
    isOpen: boolean;
    onRequestClose: () => void;
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
    isPastGame?: boolean;
    isFutureGame?: boolean;
    gameStatusBucket?: string | null;
}

export default function CoachAnalysisDialogRuntime({
    isOpen,
    onRequestClose,
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
    isPastGame = false,
    isFutureGame = false,
    gameStatusBucket,
}: CoachAnalysisDialogRuntimeProps) {
    const defaultPresentation = resolveCoachAnalysisPresentation({ isPastGame, isFutureGame, gameStatusBucket });
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

    const [selectedTeam, setSelectedTeam] = useState<string>(getInitialTeamName(initialTeam));
    const [focus, setFocus] = useState<string[]>(buildDefaultFocus());
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState<string>('');
    const [errorAction, setErrorAction] = useState<'login' | null>(null);
    const [hasMountedResultRuntime, setHasMountedResultRuntime] = useState(false);
    const navigate = useNavigate();
    const abortControllerRef = useRef<AbortController | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);
    const analysisRequestIdRef = useRef(0);

    const clearAnalysisInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const invalidateActiveAnalysis = () => {
        analysisRequestIdRef.current += 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        clearAnalysisInterval();
    };

    const isActiveAnalysisRequest = (requestId: number, controller: AbortController) => (
        isMountedRef.current
        && analysisRequestIdRef.current === requestId
        && abortControllerRef.current === controller
    );

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            invalidateActiveAnalysis();
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelectedTeam(getInitialTeamName(initialTeam));
            setFocus(normalizeFocusLocal(buildDefaultFocus()));
            setLoading(false);
            setResult(null);
            setAnalysisStep('');
            setErrorAction(null);
            setHasMountedResultRuntime(false);
        } else {
            invalidateActiveAnalysis();
            setLoading(false);
            setAnalysisStep('');
        }
    }, [isOpen, initialTeam, homeTeamId, awayTeamId, gameId, homePitcher, awayPitcher]);

    const focusOptions = [
        { id: 'recent_form', label: '최근 전력', icon: TrendingUp, desc: '최근 5경기 승률 및 타격감' },
        { id: 'bullpen', label: '불펜 상태', icon: Shield, desc: '필승조 가동 가능 여부' },
        { id: 'matchup', label: '상대 전적', icon: Users, desc: '이번 시즌 상대 승률' },
        { id: 'starter', label: '선발 투수', icon: Zap, desc: '선발 맞대결 분석' },
        { id: 'batting', label: '타격 생산성', icon: BarChart2, desc: 'OPS·wRC+ 등 타격 지표 분석' },
    ];
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
        invalidateActiveAnalysis();

        const controller = new AbortController();
        const requestId = analysisRequestIdRef.current + 1;
        analysisRequestIdRef.current = requestId;
        abortControllerRef.current = controller;

        setHasMountedResultRuntime(true);
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
        intervalRef.current = setInterval(() => {
            if (!isActiveAnalysisRequest(requestId, controller)) {
                return;
            }
            if (i < steps.length) {
                setAnalysisStep(steps[i]);
                i++;
            } else {
                clearAnalysisInterval();
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
                if (!isActiveAnalysisRequest(requestId, controller)) return;
                setResult({ answer: currentText });
            }, { signal: controller.signal }).then(finalResult => {
                if (!isActiveAnalysisRequest(requestId, controller)) return;
                setResult(finalResult);
            });

        } catch (error) {
            if (!isActiveAnalysisRequest(requestId, controller)) return;
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
            } else if (isCoachAnalyzeError(error) && error.code === 'REQUEST_FAILED') {
                setResult({
                    error: error.message || '분석 중 오류가 발생했습니다.'
                });
            } else {
                setResult({ error: '분석 중 오류가 발생했습니다.' });
            }
        } finally {
            if (!isActiveAnalysisRequest(requestId, controller)) return;
            setLoading(false);
            setAnalysisStep('');
            abortControllerRef.current = null;
            clearAnalysisInterval();
        }
    };

    const toggleFocus = (id: string) => {
        setFocus(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };
    const shouldRenderResultRuntime = hasMountedResultRuntime || loading || Boolean(result);
    const handleLoginAction = () => {
        navigate(buildLoginPath(getCurrentRelativeUrl()));
    };

    return (
        <PlainDialog
            open={isOpen}
            onClose={onRequestClose}
            title={defaultPresentation.title}
            description={homeTeamId && awayTeamId
                ? `${getInitialTeamName(homeTeamId)} vs ${getInitialTeamName(awayTeamId)} ${defaultPresentation.descriptionWithMatchup}`
                : `${selectedTeam} ${defaultPresentation.descriptionWithTeam}`}
            contentTestId="coach-analysis-dialog"
            className="sm:max-w-[700px] max-h-[90vh] overflow-hidden border-none bg-white p-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] dark:bg-secondary"
            bodyClassName="flex max-h-[calc(90vh-81px)] flex-col overflow-hidden bg-white p-0 dark:bg-secondary"
        >
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-7 sm:space-y-8 bg-gray-50/60 dark:bg-black/40 relative">
                    {/* Team Selection Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <p className="flex items-center gap-2 text-[16px] font-semibold text-gray-600 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                {homeTeamId && awayTeamId ? '분석 기준 팀 선택' : '분석 대상 팀 선택'}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1">
                            {selectableTeamNames.map((teamName) => {
                                const isSelected = selectedTeam === teamName;
                                return (
                                    <button
                                        key={teamName}
                                        type="button"
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
                                            ${loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}
                                        `}
                                    >
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 relative flex items-center justify-center">
                                            <TeamLogo team={teamName} size={48} className={`w-full h-full transition-all duration-500 ${isSelected ? 'scale-110 drop-shadow-md' : 'opacity-60 grayscale-[0.5]'}`} />
                                        </div>
                                        <span className={`text-[16px] font-semibold ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                                            {teamName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Focus Points Section */}
                    <div className="space-y-6">
                        <p className="flex items-center gap-2 px-1 text-[16px] font-semibold text-gray-600 dark:text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            분석 집중 항목
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {focusOptions.map((opt) => {
                                const isActive = focus.includes(opt.id);
                                return (
                                    <button
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
                                            ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.99]'}
                                        `}
                                    >
                                        <div className={`p-2.5 sm:p-3 rounded-xl transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-secondary text-gray-500'}`}>
                                            <opt.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-semibold text-[16px] mb-1 ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {opt.label}
                                            </p>
                                            <p className="text-[16px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                                {opt.desc}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Button Section */}
                    <div className="p-1">
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            data-testid="coach-analysis-run-button"
                            className="w-full bg-primary hover:bg-primary-dark text-white h-12 sm:h-14 text-[16px] sm:text-base font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
                        >
                            {loading ? (
                                <div className="flex min-w-0 items-center gap-4">
                                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    <span className="min-w-0 text-[16px] font-semibold">
                                        {analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE}
                                    </span>
                                    <span className="ml-auto flex min-w-[34px] justify-end gap-1 text-white/85" aria-hidden="true">
                                        {[0, 150, 300].map((delay) => (
                                            <span
                                                key={delay}
                                                className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
                                                style={{ animationDelay: `${delay}ms` }}
                                            />
                                        ))}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4">
                                    <Zap className="w-5 h-5 text-white" />
                                    <span>{defaultPresentation.runButtonLabel}</span>
                                </div>
                            )}
                        </Button>
                    </div>

                    {shouldRenderResultRuntime ? (
                        <Suspense
                            fallback={(
                                <CoachAnalysisDialogResultRuntimeFallback
                                    loading={loading}
                                    analysisStep={analysisStep}
                                />
                            )}
                        >
                            <CoachAnalysisDialogResultRuntime
                                loading={loading}
                                analysisStep={analysisStep}
                                result={result}
                                selectedFocus={focus}
                                isPastGame={isPastGame}
                                isFutureGame={isFutureGame}
                                gameStatusBucket={gameStatusBucket}
                                errorAction={errorAction}
                                onLoginAction={handleLoginAction}
                                loadingFallbackMessage={ANALYSIS_LOADING_FALLBACK_MESSAGE}
                            />
                        </Suspense>
                    ) : null}
            </div>
        </PlainDialog>
    );
}
