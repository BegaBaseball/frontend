export type CoachReviewOutcomeSide = 'win' | 'loss' | 'draw';

export interface CoachReviewOutcome {
  home: CoachReviewOutcomeSide;
  away: CoachReviewOutcomeSide;
  isDraw: boolean;
}

type ScoreValue = number | string | null | undefined;

const COMPLETED_STATUS_BUCKETS = new Set([
  'COMPLETED',
  'FINAL',
  'FINISHED',
  'DONE',
  'END',
  'E',
  'F',
  'DRAW',
  'TIE',
]);

const normalizeScore = (value: ScoreValue): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isCoachCompletedStatusBucket = (gameStatusBucket?: string | null): boolean => {
  const normalized = String(gameStatusBucket || '').trim().toUpperCase();
  return COMPLETED_STATUS_BUCKETS.has(normalized);
};

export const resolveCoachReviewOutcome = ({
  gameStatusBucket,
  homeScore,
  awayScore,
}: {
  gameStatusBucket?: string | null;
  homeScore?: ScoreValue;
  awayScore?: ScoreValue;
}): CoachReviewOutcome | null => {
  if (!isCoachCompletedStatusBucket(gameStatusBucket)) {
    return null;
  }

  const normalizedHomeScore = normalizeScore(homeScore);
  const normalizedAwayScore = normalizeScore(awayScore);

  if (normalizedHomeScore === null || normalizedAwayScore === null) {
    return null;
  }

  if (normalizedHomeScore === normalizedAwayScore) {
    return {
      home: 'draw',
      away: 'draw',
      isDraw: true,
    };
  }

  return normalizedHomeScore > normalizedAwayScore
    ? { home: 'win', away: 'loss', isDraw: false }
    : { home: 'loss', away: 'win', isDraw: false };
};

export const getCoachReviewOutcomeLabel = (outcome: CoachReviewOutcomeSide): string => {
  if (outcome === 'win') return '승';
  if (outcome === 'loss') return '패';
  return '무';
};
