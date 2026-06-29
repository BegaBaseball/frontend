export const COACH_BRIEFING_DISPLAY_TITLE = 'AI 분석 리포트';
export const COACH_BRIEFING_DISPLAY_MESSAGE = 'AI 분석 내용을 준비하지 못했습니다.';
export const COACH_BRIEFING_MANUAL_HINT =
  '상세 분석을 확인하려면 "상세 분석" 버튼을 클릭하세요.';

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
  '아직 확정 전인 항목은 제외하고, 현재 확인된 경기 정보로 정리했습니다.';
const COACH_BRIEFING_GENERIC_REASON_LABEL = '현재 확인된 경기 정보 범위 안에서 정리합니다.';
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
      descriptionWithMatchup: '경기 결과를 확인된 데이터로 복기합니다.',
      descriptionWithTeam: '전략 및 결과를 경기 데이터와 함께 복기합니다.',
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
      descriptionWithMatchup: '현재 매치업의 승부처를 경기 데이터로 전망합니다.',
      descriptionWithTeam: '전략 및 지표를 경기 데이터와 함께 전망합니다.',
      loginRequiredMessage: 'AI 코치 경기 예측은 로그인 후 제공됩니다.',
      authExpiredMessage: '로그인 세션이 만료되었습니다. 다시 로그인 후 경기 예측을 확인해주세요.',
    };
  }

  return {
    mode: 'analysis',
    title: 'AI 코치 상세 분석',
    buttonLabel: 'AI 코치 상세 분석',
    runButtonLabel: 'AI 코치 상세 분석 시작',
    descriptionWithMatchup: '승부처를 경기 데이터로 해석합니다.',
    descriptionWithTeam: '전략 및 지표를 경기 데이터와 함께 해석합니다.',
    loginRequiredMessage: 'AI 코치 상세 분석은 로그인 후 제공됩니다.',
    authExpiredMessage: '로그인 세션이 만료되었습니다. 다시 로그인 후 상세 분석을 확인해주세요.',
  };
};

export const getCoachAnalysisUnavailableMessage = (
  gameStatusBucket?: string | null,
): string | null => {
  const normalizedBucket = String(gameStatusBucket || '').trim().toUpperCase();

  if (normalizedBucket === 'CANCELLED') {
    return '취소된 경기는 AI 코치 분석을 제공하지 않습니다.';
  }
  if (normalizedBucket === 'POSTPONED') {
    return '연기된 경기는 일정 확정 후 AI 코치 분석을 제공합니다.';
  }

  return null;
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
