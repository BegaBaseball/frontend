import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { Game, GameDetail } from '../types/prediction';
import CoachAnalysisDialogLauncher from './CoachAnalysisDialogLauncher';
import {
  analyzeTeam,
  CoachAnalyzeResponse,
  CoachDataQuality,
  CoachGenerationMode,
  getCoachDataQualityLabel,
  isCoachAnalyzeError,
} from '../api/coach';
import {
  COACH_BRIEFING_DISPLAY_MESSAGE,
  COACH_BRIEFING_MANUAL_HINT,
  buildCoachBriefingRequestDescriptor,
  CoachRequestMode,
  getCoachBriefingDataQualityNotice,
  RawAiBriefing,
  NormalizedAiBriefing,
  normalizeCoachBriefing,
} from '../utils/prediction';
import { useAuthAccessActions } from '../store/authStore';
import { getCurrentRelativeUrl } from '../utils/loginRedirect';

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
    isLoggedIn: boolean;
    isAuthLoading: boolean;
    autoEnabled: boolean;
    requestMode: CoachRequestMode;
    forceManual?: boolean;
}

const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v2';
// Cache priority: UI state cache (in-memory) -> localStorage -> sessionStorage
const COACH_BRIEFING_CACHE_TTL_MS = 5 * 60 * 1000;
const COACH_BRIEFING_FALLBACK_MESSAGES = {
  retry: '분석 준비 중입니다. 잠시 후 다시 확인해 주세요.',
  year: '경기 연도 정보를 확인하는 중입니다. 잠시 후 다시 시도해주세요.',
  error: 'AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;
const coachBriefingMemoryCache = new Map<string, CoachBriefingCachePayload>();
const coachBriefingInFlightRequests = new Map<string, Promise<CoachAnalyzeResponse>>();

interface CoachBriefingCachePayload {
  title: string;
  message: string;
  displayText?: string;
  expiresAt: number;
  generationMode?: CoachGenerationMode;
  dataQuality?: CoachDataQuality;
  usedEvidence?: string[];
  groundingWarnings?: string[];
  groundingReasons?: string[];
  supportedFactCount?: number;
}

interface CoachBriefingMetaState {
  generationMode?: CoachGenerationMode;
  dataQuality?: CoachDataQuality;
  usedEvidence: string[];
  groundingWarnings: string[];
  groundingReasons: string[];
  supportedFactCount?: number;
}

const resolvePitcherName = (
  pitcher?: { name?: string | null } | string | null,
): string | undefined => {
  if (!pitcher) {
    return undefined;
  }
  if (typeof pitcher === 'string') {
    const normalized = pitcher.trim();
    return normalized || undefined;
  }
  const normalized = pitcher.name?.trim();
  return normalized || undefined;
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

const normalizeCoachBriefingMeta = (
  payload?: Partial<CoachBriefingMetaState> | null,
): CoachBriefingMetaState | null => {
  if (!payload) {
    return null;
  }
  const usedEvidence = Array.isArray(payload.usedEvidence)
    ? payload.usedEvidence.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const groundingWarnings = Array.isArray(payload.groundingWarnings)
    ? payload.groundingWarnings.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const groundingReasons = Array.isArray(payload.groundingReasons)
    ? payload.groundingReasons.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const supportedFactCount = (
    typeof payload.supportedFactCount === 'number'
    && Number.isFinite(payload.supportedFactCount)
    && payload.supportedFactCount >= 0
  ) ? payload.supportedFactCount : undefined;
  if (
    !payload.generationMode
    && !payload.dataQuality
    && usedEvidence.length === 0
    && groundingWarnings.length === 0
    && groundingReasons.length === 0
    && supportedFactCount === undefined
  ) {
    return null;
  }
  return {
    generationMode: payload.generationMode,
    dataQuality: payload.dataQuality,
    usedEvidence,
    groundingWarnings,
    groundingReasons,
    supportedFactCount,
  };
};

const getCoachBriefingBadgeClassName = (dataQuality?: CoachDataQuality): string => {
  if (dataQuality === 'grounded') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-200 dark:border-emerald-800/30';
  }
  if (dataQuality === 'partial') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-800/30';
  }
  if (dataQuality === 'insufficient') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-200 dark:border-rose-800/30';
  }
  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-secondary dark:text-gray-200 dark:border-border';
};

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

  // UI state cache is preferred by in-memory cache, then localStorage, then sessionStorage.
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
    isLoggedIn,
    isAuthLoading,
    autoEnabled,
    requestMode,
    forceManual = false,
}: CoachBriefingProps) {
    const { logout, requireLogin } = useAuthAccessActions();
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [displayedMessage, setDisplayedMessage] = useState('');
    const [aiBriefing, setAiBriefing] = useState<NormalizedAiBriefing | null>(null);
    const [briefingMeta, setBriefingMeta] = useState<CoachBriefingMetaState | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [authExpired, setAuthExpired] = useState(false);
    const [hasActivatedAutoBriefing, setHasActivatedAutoBriefing] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryCountRef = useRef(0);
    const requestCacheKeyRef = useRef<string | null>(null);
    const currentRequestFingerprintRef = useRef<string | null>(null);
    const successfulRequestFingerprintRef = useRef<string | null>(null);
    const requestSeqRef = useRef(0);
    const homeRank = seasonContext?.home?.rank ?? null;
    const homeGamesBehind = seasonContext?.home?.gamesBehind ?? null;
    const homeRemainingGames = seasonContext?.home?.remainingGames ?? null;
    const awayRank = seasonContext?.away?.rank ?? null;
    const awayGamesBehind = seasonContext?.away?.gamesBehind ?? null;
    const awayRemainingGames = seasonContext?.away?.remainingGames ?? null;
    const homePitcherName = resolvePitcherName(gameDetail?.homePitcher ?? game?.homePitcher);
    const awayPitcherName = resolvePitcherName(gameDetail?.awayPitcher ?? game?.awayPitcher);
    const requestLeagueTypeCode = resolveLeagueTypeCode(game?.leagueType, game?.postSeasonSeries);

    const MAX_COACH_RETRIES = 3;
    const RETRY_DELAYS_MS = [4000, 6000, 9000] as const;
    const MAX_BACKOFF_MS = 16000;
    const effectiveRequestMode: CoachRequestMode = forceManual ? 'manual_detail' : requestMode;
    const effectiveAutoEnabled = autoEnabled && effectiveRequestMode === 'auto_brief';
    const shouldStartAutoBriefing = effectiveAutoEnabled && hasActivatedAutoBriefing;
    const briefingLabel = effectiveAutoEnabled ? '실데이터 브리핑' : 'AI 코치 분석';
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

    const fallbackMessage = effectiveAutoEnabled
        ? '실데이터 브리핑을 준비하지 못했습니다.'
        : COACH_BRIEFING_DISPLAY_MESSAGE;
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
    const requestSeasonYear = useMemo(() => resolveSeasonYear(), [game?.gameId, game?.gameDate, game?.seasonId]);
    const requestDescriptor = useMemo(() => buildCoachBriefingRequestDescriptor({
        game,
        requestMode: effectiveRequestMode,
        focus: requestFocus,
        requestSeasonYear,
        requestLeagueTypeCode,
        homePitcherName,
        awayPitcherName,
        homeSeasonContext: (
            homeRank != null && homeGamesBehind != null && homeRemainingGames != null
        ) ? {
            rank: homeRank,
            gamesBehind: homeGamesBehind,
            remainingGames: homeRemainingGames,
        } : null,
        awaySeasonContext: (
            awayRank != null && awayGamesBehind != null && awayRemainingGames != null
        ) ? {
            rank: awayRank,
            gamesBehind: awayGamesBehind,
            remainingGames: awayRemainingGames,
        } : null,
    }), [
        awayGamesBehind,
        awayPitcherName,
        awayRank,
        awayRemainingGames,
        effectiveRequestMode,
        game?.awayTeam,
        game?.gameDate,
        game?.gameId,
        game?.homeTeam,
        game?.leagueType,
        game?.postSeasonSeries,
        game?.seasonId,
        game?.seriesGameNo,
        homeGamesBehind,
        homePitcherName,
        homeRank,
        homeRemainingGames,
        requestFocus,
        requestLeagueTypeCode,
        requestSeasonYear,
    ]);
    const requestCacheKey = requestDescriptor?.requestCacheKey ?? null;
    const isGuestBlocked = !isLoggedIn && !isAuthLoading;
    const isAuthCheckPending = isAuthLoading;
    const loginRequiredMessage = effectiveAutoEnabled
        ? '실데이터 브리핑은 로그인 후 제공됩니다.'
        : 'AI 코치 상세 분석은 로그인 후 제공됩니다.';
    const authExpiredMessage = effectiveAutoEnabled
        ? '로그인 세션이 만료되었습니다. 다시 로그인 후 브리핑을 확인해주세요.'
        : '로그인 세션이 만료되었습니다. 다시 로그인 후 상세 분석을 확인해주세요.';
    const dataQualityNotice = useMemo(
        () => getCoachBriefingDataQualityNotice(
            briefingMeta?.dataQuality,
            briefingMeta?.groundingReasons,
        ),
        [briefingMeta?.dataQuality, briefingMeta?.groundingReasons],
    );
    const showLoginAction = isGuestBlocked || authExpired;
    const isAwaitingAutoBriefing =
        effectiveAutoEnabled
        && !shouldStartAutoBriefing
        && !isGuestBlocked
        && !isAuthCheckPending
        && !authExpired;
    const handleLoginAction = () => {
        const redirectPath = getCurrentRelativeUrl();
        if (authExpired) {
            logout(true);
        }
        requireLogin(redirectPath);
    };

    useEffect(() => {
        if (!effectiveAutoEnabled) {
            setHasActivatedAutoBriefing(false);
            return;
        }

        if (hasActivatedAutoBriefing) {
            return;
        }

        if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
            setHasActivatedAutoBriefing(true);
            return;
        }

        const target = cardRef.current;
        if (!target) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
                    setHasActivatedAutoBriefing(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '120px 0px 160px 0px',
                threshold: 0.1,
            },
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [effectiveAutoEnabled, hasActivatedAutoBriefing]);

    const persistCoachBriefingCache = (
      data: NormalizedAiBriefing,
      meta: CoachBriefingMetaState | null,
    ) => {
        if (!requestCacheKey) {
            return;
        }

        const payload = {
            title: data.title,
            message: data.message,
            displayText: data.displayText,
            expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
            generationMode: meta?.generationMode,
            dataQuality: meta?.dataQuality,
            usedEvidence: meta?.usedEvidence,
            groundingWarnings: meta?.groundingWarnings,
            groundingReasons: meta?.groundingReasons,
            supportedFactCount: meta?.supportedFactCount,
        };

        coachBriefingMemoryCache.set(requestCacheKey, payload);
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
        const cachedMeta = normalizeCoachBriefingMeta({
          generationMode: payload.generationMode,
          dataQuality: payload.dataQuality,
          usedEvidence: payload.usedEvidence,
          groundingWarnings: payload.groundingWarnings,
          groundingReasons: payload.groundingReasons,
          supportedFactCount: payload.supportedFactCount,
        });

        coachBriefingMemoryCache.set(requestCacheKey, {
            title: cachedValue.title,
            message: cachedValue.message,
            displayText: cachedValue.displayText,
            expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
            generationMode: cachedMeta?.generationMode,
            dataQuality: cachedMeta?.dataQuality,
            usedEvidence: cachedMeta?.usedEvidence,
            groundingWarnings: cachedMeta?.groundingWarnings,
            groundingReasons: cachedMeta?.groundingReasons,
            supportedFactCount: cachedMeta?.supportedFactCount,
        });
        setBriefingMeta(cachedMeta);
        return cachedValue;
    };

    const applyFallbackBriefing = (message: string) => {
        setAiBriefing(normalizeBriefing(message, message || COACH_BRIEFING_FALLBACK_MESSAGES.error));
        setBriefingMeta({
          generationMode: 'evidence_fallback',
          dataQuality: 'insufficient',
          usedEvidence: [],
          groundingWarnings: [],
          groundingReasons: [],
        });
        retryCountRef.current = 0;
        setRetryCount(0);
    };

    const clearRetryTimer = () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    };

    const resetRetryState = () => {
        retryCountRef.current = 0;
        setRetryCount(0);
    };

    const clearActiveRequest = () => {
        requestSeqRef.current += 1;
        currentRequestFingerprintRef.current = null;
    };

    useEffect(() => {
        if (requestCacheKeyRef.current === requestCacheKey) {
            return;
        }

        requestCacheKeyRef.current = requestCacheKey;
        clearRetryTimer();
        resetRetryState();
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
        if (!shouldStartAutoBriefing || !requestDescriptor || !requestCacheKey) {
            clearActiveRequest();
            setAiBriefing(null);
            setBriefingMeta(null);
            setAiLoading(false);
            setAuthExpired(false);
            successfulRequestFingerprintRef.current = null;
            clearRetryTimer();
            resetRetryState();
            return;
        }

        if (isAuthCheckPending) {
            clearActiveRequest();
            clearRetryTimer();
            resetRetryState();
            setAiLoading(false);
            return;
        }

        if (isGuestBlocked) {
            clearActiveRequest();
            setAiBriefing(null);
            setBriefingMeta(null);
            setAiLoading(false);
            setAuthExpired(false);
            successfulRequestFingerprintRef.current = null;
            clearRetryTimer();
            resetRetryState();
            return;
        }

        purgeExpiredCoachBriefingCache(coachBriefingMemoryCache);
        const cached = coachBriefingMemoryCache.get(requestCacheKey);
        if (cached) {
            setAuthExpired(false);
            setAiBriefing(normalizeBriefing(cached));
            setBriefingMeta(normalizeCoachBriefingMeta({
              generationMode: cached.generationMode,
              dataQuality: cached.dataQuality,
              usedEvidence: cached.usedEvidence,
              groundingWarnings: cached.groundingWarnings,
              groundingReasons: cached.groundingReasons,
              supportedFactCount: cached.supportedFactCount,
            }));
            successfulRequestFingerprintRef.current = requestCacheKey;
            setAiLoading(false);
            clearRetryTimer();
            resetRetryState();
            return;
        }

        const cachedPayloadByStorage = readCoachBriefingFromStorageByPriority(requestCacheKey);
        if (cachedPayloadByStorage) {
            const cachedValue = restoreFromCachePayload(cachedPayloadByStorage);
            if (cachedValue) {
                setAuthExpired(false);
                setAiBriefing(cachedValue);
                successfulRequestFingerprintRef.current = requestCacheKey;
                setAiLoading(false);
                clearRetryTimer();
                resetRetryState();
                return;
            }
        }

        const requestSeq = requestSeqRef.current + 1;
        requestSeqRef.current = requestSeq;
        currentRequestFingerprintRef.current = requestCacheKey;
        let keepLoadingAfterResponse = false;

        const matchesCurrentRequest = () => (
            requestSeqRef.current === requestSeq
            && currentRequestFingerprintRef.current === requestCacheKey
        );
        const canOverrideSuccessfulBriefing = () => (
            successfulRequestFingerprintRef.current !== requestCacheKey
        );
        const preserveSuccessfulBriefing = (
            successfulRequestFingerprintRef.current === requestCacheKey
            && aiBriefing != null
        );

        setAuthExpired(false);
        if (!preserveSuccessfulBriefing) {
            setAiBriefing(null);
            setBriefingMeta(null);
        }
        setAiLoading(true);
        let sharedRequest = coachBriefingInFlightRequests.get(requestCacheKey);
        if (!sharedRequest) {
            sharedRequest = analyzeTeam(requestDescriptor.requestPayload);
            coachBriefingInFlightRequests.set(requestCacheKey, sharedRequest);
        }

        sharedRequest
            .then((response) => {
                if (!matchesCurrentRequest()) {
                    return;
                }

                const shouldRetry = response.in_progress === true
                    || response.cache_state === 'FAILED_LOCKED';

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
                            summary: response.structuredData.analysis?.summary,
                            detailed_markdown: response.structuredData.detailed_markdown,
                            coach_note: response.structuredData.coach_note,
                            analysis: response.structuredData.analysis,
                        }
                        : undefined,
                });
                const normalizedMeta = normalizeCoachBriefingMeta({
                  generationMode: response.generation_mode,
                  dataQuality: response.data_quality,
                  usedEvidence: response.used_evidence,
                  groundingWarnings: response.grounding_warnings,
                  groundingReasons: response.grounding_reasons,
                  supportedFactCount: response.supported_fact_count,
                });

                const scheduleRetryIfNeeded = (retryable: boolean) => {
                    if (!retryable) {
                        clearRetryTimer();
                        resetRetryState();
                        return false;
                    }

                    const currentRetryCount = retryCountRef.current;
                    if (currentRetryCount >= MAX_COACH_RETRIES) {
                        clearRetryTimer();
                        resetRetryState();
                        if (canOverrideSuccessfulBriefing()) {
                            applyFallbackBriefing(fallbackRetryMessage);
                        }
                        return false;
                    }

                    clearRetryTimer();
                    const selectedDelay =
                        RETRY_DELAYS_MS[currentRetryCount] ??
                        RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
                    const backoffMs = Math.min(selectedDelay, MAX_BACKOFF_MS);
                    const nextRetryCount = currentRetryCount + 1;
                    retryTimerRef.current = setTimeout(() => {
                        retryTimerRef.current = null;
                        if (!matchesCurrentRequest()) {
                            return;
                        }
                        coachBriefingMemoryCache.delete(requestCacheKey);
                        retryCountRef.current = nextRetryCount;
                        setRetryCount(nextRetryCount);
                    }, backoffMs);
                    return true;
                };

                if (normalizedResponse && !shouldRetry) {
                    persistCoachBriefingCache(normalizedResponse, normalizedMeta);
                    successfulRequestFingerprintRef.current = requestCacheKey;
                }

                keepLoadingAfterResponse = scheduleRetryIfNeeded(shouldRetry);

                if (shouldRetry || !matchesCurrentRequest()) {
                    return;
                }

                if (normalizedResponse) {
                    setAiBriefing(normalizedResponse);
                    setBriefingMeta(normalizedMeta);
                    return;
                }

                if (canOverrideSuccessfulBriefing()) {
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
                if (!matchesCurrentRequest()) {
                    return;
                }
                if (isCoachAnalyzeError(error) && error.code === 'AUTH_EXPIRED') {
                    clearActiveRequest();
                    setAiLoading(false);
                    setAuthExpired(true);
                    setAiBriefing(null);
                    setBriefingMeta(null);
                    clearRetryTimer();
                    resetRetryState();
                    return;
                }
                if (
                    abortMessage.includes('unable_to_resolve_analysis_year') ||
                    abortMessage.includes('invalid_season_year_for_analysis')
                ) {
                    if (canOverrideSuccessfulBriefing()) {
                        applyFallbackBriefing(fallbackYearMessage);
                    }
                    clearRetryTimer();
                    resetRetryState();
                    return;
                }
                if (canOverrideSuccessfulBriefing()) {
                    applyFallbackBriefing(fallbackErrorMessage);
                }
                clearRetryTimer();
                resetRetryState();
            })
            .finally(() => {
                if (coachBriefingInFlightRequests.get(requestCacheKey) === sharedRequest) {
                    coachBriefingInFlightRequests.delete(requestCacheKey);
                }
                if (!matchesCurrentRequest()) {
                    return;
                }
                if (!keepLoadingAfterResponse) {
                    currentRequestFingerprintRef.current = null;
                }
                setAiLoading(keepLoadingAfterResponse);
            });

        return () => {
            clearRetryTimer();
            requestSeqRef.current += 1;
            currentRequestFingerprintRef.current = null;
        };
    }, [
        aiBriefing,
        shouldStartAutoBriefing,
        isAuthCheckPending,
        isGuestBlocked,
        requestCacheKey,
        requestDescriptor,
        retryCount,
    ]);

    const activeTitle = effectiveAutoEnabled
        ? (aiBriefing?.title ?? '실데이터 브리핑')
        : 'AI 코치 상세 분석';
    const activeMessage = authExpired
        ? authExpiredMessage
        : isGuestBlocked
            ? loginRequiredMessage
            : isAuthCheckPending && !aiBriefing
                ? '로그인 상태를 확인하는 중입니다.'
                : isAwaitingAutoBriefing
                    ? '이 브리핑 카드를 확인하면 실데이터 브리핑을 불러옵니다.'
                : effectiveAutoEnabled
                    ? (aiLoading
                        ? '실데이터를 모아 경기 맥락 브리핑을 정리하는 중입니다.'
                        : ((aiBriefing?.displayText ?? aiBriefing?.message) || fallbackMessage))
                    : (forceManual
                        ? '예정 경기에서는 자동 브리핑이 없습니다. 현재 매치업의 승부처는 AI 코치 상세 분석에서 확인할 수 있습니다.'
                        : isFutureGame
                            ? '예정 경기에서는 자동 브리핑이 없습니다. 현재 매치업의 승부처는 AI 코치 상세 분석에서 확인할 수 있습니다.'
                            : '자동 브리핑은 핵심 경기만 제공합니다. 현재 매치업의 해석은 AI 코치 상세 분석에서 확인할 수 있습니다.');

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
        const message = activeMessage;
        let i = 0;
        let rafId: number;
        let lastTime = 0;
        const step = (time: number) => {
            if (time - lastTime >= 50) {
                i = Math.min(i + 2, message.length);
                setDisplayedMessage(message.substring(0, i));
                lastTime = time;
            }
            if (i < message.length) rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [activeMessage]);

    return (
        <div ref={cardRef} data-testid="coach-briefing-card">
            <Card
                data-debug-auto={String(effectiveAutoEnabled)}
                data-debug-activated={String(hasActivatedAutoBriefing)}
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
                                {briefingMeta?.dataQuality && (
                                    <span
                                        data-testid="coach-briefing-quality-badge"
                                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${getCoachBriefingBadgeClassName(briefingMeta.dataQuality)}`}
                                    >
                                        {getCoachDataQualityLabel(briefingMeta.dataQuality)}
                                    </span>
                                )}
                                {briefingMeta?.usedEvidence.length ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-border text-[11px] font-medium">
                                        근거 {briefingMeta.usedEvidence.length}개
                                    </span>
                                ) : null}
                                {briefingMeta?.supportedFactCount && briefingMeta.supportedFactCount > 0 ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-border text-[11px] font-medium">
                                        확인 사실 {briefingMeta.supportedFactCount}개
                                    </span>
                                ) : null}
                                {game && (
                                    <span className="text-[11px] text-gray-500 dark:text-gray-300 font-medium">
                                        {effectiveAutoEnabled
                                            ? (aiLoading ? '실데이터 정리 중...' : (isPastGame ? '경기 맥락 브리핑' : '실시간 브리핑'))
                                            : (forceManual || isFutureGame)
                                                ? '상세 분석으로 이동'
                                                : '상세 분석으로 이동'}
                                    </span>
                                )}
                            </div>

                            {getSeasonBanner()}

                            <h4
                                data-testid="coach-briefing-title"
                                className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight tracking-tight break-keep"
                            >
                                {activeTitle}
                            </h4>

                            <div className="min-h-[2.5rem]">
                                <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    <span data-testid="coach-briefing-message">
                                        {displayedMessage}
                                    </span>
                                    {aiLoading && (
                                        <span
                                            className="inline-block w-1 h-3 bg-emerald-200/80 ml-1 align-middle animate-pulse"
                                        />
                                    )}
                                </p>
                                {dataQualityNotice ? (
                                    <div
                                        data-testid="coach-briefing-data-quality-note"
                                        className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200"
                                    >
                                        <p className="font-medium break-keep">
                                            {dataQualityNotice.message}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {dataQualityNotice.reasons.map((reason) => (
                                                <span
                                                    key={reason}
                                                    data-testid="coach-briefing-grounding-reason"
                                                    className="rounded-full border border-amber-300/70 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100"
                                                >
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : briefingMeta?.groundingWarnings.length ? (
                                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 font-medium break-keep">
                                        {briefingMeta.groundingWarnings[0]}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        {showLoginAction ? (
                            <Button
                                type="button"
                                data-testid="coach-briefing-login-cta"
                                className="w-full md:w-auto h-10 bg-emerald-950 hover:bg-emerald-900 text-emerald-50 border border-emerald-700/60 rounded-xl shadow-sm"
                                onClick={handleLoginAction}
                            >
                                <Zap className="w-4 h-4 mr-2 text-emerald-50" />
                                <span className="text-xs font-semibold">
                                    {authExpired
                                        ? '다시 로그인하기'
                                        : effectiveAutoEnabled
                                            ? '로그인하고 브리핑 보기'
                                            : '로그인하고 상세 분석 보기'}
                                </span>
                            </Button>
                        ) : isAuthCheckPending ? (
                            <Button
                                type="button"
                                disabled
                                data-testid="coach-briefing-auth-loading"
                                className="w-full md:w-auto h-10 bg-emerald-950/70 text-emerald-50 border border-emerald-700/40 rounded-xl shadow-sm disabled:opacity-100"
                            >
                                <Zap className="w-4 h-4 mr-2 text-emerald-50" />
                                <span className="text-xs font-semibold">
                                    로그인 확인 중...
                                </span>
                            </Button>
                        ) : (
                            <CoachAnalysisDialogLauncher
                                initialTeam={game?.homeTeam}
                                homeTeamId={game?.homeTeam}
                                awayTeamId={game?.awayTeam}
                                gameId={game?.gameId}
                                gameDate={game?.gameDate}
                                seasonId={game?.seasonId}
                                leagueType={game?.leagueType}
                                round={game?.postSeasonSeries}
                                gameNo={game?.seriesGameNo}
                                homePitcher={homePitcherName}
                                awayPitcher={awayPitcherName}
                                buttonLabel={game ? 'AI 코치 상세 분석' : '전력 분석'}
                            />
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
