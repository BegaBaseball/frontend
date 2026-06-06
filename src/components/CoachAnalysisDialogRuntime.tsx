import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
    analyzeTeam,
    COACH_PAYLOAD_TOO_LARGE_MESSAGE,
    type CoachAnalyzeResponse,
    isCoachAnalyzeError,
} from '../api/coach';
import { TEAM_LIST, TEAM_NAME_TO_ID, getRandomTeamName, TEAM_DATA } from '../constants/teams';
import TeamLogo from './TeamLogo';
import {
    getCoachAnalysisUnavailableMessage,
    resolveCoachAnalysisPresentation,
} from '../utils/prediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import PlainDialog from './ui/plain-dialog';
import {
    PredictionLoaderIcon,
    PredictionZapIcon,
} from './prediction/PredictionShellIcons';

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
                <PredictionLoaderIcon className="h-4 w-4 animate-spin shrink-0 text-primary" />
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
    const unavailableAnalysisMessage = useMemo(
        () => getCoachAnalysisUnavailableMessage(gameStatusBucket),
        [gameStatusBucket],
    );
    const getInitialTeamName = (teamId?: string) => {
        if (!teamId) return getRandomTeamName();
        // Try to match ID to full name from TEAM_DATA
        const data = TEAM_DATA[teamId];
        if (data && data.fullName !== '없음') return data.fullName;
        // Fallback for names that might already be full or short
        return TEAM_LIST.find(t => t.includes(teamId)) || teamId;
    };

    const fallbackTeamName = useMemo(
        () => getInitialTeamName(homeTeamId || initialTeam),
        [homeTeamId, initialTeam],
    );

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

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState<string>('');
    const [errorAction, setErrorAction] = useState<'login' | null>(null);
    const [hasMountedResultRuntime, setHasMountedResultRuntime] = useState(false);
    const [previewText, setPreviewText] = useState<string>('');
    const navigate = useNavigate();
    const abortControllerRef = useRef<AbortController | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMountedRef = useRef(true);
    const analysisRequestIdRef = useRef(0);
    const autoStartedKeyRef = useRef('');

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
            autoStartedKeyRef.current = '';
            setLoading(false);
            setResult(null);
            setAnalysisStep('');
            setErrorAction(null);
            setHasMountedResultRuntime(false);
            setPreviewText('');
        } else {
            autoStartedKeyRef.current = '';
            invalidateActiveAnalysis();
            setLoading(false);
            setAnalysisStep('');
        }
    }, [isOpen, initialTeam, homeTeamId, awayTeamId, gameId, homePitcher, awayPitcher]);

    const autoRunKey = useMemo(
        () => [
            homeTeamId || '',
            awayTeamId || '',
            gameId || '',
            gameDate || '',
            String(seasonId ?? ''),
            leagueType || '',
            round || '',
            String(gameNo ?? ''),
            homePitcher || '',
            awayPitcher || '',
            gameStatusBucket || '',
        ].join('|'),
        [
            awayPitcher,
            awayTeamId,
            gameDate,
            gameId,
            gameNo,
            gameStatusBucket,
            homePitcher,
            homeTeamId,
            leagueType,
            round,
            seasonId,
        ],
    );

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
        if (unavailableAnalysisMessage) {
            setHasMountedResultRuntime(true);
            setLoading(false);
            setAnalysisStep('');
            setErrorAction(null);
            setResult({
                error: unavailableAnalysisMessage,
                game_status_bucket: gameStatusBucket ?? undefined,
            });
            return;
        }

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
        setPreviewText('');

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
            const selectedTeamId = homeTeamId || TEAM_NAME_TO_ID[fallbackTeamName] || initialTeam || fallbackTeamName;
            const opponentTeamId = homeTeamId && awayTeamId ? awayTeamId : undefined;

            await analyzeTeam({
                home_team_id: selectedTeamId,
                away_team_id: opponentTeamId,
                request_mode: 'manual_detail',
                focus: normalizeFocusLocal(buildDefaultFocus()),
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
            }, {
                signal: controller.signal,
                onPreviewChunk: (text) => {
                    if (!isActiveAnalysisRequest(requestId, controller)) return;
                    setPreviewText((prev) => prev + text);
                },
                onPreviewReset: () => {
                    if (!isActiveAnalysisRequest(requestId, controller)) return;
                    setPreviewText('');
                },
                onStatus: (status) => {
                    if (!isActiveAnalysisRequest(requestId, controller)) return;
                    if (status === 'first_chunk_received') {
                        clearAnalysisInterval();
                        setAnalysisStep('LLM 응답 생성 중...');
                    }
                },
            }).then(finalResult => {
                if (!isActiveAnalysisRequest(requestId, controller)) return;
                setResult(finalResult);
                setPreviewText('');
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
            } else if (isCoachAnalyzeError(error) && error.code === 'STREAM_TIMEOUT') {
                setResult({
                    error: error.message || 'AI 코치 분석 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
                });
            } else if (isCoachAnalyzeError(error) && error.code === 'PAYLOAD_TOO_LARGE') {
                setResult({
                    error: error.message || COACH_PAYLOAD_TOO_LARGE_MESSAGE
                });
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
            setPreviewText('');
            abortControllerRef.current = null;
            clearAnalysisInterval();
        }
    };

    const shouldRenderResultRuntime = hasMountedResultRuntime || loading || Boolean(result);
    const handleLoginAction = () => {
        navigate(buildLoginPath(getCurrentRelativeUrl()));
    };
    const dialogSubtitle = homeTeamId && awayTeamId
        ? `${getInitialTeamName(homeTeamId)} vs ${getInitialTeamName(awayTeamId)} ${defaultPresentation.descriptionWithMatchup}`
        : `${fallbackTeamName} ${defaultPresentation.descriptionWithTeam}`;
    const footerStatusText = loading
        ? (analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE)
        : result?.error
            ? '분석 오류 · 재시도 가능'
            : result
            ? '실데이터 기반 · 홈팀 기준 분석'
            : '홈팀 기준 분석 준비';

    // 스크린리더용 라이프사이클 안내. 한 번에 하나만 비어있지 않게(중복 낭독 방지).
    const liveAlertMessage = result?.error
        ? result.error
        : result?.manual_data_request
            ? '분석에 필요한 실데이터가 부족합니다.'
            : '';
    const liveStatusMessage = liveAlertMessage
        ? ''
        : loading
            ? (previewText ? '분석 결과를 작성하고 있습니다.' : 'AI 코치 분석을 시작했습니다.')
            : result
                ? '분석이 완료되었습니다.'
                : '';

    useEffect(() => {
        if (!isOpen) return;
        if (autoStartedKeyRef.current === autoRunKey) return;
        autoStartedKeyRef.current = autoRunKey;
        void handleAnalyze();
    }, [autoRunKey, isOpen]);

    return (
        <PlainDialog
            open={isOpen}
            onClose={onRequestClose}
            ariaLabel={defaultPresentation.title}
            contentTestId="coach-analysis-dialog"
            hideHeader
            className="max-h-[90vh] overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white p-0 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.06)] sm:max-w-[1080px] dark:border-slate-800 dark:bg-[#16181c]"
            bodyClassName="flex max-h-[90vh] flex-col overflow-hidden bg-white p-0 dark:bg-[#16181c]"
        >
            <div className="flex items-center gap-[14px] border-b border-[#eef2f0] bg-white px-6 py-[18px] dark:border-white/10 dark:bg-[#16181c]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2d5f4f] to-[#173b34] text-[#d6f0e5] shadow-[0_4px_12px_-4px_rgba(23,59,52,0.5)]">
                    <PredictionZapIcon aria-hidden="true" className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[17px] font-extrabold leading-tight text-[#0f1419] dark:text-slate-100">
                        {defaultPresentation.title}
                    </h2>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-bold leading-snug text-[#536471] dark:text-slate-400">
                        {homeTeamId && <TeamLogo teamId={homeTeamId} size={14} className="!rounded-none !bg-transparent p-0" />}
                        <span className="truncate">{dialogSubtitle}</span>
                        {awayTeamId && <TeamLogo teamId={awayTeamId} size={14} className="!rounded-none !bg-transparent p-0" />}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRequestClose}
                    aria-label="닫기"
                    className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-transparent text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="h-3.5 w-3.5">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-[#16181c]">
                    <p className="sr-only" role="status" aria-live="polite" data-testid="coach-analysis-live-status">
                        {liveStatusMessage}
                    </p>
                    <p className="sr-only" role="alert" aria-live="assertive" data-testid="coach-analysis-live-alert">
                        {liveAlertMessage}
                    </p>
                    {!result ? (
                    <div className="p-6">
                        <div role="status" className="rounded-[20px] border border-[#e5e7eb] bg-[#f7fafc] p-6 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-3 text-[#2d5f4f] dark:text-emerald-200">
                                <PredictionLoaderIcon className="h-5 w-5 animate-spin shrink-0" />
                                <span className="text-[15px] font-extrabold">{analysisStep || ANALYSIS_LOADING_FALLBACK_MESSAGE}</span>
                            </div>
                            <p className="mt-2 break-keep text-[13px] font-bold leading-relaxed text-[#64748b] dark:text-slate-400">
                                C1 코치 분석을 홈팀 기준으로 자동 생성하고 있습니다.
                            </p>
                            <div className="mt-5 space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="h-4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                                        style={{ width: `${95 - i * 12}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    ) : null}

                    {loading && previewText ? (
                        <div className="px-6 pb-6">
                            <div
                                data-testid="coach-analysis-preview"
                                className="rounded-[14px] border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                            >
                                <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider">
                                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">초안</span>
                                    <span className="text-amber-700 dark:text-amber-200">근거 검증 전 생성 중 · 확정 결과로 대체됩니다</span>
                                </div>
                                <p className="whitespace-pre-wrap break-words font-semibold">{previewText}</p>
                            </div>
                        </div>
                    ) : null}

                    {shouldRenderResultRuntime && (Boolean(result) || !loading) ? (
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
                                isPastGame={isPastGame}
                                isFutureGame={isFutureGame}
                                gameStatusBucket={gameStatusBucket}
                                errorAction={errorAction}
                                onLoginAction={handleLoginAction}
                                loadingFallbackMessage={ANALYSIS_LOADING_FALLBACK_MESSAGE}
                                homeTeamId={homeTeamId}
                                awayTeamId={awayTeamId}
                                onRetry={handleAnalyze}
                            />
                        </Suspense>
                    ) : null}
            </div>
            <div className="flex items-center gap-2 border-t border-[#eef2f0] bg-[#fafcfb] px-[22px] py-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#536471] dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {footerStatusText}
                </span>
                <span className="flex-1" />
                <Button
                    type="button"
                    onClick={onRequestClose}
                    className="h-9 rounded-[14px] bg-[#2d5f4f] px-5 text-[13px] font-extrabold text-white hover:bg-[#2f6c5c]"
                >
                    닫기
                </Button>
            </div>
        </PlainDialog>
    );
}
