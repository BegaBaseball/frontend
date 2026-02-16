import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { Game, GameDetail } from '../types/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID } from '../constants/teams';
import CoachAnalysisDialog from './CoachAnalysisDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeTeam } from '../api/coach';

interface CoachBriefingProps {
    game: Game | null;
    gameDetail?: GameDetail | null;
    seasonContext?: {
        home: { rank: number; gamesBehind: number; remainingGames: number } | null;
        away: { rank: number; gamesBehind: number; remainingGames: number } | null;
        canCallAI: boolean;
    };
    isPastGame: boolean;
    isFutureGame?: boolean;
    autoEnabled: boolean;
}

export default function CoachBriefing({
    game,
    gameDetail,
    seasonContext,
    isPastGame,
    isFutureGame = false,
    autoEnabled,
}: CoachBriefingProps) {
    const [displayedMessage, setDisplayedMessage] = useState('');
    const [aiBriefing, setAiBriefing] = useState<{ title: string; message: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const cacheRef = useRef<Map<string, { title: string; message: string }>>(new Map());
    const inFlightRef = useRef<Set<string>>(new Set());
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const homeRank = seasonContext?.home?.rank ?? null;
    const homeGamesBehind = seasonContext?.home?.gamesBehind ?? null;
    const homeRemainingGames = seasonContext?.home?.remainingGames ?? null;
    const awayRank = seasonContext?.away?.rank ?? null;
    const awayGamesBehind = seasonContext?.away?.gamesBehind ?? null;
    const awayRemainingGames = seasonContext?.away?.remainingGames ?? null;

    const briefingLabel = 'AI 분석 내용';

    const isMeaningfulMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        if (trimmed.length < 12) return false;
        if (/^\*\*\[.*\]\*\*$/.test(trimmed)) return false;
        if (/핵심\s*변수|승부\s*포인트|요약/.test(trimmed)) return false;

        // Relaxed constraints: allow up to 5 commas and 5 sentences for detailed analysis
        const commaCount = (trimmed.match(/[,，]/g) || []).length;
        if (commaCount > 5) return false;

        const sentenceSplit = trimmed.split(/[.!?]/).filter((part) => part.trim().length > 0);
        if (sentenceSplit.length > 5) return false;

        return true;
    };

    const parseAiBriefing = (rawText: string) => {
        // First, try parsing as JSON (COACH_PROMPT_V2 format)
        try {
            // Clean up potential markdown code fences
            let jsonText = rawText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7);
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3);
            }
            if (jsonText.endsWith('```')) {
                jsonText = jsonText.slice(0, -3);
            }
            jsonText = jsonText.trim();

            const parsed = JSON.parse(jsonText);
            if (parsed.headline || parsed.coach_note) {
                const title = parsed.headline || briefingLabel;
                // Use coach_note as message, or construct from analysis
                let message = parsed.coach_note || '';
                if (!message && parsed.analysis?.strengths?.[0]) {
                    message = parsed.analysis.strengths[0];
                }
                if (!message && parsed.detailed_markdown) {
                    // Extract first meaningful line from detailed_markdown
                    const lines = parsed.detailed_markdown.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
                    message = lines[0] || '';
                }
                if (message && isMeaningfulMessage(message)) {
                    return { title, message };
                }
                // If coach_note is empty, try to extract from weaknesses or risks
                if (!message && parsed.analysis?.weaknesses?.[0]) {
                    message = parsed.analysis.weaknesses[0];
                }
                if (!message && parsed.analysis?.risks?.[0]?.description) {
                    message = parsed.analysis.risks[0].description;
                }
                // If still no message, use headline as title but with a summary message
                if (title && title !== briefingLabel) {
                    // Don't repeat the headline - provide context instead
                    const summaryMessage = message || '상세 분석을 확인하려면 "상세 분석" 버튼을 클릭하세요.';
                    return { title, message: summaryMessage };
                }
            }
        } catch {
            // Not JSON, fall through to markdown parsing
        }

        // Fallback: Parse as markdown (legacy format)
        const lines = rawText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        const titleIndex = lines.findIndex(line => line.startsWith('### '));
        const title = titleIndex >= 0
            ? lines[titleIndex].replace(/^###\s+/, '').replace(/[\*_~\[\]]/g, '').trim()
            : briefingLabel;

        const message = lines.slice(titleIndex + 1).find(line => {
            if (line.startsWith('##') || line.startsWith('###')) return false;
            if (line.startsWith('|') || line.startsWith(':---')) return false;
            return true;
        }) || 'AI 분석 데이터를 준비 중입니다.';

        if (!isMeaningfulMessage(message)) {
            return null;
        }

        return { title, message };
    };


    const fallbackMessage = 'AI 분석 내용을 준비하지 못했습니다.';

    const buildPastPrompt = (homeTeamName: string, awayTeamName: string) => {
        const homeScore = gameDetail?.homeScore ?? game?.homeScore;
        const awayScore = gameDetail?.awayScore ?? game?.awayScore;
        const scoreLine = (homeScore != null && awayScore != null)
            ? `스코어 ${awayTeamName} ${awayScore}-${homeScore} ${homeTeamName}`
            : '스코어: 미상';
        const baseLines = [
            '너는 데이터 기반 야구 분석 전문가다.',
            '3~4문장으로 분석하되, 반드시 선수명과 구체적 수치(ERA, OPS, 타율 등)를 포함해라.',
            '추상적 표현(불안하다, 개선이 필요하다) 대신 수치로 근거를 제시해라.',
        ];

        const contextLine = `맥락: 순위 ${homeRank ?? '미상'}위/${awayRank ?? '미상'}위, 승차 ${homeGamesBehind ?? '미상'}/${awayGamesBehind ?? '미상'}, 잔여 ${homeRemainingGames ?? '미상'}/${awayRemainingGames ?? '미상'}경기`;

        return [...baseLines, `경기: ${awayTeamName} vs ${homeTeamName}, ${scoreLine}`, contextLine].join('\n');
    };

    const buildPreviewPrompt = (homeTeamName: string, awayTeamName: string) => (
        `데이터 기반 분석 전문가로서 3~4문장으로 분석해라.\n` +
        `반드시 선수명과 구체적 수치(ERA, OPS, 타율 등)를 포함해라.\n` +
        `경기: ${awayTeamName} vs ${homeTeamName}\n` +
        `맥락: 순위 ${homeRank ?? '미상'}위/${awayRank ?? '미상'}위, ` +
        `승차 ${homeGamesBehind ?? '미상'}/${awayGamesBehind ?? '미상'}, ` +
        `잔여 ${homeRemainingGames ?? '미상'}/${awayRemainingGames ?? '미상'}경기`
    );

    const resolveSeasonYear = () => {
        const dateText = game?.gameDate;
        if (dateText) {
            const match = String(dateText).match(/^(\d{4})/);
            if (match) {
                const parsed = Number(match[1]);
                if (Number.isInteger(parsed) && parsed >= 1982 && parsed <= 2100) {
                    return parsed;
                }
            }
        }

        const seasonId = game?.seasonId;
        if (seasonId !== undefined && seasonId !== null) {
            const match = String(seasonId).match(/^(\d{4})/);
            if (match) {
                const parsed = Number(match[1]);
                if (Number.isInteger(parsed) && parsed >= 1982 && parsed <= 2100) {
                    return parsed;
                }
            }
        }

        return undefined;
    };

    const requestMode = autoEnabled ? 'auto_brief' : 'manual_detail';
    const requestFocus = useMemo(
        () => (requestMode === 'auto_brief' ? ['recent_form'] : ['matchup', 'recent_form']),
        [requestMode],
    );
    const focusSignature = requestFocus.join('+');
    const requestSeasonYear = useMemo(() => resolveSeasonYear(), [game?.gameId, game?.gameDate, game?.seasonId]);
    const requestMatchupKey = useMemo(() => {
        if (!game) {
            return null;
        }

        return `${game.gameId}-${requestSeasonYear || 'na'}`;
    }, [game?.gameId, requestSeasonYear]);

    const requestCacheKey = useMemo(() => {
        if (!requestMatchupKey) {
            return null;
        }

        return `${requestMatchupKey}-${requestMode}-${focusSignature}`;
    }, [focusSignature, requestMode, requestMatchupKey]);

    const getSeasonBanner = () => {
        if (!seasonContext || !seasonContext.home || !seasonContext.away) return null;
        const { home, away } = seasonContext;

        const leagueName = game?.leagueType === 'POST' ? '포스트시즌' : '정규시즌';
        const rankDiff = Math.abs(home.rank - away.rank);
        const gb = Math.abs(home.gamesBehind - away.gamesBehind).toFixed(1);

        return (
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs md:text-sm font-medium text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700/40 w-fit">
                <span className="text-emerald-800 dark:text-emerald-100">{leagueName}</span>
                <span className="w-px h-3 bg-emerald-200 dark:bg-emerald-700/40 mx-1" />
                <span>{home.rank}위 vs {away.rank}위</span>
                {game?.leagueType !== 'POST' && (
                    <>
                        <span className="w-px h-3 bg-emerald-200 dark:bg-emerald-700/40 mx-1" />
                        <span>승차 {gb}G</span>
                        <span className="w-px h-3 bg-emerald-200 dark:bg-emerald-700/40 mx-1" />
                        <span>잔여 {home.remainingGames}경기</span>
                    </>
                )}
            </div>
        );
    };

    useEffect(() => {
        if (!game) {
            setAiBriefing(null);
            setAiLoading(false);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }

        if (!autoEnabled || !requestCacheKey) {
            setAiBriefing(null);
            setAiLoading(false);
            return;
        }

        const cached = cacheRef.current.get(requestCacheKey);
        if (cached) {
            setAiBriefing(cached);
            setAiLoading(false);
            return;
        }

        if (inFlightRef.current.has(requestCacheKey)) {
            return;
        }

        const homeTeamName = TEAM_DATA[game.homeTeam]?.fullName || game.homeTeam;
        const awayTeamName = TEAM_DATA[game.awayTeam]?.fullName || game.awayTeam;
        const homeId = TEAM_NAME_TO_ID[homeTeamName] || game.homeTeam;
        const awayId = TEAM_NAME_TO_ID[awayTeamName] || game.awayTeam;
        const homeLeagueContext = (
            homeRank != null && homeGamesBehind != null && homeRemainingGames != null
        ) ? {
            rank: homeRank,
            gamesBehind: homeGamesBehind,
            remainingGames: homeRemainingGames,
        } : null;
        const awayLeagueContext = (
            awayRank != null && awayGamesBehind != null && awayRemainingGames != null
        ) ? {
            rank: awayRank,
            gamesBehind: awayGamesBehind,
            remainingGames: awayRemainingGames,
        } : null;

        let active = true;
        timeoutRef.current = setTimeout(() => {
            if (!active) {
                return;
            }

            const controller = new AbortController();
            abortRef.current = controller;
            setAiBriefing(null);
            setAiLoading(true);
            inFlightRef.current.add(requestCacheKey);

            analyzeTeam({
                home_team_id: homeId,
                away_team_id: awayId,
                league_context: {
                    season: game.seasonId,
                    season_year: requestSeasonYear,
                    game_date: game.gameDate,
                    league_type: game.leagueType,
                    round: game.postSeasonSeries,
                    game_no: game.seriesGameNo,
                    home: homeLeagueContext,
                    away: awayLeagueContext,
                },
                focus: requestFocus,
                request_mode: requestMode,
                game_id: game.gameId,
            }, undefined, { signal: controller.signal })
                .then((response) => {
                    if (!active) return;

                    if (response.structuredData) {
                        const structured = response.structuredData;
                        const rawMessage =
                            structured.coach_note ||
                            structured.analysis?.strengths?.[0] ||
                            structured.analysis?.weaknesses?.[0] ||
                            '상세 분석을 확인하려면 "상세 분석" 버튼을 클릭하세요.';
                        const briefing = {
                            title: structured.headline || briefingLabel,
                            message: isMeaningfulMessage(rawMessage)
                                ? rawMessage
                                : '상세 분석을 확인하려면 "상세 분석" 버튼을 클릭하세요.'
                        };
                        cacheRef.current.set(requestCacheKey, briefing);
                        setAiBriefing(briefing);
                        return;
                    }

                    const rawText = response.answer || response.raw_answer || '';
                    if (!rawText) {
                        setAiBriefing(null);
                        return;
                    }
                    const parsed = parseAiBriefing(rawText);
                    if (parsed) {
                        cacheRef.current.set(requestCacheKey, parsed);
                        setAiBriefing(parsed);
                    } else {
                        setAiBriefing(null);
                    }
                })
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        return;
                    }
                    const abortMessage = error instanceof Error ? error.message : String(error ?? '');
                    if (abortMessage.includes('AbortError') || abortMessage.includes('aborted')) {
                        return;
                    }
                    if (active) {
                        if (
                            abortMessage.includes('unable_to_resolve_analysis_year') ||
                            abortMessage.includes('invalid_season_year_for_analysis')
                        ) {
                            setAiBriefing({
                                title: briefingLabel,
                                message: '경기 연도 정보를 확인하는 중입니다. 잠시 후 다시 시도해주세요.'
                            });
                            return;
                        }
                        setAiBriefing(null);
                    }
                })
                .finally(() => {
                    inFlightRef.current.delete(requestCacheKey);
                    if (active) {
                        setAiLoading(false);
                    }
                });
        }, 380);

        return () => {
            active = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            inFlightRef.current.delete(requestCacheKey);
            setAiLoading(false);
        };
    }, [
        autoEnabled,
        game?.gameId,
        game?.homeTeam,
        game?.awayTeam,
        game?.seasonId,
        game?.gameDate,
        game?.leagueType,
        game?.postSeasonSeries,
        game?.seriesGameNo,
        game?.homeScore,
        game?.awayScore,
        gameDetail?.homeScore,
        gameDetail?.awayScore,
        homeRank,
        homeGamesBehind,
        homeRemainingGames,
        awayRank,
        awayGamesBehind,
        awayRemainingGames,
        requestCacheKey,
        requestMode,
        focusSignature,
        requestSeasonYear,
    ]);

    const activeTitle = autoEnabled
        ? (aiBriefing?.title ?? briefingLabel)
        : 'AI 분석 요청';
    const activeMessage = autoEnabled
        ? (aiLoading
            ? 'AI 코치가 작전판에 낙서 중입니다. 잠시만요!'
            : (aiBriefing?.message ?? fallbackMessage))
        : (isFutureGame
            ? '예정 경기에서는 자동 분석이 적용되지 않습니다. 필요하면 직접 AI 분석을 요청하세요.'
            : '핵심 경기만 자동 분석을 제공합니다. 필요한 경기에서는 직접 AI 분석을 요청하세요.');

    // Typewriter effect
    useEffect(() => {
        setDisplayedMessage('');
        let i = 0;
        const message = activeMessage;
        const timer = setInterval(() => {
            setDisplayedMessage(message.substring(0, i));
            i++;
            if (i > message.length) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [activeMessage]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Card className="mb-6 overflow-hidden border border-gray-200 dark:border-border shadow-xl bg-white dark:bg-card text-gray-900 dark:text-gray-100 relative">
                <div className="p-6 relative z-10">
                    <div className="flex gap-4 min-w-0">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-emerald-700 dark:text-emerald-200" />
                            </div>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-secondary text-gray-700 dark:text-gray-100 border border-gray-200 dark:border-border text-[11px] font-semibold">
                                    {briefingLabel}
                                </span>
                                {game && (
                                    <span className="text-[11px] text-gray-500 dark:text-gray-300 font-medium">
                                        {autoEnabled
                                            ? (aiLoading ? '작전 구상 중...' : (isPastGame ? '맥락 분석 중' : '실시간 분석 중'))
                                        : isFutureGame
                                            ? '경기 시작 전입니다'
                                            : '요청 버튼을 눌러주세요'}
                                </span>
                            )}
                        </div>

                            {getSeasonBanner()}

                            <AnimatePresence mode="wait">
                                <motion.h4
                                    key={activeTitle}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight tracking-tight truncate"
                                >
                                    {activeTitle}
                                </motion.h4>
                            </AnimatePresence>

                            <div className="min-h-[2.5rem]">
                                <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    {displayedMessage}
                                    <motion.span
                                        animate={{ opacity: [1, 0.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="inline-block w-1 h-3 bg-emerald-200/80 ml-1 align-middle"
                                    />
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <CoachAnalysisDialog
                            initialTeam={game?.homeTeam}
                            gameId={game?.gameId}
                            gameDate={game?.gameDate}
                            seasonId={game?.seasonId}
                            leagueType={game?.leagueType}
                            round={game?.postSeasonSeries}
                            gameNo={game?.seriesGameNo}
                            trigger={
                                <Button
                                    data-testid="coach-analysis-open"
                                    className="w-full md:w-auto h-10 bg-emerald-950 hover:bg-emerald-900 text-emerald-50 border border-emerald-700/60 rounded-xl shadow-sm">
                                    <Zap className="w-4 h-4 mr-2 text-emerald-50" />
                                    <span className="text-xs font-semibold">
                                        {game ? (autoEnabled ? '상세 분석' : 'AI 분석 요청') : '전력 분석'}
                                    </span>
                                </Button>
                            }
                        />
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
