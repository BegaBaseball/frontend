import type {
  CoachAnalyzeResponse,
  CoachDataQuality,
  CoachGenerationMode,
} from '../api/coach';
import type { CoachAnalysisType } from './coachBriefingRequestDescriptor';
import { isWinProbabilityInput } from './coachWinProbability';

export interface CoachBriefingMetaState {
  generationMode?: CoachGenerationMode;
  analysisType?: CoachAnalysisType;
  dataQuality?: CoachDataQuality;
  cacheState?: string;
  manualDataRequired?: boolean;
  llmSkipReason?: string;
  usedEvidence: string[];
  groundingWarnings: string[];
  groundingReasons: string[];
  supportedFactCount?: number;
  winProbabilityHome?: number | null;
}

export interface CoachBriefingCachePayload {
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
  winProbabilityHome?: number | null;
}

export interface CoachBriefingSource {
  title?: string;
  message?: string;
  answer?: string;
  summary?: string;
  displayText?: string;
}

export interface CoachBriefingStructuredData {
  headline?: string;
  summary?: string;
  detailed_markdown?: string;
  coach_note?: string;
  analysis?: {
    summary?: string;
    verdict?: string;
  };
}

export const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
export const COACH_BRIEFING_CACHE_TTL_MS = 5 * 60 * 1000;
export const COACH_BRIEFING_FALLBACK_MESSAGES = {
  locked: '현재 브리핑 캐시가 잠겨 있습니다. 운영 갱신 후 다시 확인해 주세요.',
  year: '경기 연도 정보를 확인하는 중입니다. 잠시 후 다시 시도해주세요.',
  error: 'AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;

// 프로세스 전역 싱글톤 — 모듈은 청크와 무관하게 1회만 평가되므로 의미가 보존된다.
export const coachBriefingMemoryCache = new Map<string, CoachBriefingCachePayload>();
export const coachBriefingInFlightRequests = new Map<string, Promise<CoachAnalyzeResponse>>();

export const isRealtimeAuthExpiredEvent = (event: Event): boolean => {
  const detail = (event as CustomEvent<{ cause?: unknown; requestUrl?: unknown } | undefined>).detail;
  return detail?.cause === 'realtime_auth_failed' && detail.requestUrl === '/ws';
};

export const resolvePitcherName = (
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

export const resolveLeagueTypeCode = (
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

const cleanCoachMetaStrings = (value?: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
);

export const normalizeCoachBriefingMeta = (
  payload?: Partial<CoachBriefingMetaState> | null,
): CoachBriefingMetaState | null => {
  if (!payload) {
    return null;
  }
  const usedEvidence = cleanCoachMetaStrings(payload.usedEvidence);
  const groundingWarnings = cleanCoachMetaStrings(payload.groundingWarnings);
  const groundingReasons = cleanCoachMetaStrings(payload.groundingReasons);
  const llmSkipReason = typeof payload.llmSkipReason === 'string'
    ? payload.llmSkipReason.trim()
    : '';
  const supportedFactCount = (
    typeof payload.supportedFactCount === 'number'
    && Number.isFinite(payload.supportedFactCount)
    && payload.supportedFactCount >= 0
  ) ? payload.supportedFactCount : undefined;
  const winProbabilityHome = isWinProbabilityInput(payload.winProbabilityHome)
    ? payload.winProbabilityHome
    : null;
  if (
    !payload.generationMode
    && !payload.analysisType
    && !payload.dataQuality
    && !payload.cacheState
    && payload.manualDataRequired !== true
    && !llmSkipReason
    && usedEvidence.length === 0
    && groundingWarnings.length === 0
    && groundingReasons.length === 0
    && supportedFactCount === undefined
    && winProbabilityHome === null
  ) {
    return null;
  }
  return {
    generationMode: payload.generationMode,
    analysisType: payload.analysisType,
    dataQuality: payload.dataQuality,
    cacheState: payload.cacheState,
    manualDataRequired: payload.manualDataRequired === true,
    llmSkipReason: llmSkipReason || undefined,
    usedEvidence,
    groundingWarnings,
    groundingReasons,
    supportedFactCount,
    winProbabilityHome,
  };
};

export const cleanCoachBriefingText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/```(?:json)?|```/gi, ' ')
    .replace(/[*_`~]+/g, '')
    .replace(/^#{1,6}\s*|^[\s>*+-]+|\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const isUsefulCoachBriefingText = (value: string): boolean => (
  value.trim().length >= 8
);

export const parseCoachBriefingPayload = (value?: string): Partial<CoachBriefingStructuredData> | null => {
  if (!value) {
    return null;
  }

  const candidate = cleanCoachBriefingText(value);
  const braceStart = candidate.indexOf('{');
  const braceEnd = candidate.lastIndexOf('}');
  if (braceStart === -1 || braceEnd <= braceStart) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate.slice(braceStart, braceEnd + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Partial<CoachBriefingStructuredData>
      : null;
  } catch {
    return null;
  }
};

export const purgeExpiredCoachBriefingCache = (cache: Map<string, { expiresAt: number }>) => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  });
};

export const readStoredCoachBriefingCache = (
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

export const writeStoredCoachBriefingCache = (
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

export const readSessionCoachBriefingCache = (): Map<string, CoachBriefingCachePayload> => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return new Map();
  }

  return readStoredCoachBriefingCache(
    window.sessionStorage,
    COACH_BRIEFING_SESSION_STORAGE_KEY,
  );
};

export const writeSessionCoachBriefingCache = (cache: Map<string, CoachBriefingCachePayload>) => {
  if (typeof window === 'undefined') {
    return;
  }
  writeStoredCoachBriefingCache(window.sessionStorage, COACH_BRIEFING_SESSION_STORAGE_KEY, cache);
};
