import type { Game, GameDetail } from '../types/prediction';
import { hasRenderableInningScoreData } from './inningScoreParser';

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

  return hasRenderableInningScoreData(detail);
};

export const calculateVotePercentages = (homeVotes: number, awayVotes: number) => {
  const totalVotes = homeVotes + awayVotes;
  const homePercentage = totalVotes > 0 ? Math.round((homeVotes / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((awayVotes / totalVotes) * 100) : 0;

  return { homePercentage, awayPercentage, totalVotes };
};

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
      const inferredFromProgressData = inferStatusFromProgressData();
      if (inferredFromProgressData !== 'UNKNOWN') {
        return inferredFromProgressData;
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

  const isClosed = ['COMPLETED', 'POSTPONED', 'CANCELLED', 'DRAW'].includes(statusCode);
  const isLive = statusCode === 'LIVE';
  const isScheduled = statusCode === 'SCHEDULED';
  let isPastGame = false;
  let isFutureGame = false;

  if (normalizedStatus) {
    if (isClosed) {
      isPastGame = true;
    } else if (isLive) {
      isPastGame = false;
      isFutureGame = false;
    } else if (isScheduled) {
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

  return {
    isPastGame,
    isFutureGame,
    isToday,
    isLive,
    isClosed,
    isScheduled,
    hasStarted,
    statusCode,
    statusLabel: statusCode === 'LIVE'
      ? '경기 진행중'
      : statusCode === 'POSTPONED'
        ? '경기 연기'
        : statusCode === 'CANCELLED'
          ? '경기 취소'
          : statusCode === 'COMPLETED' || statusCode === 'DRAW'
            ? '경기 종료'
            : statusCode === 'UNKNOWN' && hasStarted
              ? '경기 진행중'
              : '경기 예정',
    isVoteOpen: statusCode === 'SCHEDULED' && !hasStarted,
    canShowDetails: statusCode === 'LIVE' || statusCode === 'COMPLETED' || statusCode === 'DRAW' || hasKnownScore,
  };
};
