import { useEffect, useMemo, useRef, useState } from 'react';

import {
  analyzeTeam,
  CoachAnalyzeResponse,
  CoachDataQuality,
  CoachGenerationMode,
  isCoachAnalyzeError,
} from '../api/coach';
import type { Game, GameDetail } from '../types/prediction';
import { MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE } from '../utils/errorUtils';
import {
  buildCoachBriefingRequestDescriptor,
  type CoachRequestMode,
  type NormalizedAiBriefing,
  normalizeCoachBriefing,
  type RawAiBriefing,
} from '../utils/prediction';

export interface CoachBriefingMetaState {
  generationMode?: CoachGenerationMode;
  dataQuality?: CoachDataQuality;
  cacheState?: string;
  manualDataRequired?: boolean;
  usedEvidence: string[];
  groundingWarnings: string[];
  groundingReasons: string[];
  supportedFactCount?: number;
}

interface CoachBriefingAutoRuntimeProps {
  game: Game | null;
  gameDetail?: GameDetail | null;
  seasonContext?: {
    home: { rank: number; gamesBehind: number; remainingGames: number } | null;
    away: { rank: number; gamesBehind: number; remainingGames: number } | null;
    canCallAI: boolean;
  };
  requestMode: CoachRequestMode;
  autoEnabled: boolean;
  shouldStartAutoBriefing: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  onBriefingChange: (value: NormalizedAiBriefing | null) => void;
  onMetaChange: (value: CoachBriefingMetaState | null) => void;
  onLoadingChange: (value: boolean) => void;
  onAuthExpiredChange: (value: boolean) => void;
}

const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v2';
const COACH_BRIEFING_CACHE_TTL_MS = 5 * 60 * 1000;
const COACH_BRIEFING_FALLBACK_MESSAGES = {
  locked: '현재 브리핑 캐시가 잠겨 있습니다. 운영 갱신 후 다시 확인해 주세요.',
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
  cacheState?: string;
  manualDataRequired?: boolean;
  usedEvidence?: string[];
  groundingWarnings?: string[];
  groundingReasons?: string[];
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
    && !payload.cacheState
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
    cacheState: payload.cacheState,
    manualDataRequired: payload.manualDataRequired === true,
    usedEvidence,
    groundingWarnings,
    groundingReasons,
    supportedFactCount,
  };
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

export default function CoachBriefingAutoRuntime({
  game,
  gameDetail,
  seasonContext,
  requestMode,
  autoEnabled,
  shouldStartAutoBriefing,
  isLoggedIn,
  isAuthLoading,
  onBriefingChange,
  onMetaChange,
  onLoadingChange,
  onAuthExpiredChange,
}: CoachBriefingAutoRuntimeProps) {
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const requestCacheKeyRef = useRef<string | null>(null);
  const currentRequestFingerprintRef = useRef<string | null>(null);
  const successfulRequestFingerprintRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);
  const aiBriefingRef = useRef<NormalizedAiBriefing | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
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
  const effectiveRequestMode: CoachRequestMode = requestMode;
  const briefingLabel = autoEnabled ? '실데이터 브리핑' : 'AI 코치 분석';
  const isGuestBlocked = !isLoggedIn && !isAuthLoading;
  const isAuthCheckPending = isAuthLoading;
  const fallbackRetryMessage = COACH_BRIEFING_FALLBACK_MESSAGES.retry;
  const fallbackYearMessage = COACH_BRIEFING_FALLBACK_MESSAGES.year;
  const fallbackErrorMessage = COACH_BRIEFING_FALLBACK_MESSAGES.error;

  const normalizeBriefing = (
    source: string | RawAiBriefing | null | undefined,
    fallbackMessage: string,
  ) => {
    if (!source) {
      return null;
    }
    return normalizeCoachBriefing(
      typeof source === 'string' ? { message: source } : source,
      {
        fallbackTitle: briefingLabel,
        fallbackMessage,
        fallbackHintMessage: '예정 경기에서는 자동 브리핑이 없습니다. 현재 매치업의 승부처는 AI 코치 상세 분석에서 확인할 수 있습니다.',
      },
    );
  };

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

  const requestDescriptor = useMemo(() => buildCoachBriefingRequestDescriptor({
    game,
    requestMode: effectiveRequestMode,
    focus: ['recent_form'],
    requestSeasonYear: resolveSeasonYear(),
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
    requestLeagueTypeCode,
  ]);
  const requestCacheKey = requestDescriptor?.requestCacheKey ?? null;

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const resetRetryState = () => {
    retryCountRef.current = 0;
  };

  const clearActiveRequest = () => {
    requestSeqRef.current += 1;
    currentRequestFingerprintRef.current = null;
  };

  useEffect(() => {
    aiBriefingRef.current = null;
  }, [game?.gameId]);

  useEffect(() => {
    if (requestCacheKeyRef.current === requestCacheKey) {
      return;
    }

    requestCacheKeyRef.current = requestCacheKey;
    clearRetryTimer();
    resetRetryState();
  }, [requestCacheKey]);

  useEffect(() => {
    if (!shouldStartAutoBriefing || !requestDescriptor || !requestCacheKey) {
      clearActiveRequest();
      onBriefingChange(null);
      onMetaChange(null);
      onLoadingChange(false);
      onAuthExpiredChange(false);
      successfulRequestFingerprintRef.current = null;
      clearRetryTimer();
      resetRetryState();
      return;
    }

    if (isAuthCheckPending) {
      clearActiveRequest();
      clearRetryTimer();
      resetRetryState();
      onLoadingChange(false);
      return;
    }

    if (isGuestBlocked) {
      clearActiveRequest();
      onBriefingChange(null);
      onMetaChange(null);
      onLoadingChange(false);
      onAuthExpiredChange(false);
      successfulRequestFingerprintRef.current = null;
      clearRetryTimer();
      resetRetryState();
      return;
    }

    purgeExpiredCoachBriefingCache(coachBriefingMemoryCache);
    const cached = coachBriefingMemoryCache.get(requestCacheKey);
    if (cached) {
      onAuthExpiredChange(false);
      const cachedBriefing = normalizeBriefing(cached, '실데이터 브리핑을 준비하지 못했습니다.');
      aiBriefingRef.current = cachedBriefing;
      onBriefingChange(cachedBriefing);
      onMetaChange(normalizeCoachBriefingMeta({
        generationMode: cached.generationMode,
        dataQuality: cached.dataQuality,
        cacheState: cached.cacheState,
        usedEvidence: cached.usedEvidence,
        groundingWarnings: cached.groundingWarnings,
        groundingReasons: cached.groundingReasons,
        supportedFactCount: cached.supportedFactCount,
      }));
      successfulRequestFingerprintRef.current = requestCacheKey;
      onLoadingChange(false);
      clearRetryTimer();
      resetRetryState();
      return;
    }

    const persistCoachBriefingCache = (
      data: NormalizedAiBriefing,
      meta: CoachBriefingMetaState | null,
    ) => {
      const payload = {
        title: data.title,
        message: data.message,
        displayText: data.displayText,
        expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
        generationMode: meta?.generationMode,
        dataQuality: meta?.dataQuality,
        cacheState: meta?.cacheState,
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
      const cachedValue = normalizeBriefing(payload, '실데이터 브리핑을 준비하지 못했습니다.');
      if (!cachedValue) {
        return null;
      }
      const cachedMeta = normalizeCoachBriefingMeta({
        generationMode: payload.generationMode,
        dataQuality: payload.dataQuality,
        cacheState: payload.cacheState,
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
        cacheState: cachedMeta?.cacheState,
        usedEvidence: cachedMeta?.usedEvidence,
        groundingWarnings: cachedMeta?.groundingWarnings,
        groundingReasons: cachedMeta?.groundingReasons,
        supportedFactCount: cachedMeta?.supportedFactCount,
      });
      onMetaChange(cachedMeta);
      return cachedValue;
    };

    const cachedPayloadByStorage = readCoachBriefingFromStorageByPriority(requestCacheKey);
    if (cachedPayloadByStorage) {
      const cachedValue = restoreFromCachePayload(cachedPayloadByStorage);
      if (cachedValue) {
        onAuthExpiredChange(false);
        aiBriefingRef.current = cachedValue;
        onBriefingChange(cachedValue);
        successfulRequestFingerprintRef.current = requestCacheKey;
        onLoadingChange(false);
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
      && aiBriefingRef.current != null
    );

    onAuthExpiredChange(false);
    if (!preserveSuccessfulBriefing) {
      aiBriefingRef.current = null;
      onBriefingChange(null);
      onMetaChange(null);
    }
    onLoadingChange(true);
    let sharedRequest = coachBriefingInFlightRequests.get(requestCacheKey);
    if (!sharedRequest) {
      sharedRequest = analyzeTeam(requestDescriptor.requestPayload);
      coachBriefingInFlightRequests.set(requestCacheKey, sharedRequest);
    }

    const applyFallbackBriefing = (message: string, cacheState?: string) => {
      const fallbackBriefing = normalizeBriefing(message, message || COACH_BRIEFING_FALLBACK_MESSAGES.error);
      aiBriefingRef.current = fallbackBriefing;
      onBriefingChange(fallbackBriefing);
      onMetaChange({
        generationMode: 'evidence_fallback',
        dataQuality: 'insufficient',
        cacheState,
        manualDataRequired: false,
        usedEvidence: [],
        groundingWarnings: [],
        groundingReasons: [],
      });
      resetRetryState();
    };

    sharedRequest
      .then((response) => {
        if (!matchesCurrentRequest()) {
          return;
        }

        const cacheState = typeof response.cache_state === 'string'
          ? response.cache_state
          : undefined;
        const shouldRetry = response.in_progress === true;
        const isFailedLocked = cacheState === 'FAILED_LOCKED';

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
        }, '실데이터 브리핑을 준비하지 못했습니다.');
        const normalizedMeta = normalizeCoachBriefingMeta({
          generationMode: response.generation_mode,
          dataQuality: response.data_quality,
          cacheState,
          manualDataRequired: response.manual_data_request != null,
          usedEvidence: response.used_evidence,
          groundingWarnings: response.grounding_warnings,
          groundingReasons: response.grounding_reasons,
          supportedFactCount: response.supported_fact_count,
        });

        if (response.manual_data_request) {
          clearRetryTimer();
          resetRetryState();
          const manualBriefing = normalizeBriefing(
            MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
            MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
          );
          aiBriefingRef.current = manualBriefing;
          onBriefingChange(manualBriefing);
          onMetaChange(normalizedMeta ?? normalizeCoachBriefingMeta({
            generationMode: 'evidence_fallback',
            dataQuality: 'insufficient',
            cacheState,
            manualDataRequired: true,
            usedEvidence: [],
            groundingWarnings: [],
            groundingReasons: [],
            supportedFactCount: 0,
          }));
          return;
        }

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
            setRetryNonce((previous) => previous + 1);
          }, backoffMs);
          return true;
        };

        if (normalizedResponse && !shouldRetry) {
          persistCoachBriefingCache(normalizedResponse, normalizedMeta);
          successfulRequestFingerprintRef.current = requestCacheKey;
        }

        if (isFailedLocked) {
          clearRetryTimer();
          resetRetryState();

          const lockedMessage = COACH_BRIEFING_FALLBACK_MESSAGES.locked;
          const lockedBriefing = normalizedResponse || normalizeBriefing(
            lockedMessage,
            lockedMessage,
          );
          aiBriefingRef.current = lockedBriefing;
          onBriefingChange(lockedBriefing);
          onMetaChange(normalizedMeta ?? normalizeCoachBriefingMeta({
            generationMode: 'evidence_fallback',
            dataQuality: 'insufficient',
            cacheState,
            manualDataRequired: false,
            usedEvidence: [],
            groundingWarnings: [],
            groundingReasons: [],
            supportedFactCount: 0,
          }));
          return;
        }

        keepLoadingAfterResponse = scheduleRetryIfNeeded(shouldRetry);

        if (shouldRetry || !matchesCurrentRequest()) {
          return;
        }

        if (normalizedResponse) {
          aiBriefingRef.current = normalizedResponse;
          onBriefingChange(normalizedResponse);
          onMetaChange(normalizedMeta);
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
          onLoadingChange(false);
          onAuthExpiredChange(true);
          aiBriefingRef.current = null;
          onBriefingChange(null);
          onMetaChange(null);
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
          const publicMessage = (
            isCoachAnalyzeError(error)
            && error.code === 'REQUEST_FAILED'
            && error.message.trim().length > 0
          ) ? error.message : fallbackErrorMessage;
          applyFallbackBriefing(publicMessage);
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
        onLoadingChange(keepLoadingAfterResponse);
      });

    return () => {
      clearRetryTimer();
      requestSeqRef.current += 1;
      currentRequestFingerprintRef.current = null;
    };
  }, [
    autoEnabled,
    game,
    gameDetail,
    isAuthCheckPending,
    isGuestBlocked,
    onAuthExpiredChange,
    onBriefingChange,
    onLoadingChange,
    onMetaChange,
    requestCacheKey,
    requestDescriptor,
    retryNonce,
    shouldStartAutoBriefing,
  ]);

  return null;
}
