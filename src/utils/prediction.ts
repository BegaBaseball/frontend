// utils/prediction.ts
import { Game, GameDetail, DateGames } from '../types/prediction';
import { DAYS_OF_WEEK } from '../constants/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID } from '../constants/teams';
import { resolveCoachBriefingPolicy as resolveCoachBriefingPolicyFromPolicy } from './predictionCoachPolicy';

export const COACH_BRIEFING_DISPLAY_TITLE = 'AI 분석 리포트';
export const COACH_BRIEFING_DISPLAY_MESSAGE = 'AI 분석 내용을 준비하지 못했습니다.';
export const COACH_BRIEFING_MANUAL_HINT =
  '상세 분석을 확인하려면 "상세 분석" 버튼을 클릭하세요.';

export type CoachRequestMode = 'auto_brief' | 'manual_detail';

export interface RawAiBriefing {
  title?: string;
  message?: string;
  answer?: string;
  summary?: string;
  displayText?: string;
  structuredData?: {
    headline?: string;
    summary?: string;
    detailed_markdown?: string;
    coach_note?: string;
    analysis?: {
      summary?: string;
      verdict?: string;
      strengths?: string[];
      weaknesses?: string[];
      risks?: Array<{ area?: string; description?: string }>;
      why_it_matters?: string[];
      swing_factors?: string[];
      watch_points?: string[];
      uncertainty?: string[];
    };
  };
}

export interface NormalizedAiBriefing {
  title: string;
  message: string;
  displayText: string;
}

export interface ParseAiBriefingOptions {
  fallbackTitle?: string;
  fallbackMessage?: string;
  fallbackHintMessage?: string;
}

export interface NormalizeCoachBriefingOptions extends ParseAiBriefingOptions {}

export interface CoachBriefingPolicyInput {
  hasSelectedGame?: boolean;
  canCallAI: boolean;
  isScheduledGame: boolean;
  isPostseasonGame?: boolean;
  isMeaningfulGame?: boolean;
  isCoachStateEnabledForAuto?: boolean;
}

export interface CoachBriefingPolicy {
  autoEnabled: boolean;
  forceManual: boolean;
  requestMode: CoachRequestMode;
}

export interface CoachBriefingLeagueSnapshot {
  rank: number;
  gamesBehind: number;
  remainingGames: number;
}

export interface CoachBriefingRequestDescriptorInput {
  game: Game | null;
  requestMode: CoachRequestMode;
  focus: string[];
  requestSeasonYear?: number;
  requestLeagueTypeCode?: number;
  homePitcherName?: string;
  awayPitcherName?: string;
  homeSeasonContext?: CoachBriefingLeagueSnapshot | null;
  awaySeasonContext?: CoachBriefingLeagueSnapshot | null;
}

export interface CoachBriefingAnalyzePayload {
  home_team_id: string;
  away_team_id: string;
  league_context: {
    season?: number | string;
    season_year?: number;
    game_date?: string;
    league_type?: string;
    league_type_code?: number;
    round?: string;
    stage_label?: string;
    game_no?: number;
    series_game_no?: number;
    home_pitcher?: string;
    away_pitcher?: string;
    home?: CoachBriefingLeagueSnapshot | null;
    away?: CoachBriefingLeagueSnapshot | null;
  };
  focus: string[];
  request_mode: CoachRequestMode;
  game_id: string;
}

export interface CoachBriefingRequestDescriptor {
  requestFingerprint: string;
  requestCacheKey: string;
  requestPayload: CoachBriefingAnalyzePayload;
}

export interface CoachBriefingDataQualityNotice {
  message: string;
  reasons: string[];
  details: string[];
}

export type CoachAnalysisPresentationMode = 'analysis' | 'prediction' | 'review';

export interface CoachAnalysisPresentation {
  mode: CoachAnalysisPresentationMode;
  title: string;
  buttonLabel: string;
  runButtonLabel: string;
  descriptionWithMatchup: string;
  descriptionWithTeam: string;
  loginRequiredMessage: string;
  authExpiredMessage: string;
}

const DEFAULT_COACH_BRIEFING_PARSE_OPTIONS = {
  fallbackTitle: COACH_BRIEFING_DISPLAY_TITLE,
  fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
  fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
};

const COACH_BRIEFING_GROUNDING_REASON_ORDER = [
  'missing_starters',
  'missing_lineups',
  'missing_summary',
  'missing_metadata',
  'missing_clutch_moments',
  'focus_data_unavailable',
  'missing_game_context',
  'missing_series_context',
] as const;

const COACH_BRIEFING_GROUNDING_REASON_LABELS: Record<string, string> = {
  missing_starters: '선발 미발표',
  missing_lineups: '라인업 미발표',
  missing_summary: '경기 요약 부족',
  missing_metadata: '경기 메타데이터 부족',
  missing_clutch_moments: '승부처 데이터 부족',
  focus_data_unavailable: '요청 항목 근거 부족',
  missing_game_context: '기본 경기 정보 부족',
  missing_series_context: '시리즈 맥락 부족',
};

const COACH_BRIEFING_DATA_QUALITY_MESSAGE =
  '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.';
const COACH_BRIEFING_GENERIC_REASON_LABEL = '실데이터 근거가 제한적입니다.';
const COACH_BRIEFING_REDUNDANT_WARNING_MESSAGES = new Set([
  '선발 정보가 완전하지 않아 선발 관련 표현을 제한합니다.',
  '라인업이 확정되지 않아 타순 관련 단정은 피합니다.',
  '경기 요약 근거가 부족해 최근 활약 서술을 제한합니다.',
  '경기 메타데이터가 부족해 일부 맥락 표현이 제한됩니다.',
  'WPA 기반 승부처 데이터가 부족합니다.',
  '요청한 focus 근거가 부족해 확인 가능한 항목만 분석하거나 보수 요약으로 전환합니다.',
  '경기 기본 맥락이 충분하지 않아 보수적으로 해석합니다.',
  '시리즈 전황 근거가 부족해 포스트시즌 맥락을 단정하지 않습니다.',
]);

const stripCodeFence = (rawText: string): string => {
  const jsonFenceMatch = rawText.match(/```json\n([\s\S]*?)```/i);
  if (jsonFenceMatch?.[1]) {
    return jsonFenceMatch[1].trim();
  }

  const genericFenceMatch = rawText.match(/```([\s\S]*?)```/);
  if (genericFenceMatch?.[1]) {
    return genericFenceMatch[1].trim();
  }

  return rawText;
};

const stripMarkdownArtifacts = (value: string): string => {
  return value
    // Code blocks → space
    .replace(/```[\s\S]*?```/g, ' ')
    // Structural elements (headers, lists, images, blockquotes, table separators) → remove
    .replace(/^\s*#{1,6}\s*|^\s*[-*+]\s+|^\s*\d+\.\s+|!\[[^\]]*\]\([^)]+\)|^>\s*|^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*$/gm, '')
    // Links → keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Inline formatting (bold/italic/strikethrough/code) → keep content
    .replace(/\*{3}(.*?)\*{3}|\*{2}(.*?)\*{2}|__(.*?)__|~~(.*?)~~|\*([^*]*)\*|_([^_]*)_|`([^`]+)`/g,
      (_, g1, g2, g3, g4, g5, g6, g7) => g1 ?? g2 ?? g3 ?? g4 ?? g5 ?? g6 ?? g7 ?? '')
    // Table pipes → space, collapse whitespace
    .replace(/\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const normalizeLineForBrief = (value: string): string => (
  value
    .replace(/\n{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
);

const isMeaningfulMessage = (text: string): boolean => {
  const trimmed = text.trim();

  if (!trimmed) return false;
  if (trimmed.length < 8) return false;
  if (trimmed === COACH_BRIEFING_DISPLAY_TITLE) return false;
  if (/^[-#`*_~]+$/.test(trimmed)) return false;
  return true;
};

const parseStructuredAiPayload = (rawText: string): Record<string, unknown> | null => {
  const candidateText = stripCodeFence(rawText);
  const braceStart = candidateText.indexOf('{');
  const braceEnd = candidateText.lastIndexOf('}');
  if (braceStart === -1 || braceEnd <= braceStart) {
    return null;
  }

  const candidate = candidateText.slice(braceStart, braceEnd + 1).trim();
  if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toPlainText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
};

const normalizeParsedPayloadText = (value: unknown): string => (
  normalizeLineForBrief(stripMarkdownArtifacts(toPlainText(value)))
);

const normalizeBriefSource = (input: RawAiBriefing | string): {
  title: string;
  message: string;
  answer: string;
  summary: string;
  structuredData?: RawAiBriefing['structuredData'];
} => {
  if (typeof input === 'string') {
    return {
      title: '',
      message: input.trim(),
      answer: input.trim(),
      summary: '',
      structuredData: undefined,
    };
  }

  return {
    title: (input.title || '').trim(),
    message: (input.message || '').trim(),
    answer: (input.answer || '').trim(),
    summary: (input.summary || '').trim(),
    structuredData: input.structuredData,
  };
};

const extractHeadingFromText = (text: string): string => {
  const normalizedText = stripCodeFence(text).trim();
  if (!normalizedText) return '';

  const rawLines = normalizedText.split('\n').map((line) => line.trim()).filter(Boolean);
  const headingLine = rawLines.find((line) => /^\s*#{1,6}\s+/.test(line));

  if (!headingLine) {
    return '';
  }

  return normalizeLineForBrief(headingLine.replace(/^\s*#{1,6}\s+/, ''));
};

const extractPayloadTitleCandidatesFromText = (text: string): string[] => {
  const payload = parseStructuredAiPayload(text);
  if (!payload) {
    return [];
  }

  const headline = toPlainText(payload.headline);
  const normalizedHeadline = normalizeParsedPayloadText(headline);
  return normalizedHeadline ? [normalizedHeadline] : [];
};

const collectCandidatesFromText = (text: string): string[] => {
  const cleaned = stripCodeFence(text).trim();
  if (!cleaned) return [];

  const payload = parseStructuredAiPayload(cleaned);
  const candidates: string[] = [];

  if (payload) {
    const payloadSummary = normalizeParsedPayloadText(payload.summary);
    if (payloadSummary) candidates.push(payloadSummary);

    const payloadCoachNote = normalizeParsedPayloadText(payload.coach_note);
    if (payloadCoachNote) candidates.push(payloadCoachNote);

    const payloadDetailedMarkdown = normalizeParsedPayloadText(payload.detailed_markdown);
    if (payloadDetailedMarkdown) candidates.push(payloadDetailedMarkdown);

    const analysis = payload.analysis;
    if (typeof analysis === 'object' && analysis !== null && !Array.isArray(analysis)) {
      const analysisRecord = analysis as Record<string, unknown>;
      const analysisSummary = normalizeParsedPayloadText(analysisRecord.summary);
      if (analysisSummary) candidates.push(analysisSummary);

      const analysisVerdict = normalizeParsedPayloadText(analysisRecord.verdict);
      if (analysisVerdict) candidates.push(analysisVerdict);

      const analysisStrengths = analysisRecord.strengths;
      if (Array.isArray(analysisStrengths)) {
        analysisStrengths.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const analysisWeaknesses = analysisRecord.weaknesses;
      if (Array.isArray(analysisWeaknesses)) {
        analysisWeaknesses.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const whyItMatters = analysisRecord.why_it_matters;
      if (Array.isArray(whyItMatters)) {
        whyItMatters.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const swingFactors = analysisRecord.swing_factors;
      if (Array.isArray(swingFactors)) {
        swingFactors.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const watchPoints = analysisRecord.watch_points;
      if (Array.isArray(watchPoints)) {
        watchPoints.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const uncertainty = analysisRecord.uncertainty;
      if (Array.isArray(uncertainty)) {
        uncertainty.forEach((item) => {
          const raw = toPlainText(item);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }

      const analysisRisks = analysisRecord.risks;
      if (Array.isArray(analysisRisks)) {
        analysisRisks.forEach((item) => {
          if (!item || typeof item !== 'object') {
            return;
          }
          const risk = item as Record<string, unknown>;
          const raw = toPlainText(risk.description) || toPlainText(risk.area);
          if (raw) {
            candidates.push(normalizeParsedPayloadText(raw));
          }
        });
      }
    }
  }

  const fallbackText = normalizeParsedPayloadText(cleaned);
  if (fallbackText) candidates.push(fallbackText);

  return candidates.filter(Boolean);
};

const collectStructuredDataCandidates = (payload: RawAiBriefing['structuredData']): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const candidates: string[] = [];
  const values: Array<[string, keyof NonNullable<RawAiBriefing['structuredData']>]> = [
    ['summary', 'summary'],
  ];

  for (const [_, key] of values) {
    const text = normalizeParsedPayloadText(payload[key]);
    if (text) candidates.push(text);
  }

  const analysis = payload.analysis;
  if (analysis && typeof analysis === 'object' && !Array.isArray(analysis)) {
    const structuredAnalysis = analysis as Record<string, unknown>;
    const analysisSummary = normalizeParsedPayloadText(structuredAnalysis.summary);
    if (analysisSummary) candidates.push(analysisSummary);

    const verdict = normalizeParsedPayloadText(structuredAnalysis.verdict);
    if (verdict) candidates.push(verdict);

    const strengths = structuredAnalysis.strengths;
    if (Array.isArray(strengths)) {
      strengths.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }

    const weaknesses = structuredAnalysis.weaknesses;
    if (Array.isArray(weaknesses)) {
      weaknesses.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }

    const risks = structuredAnalysis.risks;
    if (Array.isArray(risks)) {
      risks.forEach((value) => {
        const normalized = normalizeParsedPayloadText(
          typeof value === 'object' && value !== null
            ? normalizeLineForBrief(JSON.stringify(value))
            : value,
        );
        if (normalized) candidates.push(normalized);
      });
    }

    const whyItMatters = structuredAnalysis.why_it_matters;
    if (Array.isArray(whyItMatters)) {
      whyItMatters.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }

    const swingFactors = structuredAnalysis.swing_factors;
    if (Array.isArray(swingFactors)) {
      swingFactors.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }

    const watchPoints = structuredAnalysis.watch_points;
    if (Array.isArray(watchPoints)) {
      watchPoints.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }

    const uncertainty = structuredAnalysis.uncertainty;
    if (Array.isArray(uncertainty)) {
      uncertainty.forEach((value) => {
        const normalized = normalizeParsedPayloadText(value);
        if (normalized) candidates.push(normalized);
      });
    }
  }

  const detail = normalizeParsedPayloadText(payload.detailed_markdown);
  if (detail) {
    candidates.push(detail);
  }

  const coachNote = normalizeParsedPayloadText(payload.coach_note);
  if (coachNote) {
    candidates.push(coachNote);
  }

  return candidates.filter(Boolean);
};

const extractPayloadTitle = (payload: RawAiBriefing['structuredData']): string => {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.headline === 'string' && payload.headline.trim()) {
    return normalizeLineForBrief(payload.headline);
  }
  const summary = toPlainText(payload.summary);
  return summary ? normalizeParsedPayloadText(summary) : '';
};

export const parseAiBriefing = (
  rawText: string | RawAiBriefing,
  options: ParseAiBriefingOptions = {},
): NormalizedAiBriefing => {
  const fallbackTitle = (options.fallbackTitle || COACH_BRIEFING_DISPLAY_TITLE).trim();
  const fallbackMessage = (options.fallbackMessage || COACH_BRIEFING_DISPLAY_MESSAGE).trim();

  const normalizedSource = normalizeBriefSource(rawText || '');

  const titleCandidates: string[] = [
    normalizedSource.title,
    extractPayloadTitle(normalizedSource.structuredData),
    ...extractPayloadTitleCandidatesFromText(normalizedSource.answer),
    ...extractPayloadTitleCandidatesFromText(normalizedSource.message),
    ...extractPayloadTitleCandidatesFromText(normalizedSource.summary),
    extractHeadingFromText(normalizedSource.answer || normalizedSource.message),
    extractHeadingFromText(normalizedSource.summary),
  ];

  const title = titleCandidates
    .map((candidate) => normalizeLineForBrief(candidate))
    .find((candidate) => isMeaningfulMessage(candidate))
    || fallbackTitle;

  const messageCandidates: string[] = [];

  if (normalizedSource.answer) {
    messageCandidates.push(...collectCandidatesFromText(normalizedSource.answer));
  }

  if (normalizedSource.structuredData) {
    messageCandidates.push(...collectStructuredDataCandidates(normalizedSource.structuredData));
  }

  if (normalizedSource.message) {
    messageCandidates.push(...collectCandidatesFromText(normalizedSource.message));
  }

  if (normalizedSource.summary) {
    messageCandidates.push(...collectCandidatesFromText(normalizedSource.summary));
  }

  const message = messageCandidates
    .map((candidate) => normalizeLineForBrief(candidate))
    .find(isMeaningfulMessage) || fallbackMessage;

  const fallback = isMeaningfulMessage(normalizeLineForBrief(message))
    ? normalizeLineForBrief(message)
    : fallbackMessage;

  return {
    title,
    message: fallback,
    displayText: fallback,
  };
};

export const normalizeCoachBriefing = (
  rawText: string | RawAiBriefing,
  options: NormalizeCoachBriefingOptions = {},
): NormalizedAiBriefing => {
  const normalizedOptions: ParseAiBriefingOptions = {
    ...DEFAULT_COACH_BRIEFING_PARSE_OPTIONS,
    ...options,
  };

  const source = rawText == null ? '' : rawText;
  return parseAiBriefing(source, normalizedOptions);
};

export const resolveCoachBriefingPolicy = resolveCoachBriefingPolicyFromPolicy;

export const resolveCoachAnalysisPresentation = ({
  isPastGame = false,
  isFutureGame = false,
  gameStatusBucket,
}: {
  isPastGame?: boolean;
  isFutureGame?: boolean;
  gameStatusBucket?: string | null;
} = {}): CoachAnalysisPresentation => {
  const normalizedBucket = String(gameStatusBucket || '').trim().toUpperCase();
  const isReviewMode = normalizedBucket === 'COMPLETED' || isPastGame;
  const isPredictionMode = !isReviewMode && (normalizedBucket === 'SCHEDULED' || isFutureGame);

  if (isReviewMode) {
    return {
      mode: 'review',
      title: 'AI 코치 경기 리뷰',
      buttonLabel: 'AI 코치 경기 리뷰',
      runButtonLabel: 'AI 코치 경기 리뷰 시작',
      descriptionWithMatchup: '경기 결과를 실데이터 기반으로 복기합니다.',
      descriptionWithTeam: '전략 및 결과를 실데이터와 함께 복기합니다.',
      loginRequiredMessage: 'AI 코치 경기 리뷰는 로그인 후 제공됩니다.',
      authExpiredMessage: '로그인 세션이 만료되었습니다. 다시 로그인 후 경기 리뷰를 확인해주세요.',
    };
  }

  if (isPredictionMode) {
    return {
      mode: 'prediction',
      title: 'AI 코치 경기 예측',
      buttonLabel: 'AI 코치 경기 예측',
      runButtonLabel: 'AI 코치 경기 예측 시작',
      descriptionWithMatchup: '현재 매치업의 승부처를 실데이터 기반으로 전망합니다.',
      descriptionWithTeam: '전략 및 지표를 실데이터와 함께 전망합니다.',
      loginRequiredMessage: 'AI 코치 경기 예측은 로그인 후 제공됩니다.',
      authExpiredMessage: '로그인 세션이 만료되었습니다. 다시 로그인 후 경기 예측을 확인해주세요.',
    };
  }

  return {
    mode: 'analysis',
    title: 'AI 코치 상세 분석',
    buttonLabel: 'AI 코치 상세 분석',
    runButtonLabel: 'AI 코치 상세 분석 시작',
    descriptionWithMatchup: '승부처를 실데이터 기반으로 해석합니다.',
    descriptionWithTeam: '전략 및 지표를 실데이터와 함께 해석합니다.',
    loginRequiredMessage: 'AI 코치 상세 분석은 로그인 후 제공됩니다.',
    authExpiredMessage: '로그인 세션이 만료되었습니다. 다시 로그인 후 상세 분석을 확인해주세요.',
  };
};

const serializeCoachBriefingLeagueSnapshot = (
  snapshot?: CoachBriefingLeagueSnapshot | null,
): string => {
  if (!snapshot) {
    return 'na';
  }

  return [
    snapshot.rank,
    snapshot.gamesBehind,
    snapshot.remainingGames,
  ].join('/');
};

export const buildCoachBriefingRequestDescriptor = ({
  game,
  requestMode,
  focus,
  requestSeasonYear,
  requestLeagueTypeCode,
  homePitcherName,
  awayPitcherName,
  homeSeasonContext,
  awaySeasonContext,
}: CoachBriefingRequestDescriptorInput): CoachBriefingRequestDescriptor | null => {
  if (!game?.gameId || !game.homeTeam || !game.awayTeam) {
    return null;
  }

  const homeTeamName = TEAM_DATA[game.homeTeam]?.fullName || game.homeTeam;
  const awayTeamName = TEAM_DATA[game.awayTeam]?.fullName || game.awayTeam;
  const homeTeamId = TEAM_NAME_TO_ID[homeTeamName] || game.homeTeam;
  const awayTeamId = TEAM_NAME_TO_ID[awayTeamName] || game.awayTeam;
  const normalizedFocus = focus.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const requestPayload: CoachBriefingAnalyzePayload = {
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    league_context: {
      season: game.seasonId,
      season_year: requestSeasonYear,
      game_date: game.gameDate,
      league_type: game.leagueType,
      league_type_code: requestLeagueTypeCode,
      round: game.postSeasonSeries,
      stage_label: game.postSeasonSeries,
      game_no: game.seriesGameNo,
      series_game_no: game.seriesGameNo,
      home_pitcher: homePitcherName,
      away_pitcher: awayPitcherName,
      home: homeSeasonContext,
      away: awaySeasonContext,
    },
    focus: normalizedFocus,
    request_mode: requestMode,
    game_id: game.gameId,
  };

  const requestFingerprint = [
    requestPayload.game_id,
    requestPayload.home_team_id,
    requestPayload.away_team_id,
    requestPayload.league_context.season ?? 'na',
    requestPayload.league_context.season_year ?? 'na',
    requestPayload.league_context.game_date ?? 'na',
    requestPayload.league_context.league_type ?? 'na',
    requestPayload.league_context.league_type_code ?? 'na',
    requestPayload.league_context.round ?? 'na',
    requestPayload.league_context.stage_label ?? 'na',
    requestPayload.league_context.game_no ?? 'na',
    requestPayload.league_context.series_game_no ?? 'na',
    requestPayload.league_context.home_pitcher ?? 'na',
    requestPayload.league_context.away_pitcher ?? 'na',
    serializeCoachBriefingLeagueSnapshot(requestPayload.league_context.home),
    serializeCoachBriefingLeagueSnapshot(requestPayload.league_context.away),
    requestPayload.request_mode,
    requestPayload.focus.join('+') || 'na',
  ].join(':');

  return {
    requestFingerprint,
    requestCacheKey: requestFingerprint,
    requestPayload,
  };
};

export const getCoachBriefingGroundingReasonLabels = (
  codes?: string[] | null,
): string[] => {
  const normalizedCodes = Array.isArray(codes)
    ? codes.filter((code): code is string => typeof code === 'string' && code.length > 0)
    : [];

  const orderedLabels = COACH_BRIEFING_GROUNDING_REASON_ORDER
    .map((code) => (
      normalizedCodes.includes(code)
        ? COACH_BRIEFING_GROUNDING_REASON_LABELS[code]
        : null
    ))
    .filter((value): value is string => Boolean(value));

  const dedupedLabels = Array.from(new Set(orderedLabels));
  return dedupedLabels.length > 0
    ? dedupedLabels
    : [COACH_BRIEFING_GENERIC_REASON_LABEL];
};

export const getCoachBriefingDataQualityNotice = (
  dataQuality?: string | null,
  groundingReasons?: string[] | null,
  groundingWarnings?: string[] | null,
): CoachBriefingDataQualityNotice | null => {
  if (dataQuality !== 'partial' && dataQuality !== 'insufficient') {
    return null;
  }

  const details = Array.isArray(groundingWarnings)
    ? Array.from(new Set(
      groundingWarnings
        .filter((warning): warning is string => typeof warning === 'string' && warning.length > 0)
        .map((warning) => warning.trim())
        .filter((warning) => !COACH_BRIEFING_REDUNDANT_WARNING_MESSAGES.has(warning)),
    )).slice(0, 2)
    : [];

  return {
    message: COACH_BRIEFING_DATA_QUALITY_MESSAGE,
    reasons: getCoachBriefingGroundingReasonLabels(groundingReasons),
    details,
  };
};

const COACH_ANALYSIS_FOCUS_LABELS: Record<string, string> = {
  recent_form: '최근 전력',
  bullpen: '불펜 상태',
  starter: '선발 투수',
  matchup: '상대 전적',
  batting: '타격 생산성',
};

export const getCoachAnalysisFocusSectionNotice = (
  missingFocusSections?: string[] | null,
): string | null => {
  const labels = Array.isArray(missingFocusSections)
    ? Array.from(new Set(
      missingFocusSections
        .filter((focus): focus is string => typeof focus === 'string' && focus.length > 0)
        .map((focus) => COACH_ANALYSIS_FOCUS_LABELS[focus] || focus),
    ))
    : [];

  if (labels.length === 0) {
    return null;
  }

  if (labels.length === 1) {
    return `${labels[0]} 섹션은 실데이터 부족으로 축약되었습니다.`;
  }

  return `${labels.join(', ')} 섹션은 실데이터 부족으로 축약되었습니다.`;
};

export const getCoachGenerationModeNotice = (
  generationMode?: string | null,
  dataQuality?: string | null,
): string | null => {
  if (generationMode !== 'evidence_fallback') {
    return null;
  }

  if (dataQuality === 'partial' || dataQuality === 'insufficient') {
    return '이번 응답은 실패가 아니라, 확인 가능한 근거만으로 보수 생성된 결과입니다. 다음 상세 분석 요청에서는 AI 재생성을 다시 시도합니다.';
  }

  return '이번 응답은 확인 가능한 근거만으로 보수 생성되었습니다. 다음 상세 분석 요청에서는 AI 재생성을 다시 시도합니다.';
};

export type GameStatusCode = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED' | 'DRAW' | 'UNKNOWN';

export interface GameStatusResult {
  isPastGame: boolean;
  isFutureGame: boolean;
  isToday: boolean;
  isLive: boolean;
  isClosed: boolean;
  isScheduled: boolean;
  hasStarted: boolean;
  statusCode: GameStatusCode;
  statusLabel: string;
  isVoteOpen: boolean;
  canShowDetails: boolean;
}

const NEUTRAL_GAME_STATUSES = new Set(['', 'UNKNOWN', 'TBD', 'PENDING', 'READY', 'NOT_STARTED', 'NONE']);
const SCHEDULED_GAME_STATUSES = new Set([...NEUTRAL_GAME_STATUSES, 'SCHEDULED']);

const resolveGameStatusCode = (normalizedStatus: string): GameStatusCode => {
  if (normalizedStatus === 'POSTPONED') return 'POSTPONED';
  if (normalizedStatus === 'CANCELLED') return 'CANCELLED';
  if (normalizedStatus === 'DRAW') return 'DRAW';
  if (normalizedStatus === 'FINAL' || normalizedStatus === 'COMPLETED') return 'COMPLETED';
  if (['LIVE', 'IN_PROGRESS', 'PLAYING'].includes(normalizedStatus)) return 'LIVE';
  if (normalizedStatus === 'SCHEDULED') return 'SCHEDULED';
  return 'UNKNOWN';
};

export const hasGameDetailProgressData = (detail?: GameDetail | null): boolean => {
  if (!detail) {
    return false;
  }

  if (detail.homeScore != null && detail.awayScore != null) {
    return true;
  }

  const rawDetail = detail as unknown as Record<string, unknown>;
  const candidateKeys = [
    rawDetail.inningScores,
    rawDetail.inning_scores,
    rawDetail.inning_score,
    rawDetail.innings,
  ];

  if (candidateKeys.some((value) => Array.isArray(value) && value.length > 0)) {
    return true;
  }

  return (
    (!!rawDetail.lineScore && typeof rawDetail.lineScore === 'object' && !Array.isArray(rawDetail.lineScore))
    || (!!rawDetail.line_score && typeof rawDetail.line_score === 'object' && !Array.isArray(rawDetail.line_score))
  );
};

/**
 * 날짜별로 경기 그룹화 (오래된 날짜부터 최신 날짜 순)
 */
export const groupByDate = (games: Game[]): DateGames[] => {
  const grouped: { [key: string]: Game[] } = {};

  games.forEach(game => {
    const gameDate = game.gameDate || 'unknown';
    if (!grouped[gameDate]) {
      grouped[gameDate] = [];
    }
    grouped[gameDate].push(game);
  });

  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map(date => ({ date, games: grouped[date] }));
};

/**
 * 팀 코드 → 사용자 친화적 짧은 이름 변환
 */
export const getShortTeamName = (code: string): string => {
  return TEAM_DATA[code]?.name || code;
};

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일 요일)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${DAYS_OF_WEEK[date.getDay()]}요일`;
};

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD) - 로컬 시간 기준 (KST)
 */
export const getTodayString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 내일 날짜 문자열 (YYYY-MM-DD) - 로컬 시간 기준 (KST)
 */
export const getTomorrowString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 투표 정확도 계산
 */
export const calculateVoteAccuracy = (
  winner: string | null | undefined,
  homeVotes: number,
  awayVotes: number
): number | null => {
  if (!winner || winner === 'draw') return null;

  const totalVotes = homeVotes + awayVotes;
  if (totalVotes === 0) return 0;

  const winningVotes = winner === 'home' ? homeVotes : awayVotes;
  return Math.round((winningVotes / totalVotes) * 100);
};

/**
 * 투표 퍼센티지 계산
 */
export const calculateVotePercentages = (homeVotes: number, awayVotes: number) => {
  const totalVotes = homeVotes + awayVotes;
  const homePercentage = totalVotes > 0 ? Math.round((homeVotes / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((awayVotes / totalVotes) * 100) : 0;

  return { homePercentage, awayPercentage, totalVotes };
};

/**
 * 경기 상태 확인 (currentDate는 외부에서 주입)
 */
export const getGameStatus = (
  game: Game | null,
  currentDate: Date,
  options?: {
    gameStatus?: string | null;
    status?: string | null;
    gameDate?: string | null;
    startTime?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    hasProgressData?: boolean;
  }
): GameStatusResult => {
  if (!game) {
    return {
      isPastGame: false,
      isFutureGame: false,
      isToday: false,
      isLive: false,
      isClosed: false,
      isScheduled: false,
      hasStarted: false,
      statusCode: 'UNKNOWN',
      statusLabel: '경기 예정',
      isVoteOpen: false,
      canShowDetails: false,
    };
  }

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const todayKey = `${year}-${month}-${day}`;
  const normalizedStatus = (options?.gameStatus || options?.status || '').toUpperCase();
  const rawStatusCode = resolveGameStatusCode(normalizedStatus);

  const matchDate = options?.gameDate || game.gameDate || null;
  const normalizedStartTime = options?.startTime ? options.startTime.slice(0, 5) : null;
  const startDateTime = matchDate && normalizedStartTime
    ? new Date(`${matchDate}T${normalizedStartTime}`)
    : null;
  const hasValidStartTime = startDateTime != null && !Number.isNaN(startDateTime.getTime());
  const resolvedHomeScore = options?.homeScore ?? game.homeScore;
  const resolvedAwayScore = options?.awayScore ?? game.awayScore;
  const hasKnownScore = (resolvedHomeScore !== null && resolvedHomeScore !== undefined)
    && (resolvedAwayScore !== null && resolvedAwayScore !== undefined);
  const hasProgressData = options?.hasProgressData === true || hasKnownScore;
  const isDatePast = matchDate ? matchDate < todayKey : false;
  const isDateFuture = matchDate ? matchDate > todayKey : false;
  const isToday = matchDate ? matchDate === todayKey : false;

  let hasStarted = false;
  if (hasValidStartTime && startDateTime) {
    hasStarted = currentDate >= startDateTime;
  } else if (matchDate) {
    hasStarted = isDatePast;
  }

  const hasNeutralStatus = !normalizedStatus || NEUTRAL_GAME_STATUSES.has(normalizedStatus);
  const shouldOverrideToScheduled = isDateFuture && !hasStarted && hasNeutralStatus;
  const inferStatusFromProgressData = (): GameStatusCode => {
    if (!hasProgressData) {
      return 'UNKNOWN';
    }

    if (isDatePast) {
      return hasKnownScore && resolvedHomeScore === resolvedAwayScore ? 'DRAW' : 'COMPLETED';
    }

    if (hasStarted || isToday) {
      return 'LIVE';
    }

    return 'UNKNOWN';
  };
  const statusCode: GameStatusCode = (() => {
    if (rawStatusCode === 'POSTPONED' || rawStatusCode === 'CANCELLED') {
      return rawStatusCode;
    }
    if (rawStatusCode === 'DRAW') {
      return 'DRAW';
    }
    if (SCHEDULED_GAME_STATUSES.has(normalizedStatus)) {
      const inferredProgressStatus = inferStatusFromProgressData();
      if (inferredProgressStatus !== 'UNKNOWN') {
        return inferredProgressStatus;
      }
    }
    if (shouldOverrideToScheduled) {
      return 'SCHEDULED';
    }
    if (rawStatusCode !== 'UNKNOWN') {
      return rawStatusCode;
    }
    if (hasKnownScore) {
      return hasStarted ? 'COMPLETED' : 'SCHEDULED';
    }
    if (normalizedStatus && !hasNeutralStatus) {
      return 'UNKNOWN';
    }
    return hasStarted ? 'LIVE' : 'SCHEDULED';
  })();
  const isClosedEffective = ['COMPLETED', 'POSTPONED', 'CANCELLED', 'DRAW'].includes(statusCode);
  const isLiveEffective = statusCode === 'LIVE';
  const isScheduledEffective = statusCode === 'SCHEDULED';

  let isPastGame = false;
  let isFutureGame = false;

  if (normalizedStatus) {
    if (isClosedEffective) {
      isPastGame = true;
    } else if (isLiveEffective) {
      isPastGame = false;
      isFutureGame = false;
    } else if (isScheduledEffective) {
      isPastGame = false;
      isFutureGame = isDateFuture;
    } else {
      isPastGame = isDatePast;
      isFutureGame = isDateFuture;
    }
  } else {
    isPastGame = isDatePast || (hasStarted && !isDateFuture);
    isFutureGame = isDateFuture;
  }

  const statusLabel = statusCode === 'LIVE'
    ? '경기 진행중'
    : statusCode === 'POSTPONED'
      ? '경기 연기'
      : statusCode === 'CANCELLED'
        ? '경기 취소'
        : statusCode === 'COMPLETED' || statusCode === 'DRAW'
          ? '경기 종료'
          : statusCode === 'UNKNOWN'
            ? (hasStarted ? '경기 진행중' : '경기 예정')
          : '경기 예정';

  const isVoteOpen = statusCode === 'SCHEDULED' && !hasStarted;
  const canShowDetails =
    statusCode === 'LIVE'
    || statusCode === 'COMPLETED'
    || statusCode === 'DRAW'
    || hasKnownScore;

  return {
    isPastGame,
    isFutureGame,
    isToday,
    isLive: isLiveEffective,
    isClosed: isClosedEffective,
    isScheduled: isScheduledEffective,
    hasStarted,
    statusCode,
    statusLabel,
    isVoteOpen,
    canShowDetails,
  };
};

/**
 * 시작일부터 종료일까지의 날짜 문자열 배열 생성
 */
export const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};
