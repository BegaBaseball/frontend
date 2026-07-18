import { useEffect, useMemo, useRef, useState } from 'react';

import {
  analyzeTeam,
  CoachAnalyzeError,
  isCoachAnalyzeError,
} from '../api/coach';
import { resolveRateLimitErrorDetails } from '../api/aiStreamError';
import type { Game, GameDetail } from '../types/prediction';
import { MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE } from '../utils/errorUtils';
import { ensureRealtimeAuthSession } from '../utils/realtimeAuth';
import {
  buildCoachBriefingRequestDescriptor,
  type CoachAnalysisType,
  type CoachRequestMode,
} from '../utils/coachBriefingRequestDescriptor';
import type { NormalizedAiBriefing } from '../utils/prediction';
import {
  COACH_BRIEFING_CACHE_TTL_MS,
  COACH_BRIEFING_FALLBACK_MESSAGES,
  cleanCoachBriefingText,
  coachBriefingInFlightRequests,
  coachBriefingMemoryCache,
  isRealtimeAuthExpiredEvent,
  isUsefulCoachBriefingText,
  normalizeCoachBriefingMeta,
  parseCoachBriefingPayload,
  purgeExpiredCoachBriefingCache,
  readSessionCoachBriefingCache,
  resolveLeagueTypeCode,
  resolvePitcherName,
  writeSessionCoachBriefingCache,
  type CoachBriefingCachePayload,
  type CoachBriefingMetaState,
  type CoachBriefingSource,
} from '../utils/coachBriefingCache';

interface CoachBriefingAutoRuntimeProps {
  game: Game | null;
  gameDetail?: GameDetail | null;
  seasonContext?: {
    home: { rank: number; gamesBehind: number; remainingGames: number } | null;
    away: { rank: number; gamesBehind: number; remainingGames: number } | null;
    canCallAI: boolean;
  };
  requestMode: CoachRequestMode;
  analysisType: CoachAnalysisType;
  autoEnabled: boolean;
  shouldStartAutoBriefing: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  onBriefingChange: (value: NormalizedAiBriefing | null) => void;
  onMetaChange: (value: CoachBriefingMetaState | null) => void;
  onLoadingChange: (value: boolean) => void;
  onAuthExpiredChange: (value: boolean) => void;
}

export default function CoachBriefingAutoRuntime({
  game,
  gameDetail,
  seasonContext,
  requestMode,
  analysisType,
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
  const RETRY_DELAYS_MS = [2000, 4000, 6000] as const;
  // in_progress(백그라운드 생성 중) 상태 전용 — 자동 재시도는 짧게 제한한다.
  const MAX_COACH_PENDING_RETRIES = 2;
  const PENDING_RETRY_DELAYS_MS = [5000, 10000] as const;
  const briefingLabel = autoEnabled ? '경기 데이터 브리핑' : 'AI 코치 분석';
  const isGuestBlocked = !isLoggedIn && !isAuthLoading;
  const isAuthCheckPending = isAuthLoading;
  const fallbackRetryMessage = '분석 준비 중입니다. 잠시 후 다시 확인해 주세요.';
  const fallbackYearMessage = COACH_BRIEFING_FALLBACK_MESSAGES.year;
  const fallbackErrorMessage = COACH_BRIEFING_FALLBACK_MESSAGES.error;

  const normalizeBriefing = (
    source: string | CoachBriefingSource | null | undefined,
    fallbackMessage: string,
  ) => {
    if (!source) {
      return null;
    }

    const payload = typeof source === 'string' ? { message: source } : source;
    const parsedPayload = parseCoachBriefingPayload(
      payload.answer || payload.message || payload.summary,
    );
    const structuredData = parsedPayload;
    const title = [
      payload.title,
      structuredData?.headline,
    ]
      .map(cleanCoachBriefingText)
      .find(isUsefulCoachBriefingText) || briefingLabel;
    const message = [
      payload.displayText,
      payload.message,
      payload.answer,
      structuredData?.analysis?.summary,
      structuredData?.analysis?.verdict,
      structuredData?.summary,
      structuredData?.coach_note,
      structuredData?.detailed_markdown,
      payload.summary,
    ]
      .map(cleanCoachBriefingText)
      .find(isUsefulCoachBriefingText) || fallbackMessage;

    return {
      title,
      message,
      displayText: message,
    };
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
    requestMode,
    analysisType,
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
    analysisType,
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

  const markAuthExpired = () => {
    clearActiveRequest();
    onLoadingChange(false);
    onAuthExpiredChange(true);
    aiBriefingRef.current = null;
    onBriefingChange(null);
    onMetaChange(null);
    clearRetryTimer();
    resetRetryState();
  };

  useEffect(() => {
    aiBriefingRef.current = null;
  }, [game?.gameId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleRealtimeAuthExpired = (event: Event) => {
      if (isRealtimeAuthExpiredEvent(event)) {
        markAuthExpired();
      }
    };

    window.addEventListener('auth-session-expired', handleRealtimeAuthExpired);
    return () => window.removeEventListener('auth-session-expired', handleRealtimeAuthExpired);
  }, [
    onAuthExpiredChange,
    onBriefingChange,
    onLoadingChange,
    onMetaChange,
  ]);

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
      const cachedBriefing = normalizeBriefing(cached, '경기 데이터 브리핑을 준비하지 못했습니다.');
      aiBriefingRef.current = cachedBriefing;
      onBriefingChange(cachedBriefing);
      onMetaChange(normalizeCoachBriefingMeta({
        generationMode: cached.generationMode,
        analysisType,
        dataQuality: cached.dataQuality,
        cacheState: cached.cacheState,
        manualDataRequired: cached.manualDataRequired,
        usedEvidence: cached.usedEvidence,
        groundingWarnings: cached.groundingWarnings,
        groundingReasons: cached.groundingReasons,
        supportedFactCount: cached.supportedFactCount,
        winProbabilityHome: cached.winProbabilityHome ?? null,
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
        manualDataRequired: meta?.manualDataRequired,
        usedEvidence: meta?.usedEvidence,
        groundingWarnings: meta?.groundingWarnings,
        groundingReasons: meta?.groundingReasons,
        supportedFactCount: meta?.supportedFactCount,
        winProbabilityHome: meta?.winProbabilityHome ?? null,
      };

      coachBriefingMemoryCache.set(requestCacheKey, payload);
      const sessionCache = readSessionCoachBriefingCache();
      sessionCache.set(requestCacheKey, payload);
      writeSessionCoachBriefingCache(sessionCache);
    };

    const restoreFromCachePayload = (payload: CoachBriefingCachePayload) => {
      const cachedValue = normalizeBriefing(payload, '경기 데이터 브리핑을 준비하지 못했습니다.');
      if (!cachedValue) {
        return null;
      }
      const cachedMeta = normalizeCoachBriefingMeta({
        generationMode: payload.generationMode,
        analysisType,
        dataQuality: payload.dataQuality,
        cacheState: payload.cacheState,
        manualDataRequired: payload.manualDataRequired,
        usedEvidence: payload.usedEvidence,
        groundingWarnings: payload.groundingWarnings,
        groundingReasons: payload.groundingReasons,
        supportedFactCount: payload.supportedFactCount,
        winProbabilityHome: payload.winProbabilityHome ?? null,
      });

      coachBriefingMemoryCache.set(requestCacheKey, {
        title: cachedValue.title,
        message: cachedValue.message,
        displayText: cachedValue.displayText,
        expiresAt: Date.now() + COACH_BRIEFING_CACHE_TTL_MS,
        generationMode: cachedMeta?.generationMode,
        dataQuality: cachedMeta?.dataQuality,
        cacheState: cachedMeta?.cacheState,
        manualDataRequired: cachedMeta?.manualDataRequired,
        usedEvidence: cachedMeta?.usedEvidence,
        groundingWarnings: cachedMeta?.groundingWarnings,
        groundingReasons: cachedMeta?.groundingReasons,
        supportedFactCount: cachedMeta?.supportedFactCount,
        winProbabilityHome: cachedMeta?.winProbabilityHome ?? null,
      });
      onMetaChange(cachedMeta);
      return cachedValue;
    };

    const cachedPayloadByStorage = readSessionCoachBriefingCache().get(requestCacheKey) ?? null;
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
      sharedRequest = ensureRealtimeAuthSession({ useInjectedProfile: false }).then((isAuthReady) => {
        if (!isAuthReady) {
          throw new CoachAnalyzeError(
            'AUTH_EXPIRED',
            '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.',
            401,
          );
        }

        return analyzeTeam(requestDescriptor.requestPayload);
      });
      coachBriefingInFlightRequests.set(requestCacheKey, sharedRequest);
    }

    const applyFallbackBriefing = (
      message: string,
      cacheState?: string,
      options?: { neutralMeta?: boolean; llmSkipReason?: string },
    ) => {
      const fallbackBriefing = normalizeBriefing(message, message || COACH_BRIEFING_FALLBACK_MESSAGES.error);
      aiBriefingRef.current = fallbackBriefing;
      onBriefingChange(fallbackBriefing);
      const fallbackMeta: CoachBriefingMetaState | null = options?.neutralMeta
        ? (cacheState
          ? {
              cacheState,
              llmSkipReason: options?.llmSkipReason,
              analysisType,
              usedEvidence: [],
              groundingWarnings: [],
              groundingReasons: [],
            }
          : null)
        : {
          generationMode: 'evidence_fallback',
          analysisType,
          dataQuality: 'insufficient',
          cacheState,
          llmSkipReason: options?.llmSkipReason,
          usedEvidence: [],
          groundingWarnings: [],
          groundingReasons: [],
        };
      onMetaChange(fallbackMeta);
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

        const responseBriefingText =
          response.structuredData?.analysis?.summary ||
          response.structuredData?.analysis?.verdict ||
          response.structuredData?.coach_note ||
          response.structuredData?.detailed_markdown ||
          '';
        const normalizedResponse = normalizeBriefing(responseBriefingText
          ? {
              title: response.structuredData?.headline,
              displayText: responseBriefingText,
            }
          : {
              title: response.structuredData?.headline,
              answer: response.answer || response.raw_answer || '',
            }, '경기 데이터 브리핑을 준비하지 못했습니다.');
        const normalizedMeta = normalizeCoachBriefingMeta({
          generationMode: response.generation_mode,
          analysisType: response.analysis_type,
          dataQuality: response.data_quality,
          cacheState,
          manualDataRequired: Boolean(response.manual_data_request),
          llmSkipReason: response.llm_skip_reason ?? response.llmSkipReason,
          usedEvidence: response.used_evidence,
          groundingWarnings: response.grounding_warnings,
          groundingReasons: response.grounding_reasons,
          supportedFactCount: response.supported_fact_count,
          winProbabilityHome: response.win_probability_home ?? null,
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
            analysisType,
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

        const scheduleRetryIfNeeded = (retryable: boolean, isPending: boolean = false) => {
          if (!retryable) {
            clearRetryTimer();
            resetRetryState();
            return false;
          }

          const maxRetries = isPending ? MAX_COACH_PENDING_RETRIES : MAX_COACH_RETRIES;
          const retryDelays = isPending ? PENDING_RETRY_DELAYS_MS : RETRY_DELAYS_MS;

          const currentRetryCount = retryCountRef.current;
          if (currentRetryCount >= maxRetries) {
            clearRetryTimer();
            resetRetryState();
            if (canOverrideSuccessfulBriefing()) {
              applyFallbackBriefing(
                fallbackRetryMessage,
                isPending ? 'PENDING_WAIT' : cacheState,
                {
                  neutralMeta: isPending,
                  llmSkipReason: isPending ? 'pending_wait' : undefined,
                },
              );
            }
            return false;
          }

          clearRetryTimer();
          const selectedDelay =
            retryDelays[currentRetryCount] ??
            retryDelays[retryDelays.length - 1];
          const nextRetryCount = currentRetryCount + 1;
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (!matchesCurrentRequest()) {
              return;
            }
            coachBriefingMemoryCache.delete(requestCacheKey);
            retryCountRef.current = nextRetryCount;
            setRetryNonce((previous) => previous + 1);
          }, selectedDelay);
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
            analysisType,
            dataQuality: 'insufficient',
            cacheState,
            usedEvidence: [],
            groundingWarnings: [],
            groundingReasons: [],
            supportedFactCount: 0,
          }));
          return;
        }

        keepLoadingAfterResponse = scheduleRetryIfNeeded(shouldRetry, shouldRetry);

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
        const rateLimitError = resolveRateLimitErrorDetails(error);
        if (isCoachAnalyzeError(error) && error.code === 'AUTH_EXPIRED') {
          markAuthExpired();
          return;
        }
        if (rateLimitError) {
          if (canOverrideSuccessfulBriefing()) {
            applyFallbackBriefing(
              `${rateLimitError.message} ${rateLimitError.retryAfterSeconds}초 후 다시 시도해주세요.`,
              undefined,
              { neutralMeta: true },
            );
          }
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
          const isPayloadTooLargeError = isCoachAnalyzeError(error) && error.code === 'PAYLOAD_TOO_LARGE';
          const publicMessage = (
            isCoachAnalyzeError(error)
            && (error.code === 'PAYLOAD_TOO_LARGE' || error.code === 'REQUEST_FAILED')
            && error.message.trim().length > 0
          ) ? error.message : fallbackErrorMessage;
          applyFallbackBriefing(publicMessage, undefined, { neutralMeta: isPayloadTooLargeError });
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
    analysisType,
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
