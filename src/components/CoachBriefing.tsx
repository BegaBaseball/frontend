import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { Game, GameDetail } from '../types/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID } from '../constants/teams';
import CoachAnalysisDialog from './CoachAnalysisDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeTeam } from '../api/coach';
import {
  COACH_BRIEFING_DISPLAY_MESSAGE,
  COACH_BRIEFING_MANUAL_HINT,
  CoachRequestMode,
  RawAiBriefing,
  NormalizedAiBriefing,
  normalizeCoachBriefing,
} from '../utils/prediction';

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
    requestMode: CoachRequestMode;
    forceManual?: boolean;
}

const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v1';
const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v1';
// Cache priority: UI state cache (in-memory) -> localStorage -> sessionStorage
const COACH_BRIEFING_CACHE_TTL_MS = 5 * 60 * 1000;
const COACH_BRIEFING_FALLBACK_MESSAGES = {
  retry: '분석 준비 중입니다. 잠시 후 다시 확인해 주세요.',
  year: '경기 연도 정보를 확인하는 중입니다. 잠시 후 다시 시도해주세요.',
  error: 'AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;

interface CoachBriefingCachePayload {
  title: string;
  message: string;
  displayText?: string;
  expiresAt: number;
}

const purgeExpiredCoachBriefingCache = (cache: Map<string, { expiresAt: number }>) => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  });
};

const readStoredCoachBriefingCache = (
  storage: Storage,
  storageKey: string,
): Map<string, CoachBriefingCachePayload> => {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return new Map();
    }

    const parsed = JSON.parse(raw) as Record<string, CoachBriefingCachePayload>;
    if (!parsed || typeof parsed !== 'object') {
      return new Map();
    }

    const now = Date.now();
    const entries = Object.entries(parsed).filter(([, value]) =>
      value && typeof value === 'object'
      && typeof value.title === 'string'
      && typeof value.message === 'string'
      && typeof value.expiresAt === 'number'
      && value.expiresAt > now
    );

    const cache = new Map(entries);
    purgeExpiredCoachBriefingCache(cache);
    return cache;
  } catch {
    return new Map();
  }
};

const writeStoredCoachBriefingCache = (
  storage: Storage,
  storageKey: string,
  cache: Map<string, CoachBriefingCachePayload>,
) => {
  try {
    const normalizedEntries = Object.fromEntries(cache.entries());
    storage.setItem(storageKey, JSON.stringify(normalizedEntries));
  } catch {
    return;
  }
};

const readSessionCoachBriefingCache = (): Map<string, CoachBriefingCachePayload> => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return new Map();
  }

  return readStoredCoachBriefingCache(
    window.sessionStorage,
    COACH_BRIEFING_SESSION_STORAGE_KEY,
  );
};

const readLocalCoachBriefingCache = (): Map<string, CoachBriefingCachePayload> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Map();
  }

  return readStoredCoachBriefingCache(window.localStorage, COACH_BRIEFING_LOCAL_STORAGE_KEY);
};

const writeSessionCoachBriefingCache = (cache: Map<string, CoachBriefingCachePayload>) => {
  if (typeof window === 'undefined') {
    return;
  }
  writeStoredCoachBriefingCache(window.sessionStorage, COACH_BRIEFING_SESSION_STORAGE_KEY, cache);
};

const writeLocalCoachBriefingCache = (cache: Map<string, CoachBriefingCachePayload>) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  writeStoredCoachBriefingCache(window.localStorage, COACH_BRIEFING_LOCAL_STORAGE_KEY, cache);
};

const readCoachBriefingFromStorageByPriority = (requestCacheKey: string | null) => {
  if (!requestCacheKey) {
    return null;
  }

  // UI state cache is preferred by hook-level state (cacheRef), then localStorage, then sessionStorage.
  const localCache = readLocalCoachBriefingCache();
  const localCached = localCache.get(requestCacheKey);
  if (localCached) {
    return localCached;
  }

  const sessionCache = readSessionCoachBriefingCache();
  const sessionCached = sessionCache.get(requestCacheKey);
  if (sessionCached) {
    return sessionCached;
  }

  return null;
};

export default function CoachBriefing({
    game,
    gameDetail,
    seasonContext,
    isPastGame,
    isFutureGame = false,
    autoEnabled,
    requestMode,
    forceManual = false,
}: CoachBriefingProps) {
    const [displayedMessage, setDisplayedMessage] = useState('');
    const [aiBriefing, setAiBriefing] = useState<NormalizedAiBriefing | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const cacheRef = useRef<Map<string, CoachBriefingCachePayload>>(new Map());
    const inFlightRef = useRef<Set<string>>(new Set());
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const homeRank = seasonContext?.home?.rank ?? null;
    const homeGamesBehind = seasonContext?.home?.gamesBehind ?? null;
    const homeRemainingGames = seasonContext?.home?.remainingGames ?? null;
    const awayRank = seasonContext?.away?.rank ?? null;
    const awayGamesBehind = seasonContext?.away?.gamesBehind ?? null;
    const awayRemainingGames = seasonContext?.away?.remainingGames ?? null;

    const MAX_COACH_RETRIES = 3;
    const RETRY_DELAYS_MS = [4000, 6000, 9000] as const;
    const MAX_BACKOFF_MS = 16000;
    const briefingLabel = 'AI 분석 내용';
    const effectiveRequestMode: CoachRequestMode = forceManual ? 'manual_detail' : requestMode;
    const effectiveAutoEnabled = autoEnabled && effectiveRequestMode === 'auto_brief';
    const normalizeBriefing = (
        source: string | RawAiBriefing | null | undefined,
        fallbackMessage = COACH_BRIEFING_DISPLAY_MESSAGE,
    ) => {
        if (!source) {
            return null;
        }
        return normalizeCoachBriefing(
            typeof source === 'string' ? { message: source } : source,
            {
                fallbackTitle: briefingLabel,
                fallbackMessage,
                fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
            },
        );
    };

    const fallbackMessage = COACH_BRIEFING_DISPLAY_MESSAGE;
    const fallbackRetryMessage = COACH_BRIEFING_FALLBACK_MESSAGES.retry;
    const fallbackYearMessage = COACH_BRIEFING_FALLBACK_MESSAGES.year;
    const fallbackErrorMessage = COACH_BRIEFING_FALLBACK_MESSAGES.error;

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

    const requestFocus = useMemo(
        () => (
            effectiveRequestMode === 'auto_brief'
                ? ['recent_form']
                : ['matchup', 'recent_form']
        ),
        [effectiveRequestMode],
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

        return `${requestMatchupKey}-${effectiveRequestMode}-${focusSignature}`;
    }, [focusSignature, effectiveRequestMode, requestMatchupKey]);

    const persistCoachBriefingCache = (data: NormalizedAiBriefing) => {
        if (!requestCacheKey) {
            return;
        }

        const payload = {
            title: data.title,
            message: data.message,
            displayText: data.displayText,
            expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
        };

        cacheRef.current.set(requestCacheKey, payload);
        const sessionCache = readSessionCoachBriefingCache();
        sessionCache.set(requestCacheKey, payload);
        writeSessionCoachBriefingCache(sessionCache);
        const localCache = readLocalCoachBriefingCache();
        localCache.set(requestCacheKey, payload);
        writeLocalCoachBriefingCache(localCache);
    };

    const restoreFromCachePayload = (payload: CoachBriefingCachePayload) => {
        const cachedValue = normalizeBriefing(payload);
        if (!cachedValue || !requestCacheKey) {
            return null;
        }

        cacheRef.current.set(requestCacheKey, {
            title: cachedValue.title,
            message: cachedValue.message,
            displayText: cachedValue.displayText,
            expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
        });
        return cachedValue;
    };

    const applyFallbackBriefing = (message: string) => {
        setAiBriefing(normalizeBriefing(message, message || COACH_BRIEFING_FALLBACK_MESSAGES.error));
        setRetryCount(0);
    };

    useEffect(() => {
        setRetryCount(0);
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, [requestCacheKey]);

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
            setRetryCount(0);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
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

        if (!effectiveAutoEnabled || !requestCacheKey) {
            setAiBriefing(null);
            setAiLoading(false);
            setRetryCount(0);
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            return;
        }

        purgeExpiredCoachBriefingCache(cacheRef.current);
        const cached = cacheRef.current.get(requestCacheKey);
        if (cached) {
            setAiBriefing(normalizeBriefing(cached));
            setAiLoading(false);
            setRetryCount(0);
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            return;
        }

        const cachedPayloadByStorage = readCoachBriefingFromStorageByPriority(requestCacheKey);
        if (cachedPayloadByStorage) {
            const cachedValue = restoreFromCachePayload(cachedPayloadByStorage);
            if (cachedValue) {
                setAiBriefing(cachedValue);
                setAiLoading(false);
                setRetryCount(0);
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                    retryTimerRef.current = null;
                }
                return;
            }
        }

        const persistCache = (data: NormalizedAiBriefing) => {
            persistCoachBriefingCache(data);
        };

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
        const initiateAnalysis = () => {
            if (!active) return;
            if (inFlightRef.current.has(requestCacheKey)) return;

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
                request_mode: effectiveRequestMode,
                game_id: game.gameId,
            }, undefined, { signal: controller.signal })
                .then((response) => {
                    if (!active) return;

                    // in_progress 또는 FAILED_LOCKED 상태는 캐시 저장 안 함
                    const isTransientState = response.in_progress === true ||
                        response.cache_state === 'FAILED_LOCKED';

                    const normalizedResponse = normalizeBriefing({
                        title: response.structuredData?.headline,
                        answer: response.answer,
                        message:
                            response.structuredData?.detailed_markdown ||
                            response.structuredData?.coach_note ||
                            response.answer ||
                            response.raw_answer ||
                            '',
                        structuredData: response.structuredData
                            ? {
                                headline: response.structuredData.headline,
                                detailed_markdown: response.structuredData.detailed_markdown,
                                coach_note: response.structuredData.coach_note,
                                analysis: response.structuredData.analysis,
                            }
                            : undefined,
                    });

                    const clearRetryTimer = () => {
                        if (retryTimerRef.current) {
                            clearTimeout(retryTimerRef.current);
                            retryTimerRef.current = null;
                        }
                    };

                    const scheduleRetryIfNeeded = (inProgress: boolean) => {
                        if (!inProgress) {
                            clearRetryTimer();
                            setRetryCount(0);
                            return;
                        }

                        if (retryCount >= MAX_COACH_RETRIES) {
                            clearRetryTimer();
                            applyFallbackBriefing(fallbackRetryMessage);
                            return;
                        }

                        clearRetryTimer();
                        const selectedDelay =
                            RETRY_DELAYS_MS[retryCount] ??
                            RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
                        const backoffMs = Math.min(selectedDelay, MAX_BACKOFF_MS);
                        retryTimerRef.current = setTimeout(() => {
                            retryTimerRef.current = null;
                            if (!active) return;
                            cacheRef.current.delete(requestCacheKey);
                            inFlightRef.current.delete(requestCacheKey);
                            setRetryCount((count) => count + 1);
                        }, backoffMs);
                    };

                    if (!isTransientState && normalizedResponse) {
                        persistCache(normalizedResponse);
                    }

                    const inProgress = response.in_progress ?? false;
                    scheduleRetryIfNeeded(inProgress);

                    if (normalizedResponse) {
                        setAiBriefing(normalizedResponse);
                    } else {
                        applyFallbackBriefing(fallbackErrorMessage);
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
                            applyFallbackBriefing(fallbackYearMessage);
                            setRetryCount(0);
                            if (retryTimerRef.current) {
                                clearTimeout(retryTimerRef.current);
                                retryTimerRef.current = null;
                            }
                            return;
                        }
                        applyFallbackBriefing(fallbackErrorMessage);
                        setRetryCount(0);
                        if (retryTimerRef.current) {
                            clearTimeout(retryTimerRef.current);
                            retryTimerRef.current = null;
                        }
                    }
                })
                .finally(() => {
                    inFlightRef.current.delete(requestCacheKey);
                    if (active) {
                        setAiLoading(false);
                    }
                });
        };

        initiateAnalysis();


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
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            inFlightRef.current.delete(requestCacheKey);
            setAiLoading(false);
        };
    }, [
        effectiveAutoEnabled,
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
        focusSignature,
        requestSeasonYear,
        retryCount,
        effectiveRequestMode,
    ]);

    const activeTitle = effectiveAutoEnabled
        ? (aiBriefing?.title ?? briefingLabel)
        : 'AI 분석 요청';
    const activeMessage = effectiveAutoEnabled
        ? (aiLoading
            ? 'AI 코치가 작전판에 낙서 중입니다. 잠시만요!'
            : ((aiBriefing?.displayText ?? aiBriefing?.message) || fallbackMessage))
        : (forceManual
            ? '예정 경기에서는 자동 분석이 적용되지 않습니다. 필요하면 직접 AI 분석을 요청하세요.'
            : isFutureGame
                ? '예정 경기에서는 자동 분석이 적용되지 않습니다. 필요하면 직접 AI 분석을 요청하세요.'
                : '핵심 경기만 자동 분석을 제공합니다. 필요한 경기에서는 직접 AI 분석을 요청하세요.');

    // Typewriter effect
    useEffect(() => {
        if (!activeMessage) { setDisplayedMessage(''); return; }
        const prefersReduced = typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            setDisplayedMessage(activeMessage);
            return;
        }
        setDisplayedMessage('');
        let i = 0;
        const message = activeMessage;
        const timer = setInterval(() => {
            setDisplayedMessage(message.substring(0, i + 1));
            i++;
            if (i >= message.length) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [activeMessage]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Card
                data-debug-auto={String(effectiveAutoEnabled)}
                data-debug-loading={String(aiLoading)}
                data-debug-request-mode={effectiveRequestMode}
                className="mb-6 overflow-hidden border border-gray-200 dark:border-border shadow-xl bg-white dark:bg-card text-gray-900 dark:text-gray-100 relative">

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
                                        {effectiveAutoEnabled
                                            ? (aiLoading ? '작전 구상 중...' : (isPastGame ? '맥락 분석 중' : '실시간 분석 중'))
                                            : (forceManual || isFutureGame)
                                                ? '경기 시작 전입니다'
                                                : '요청 버튼을 눌러주세요'}
                                    </span>
                                )}
                            </div>

                            {getSeasonBanner()}

                            <AnimatePresence mode="wait">
                                <motion.h4
                                    data-testid="coach-briefing-title"
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
                                    <span data-testid="coach-briefing-message">
                                        {displayedMessage}
                                    </span>
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
                                        {game ? (effectiveAutoEnabled ? '상세 분석' : 'AI 분석 요청') : '전력 분석'}
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
