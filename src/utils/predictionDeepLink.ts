import type { Game, GameDetail } from '../types/prediction';
import {
  normalizePredictionDate,
  resolveDeepLinkSelection,
  type DeepLinkSelection,
  type DeepLinkSelectionOptions,
} from './predictionHomeLogic';

export const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PredictionNavigationSeedGame = {
  gameId?: string;
  homeTeam?: string;
  homeTeamFull?: string;
  awayTeam?: string;
  awayTeamFull?: string;
  time?: string;
  stadium?: string;
  gameStatus?: string;
  gameStatusKr?: string;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  winner?: string | null;
  leagueType?: string;
  sourceDate?: string;
  date?: string;
  gameDate?: string;
};

export type PredictionHandoffSourcePage = 'home' | 'schedule';

export type PredictionMatchHandoffGame = {
  gameId?: string | null;
  homeTeam?: string | null;
  homeTeamFull?: string | null;
  awayTeam?: string | null;
  awayTeamFull?: string | null;
  time?: string | null;
  stadium?: string | null;
  gameStatus?: string | null;
  gameStatusKr?: string | null;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  winner?: string | null;
  leagueType?: string | null;
  sourceDate?: string | null;
  date?: string | null;
  gameDate?: string | null;
};

export type PredictionMatchHandoffState = {
  sourcePage: PredictionHandoffSourcePage;
  gameId: string;
  date: string;
  game: PredictionNavigationSeedGame;
};

export type PredictionMatchHandoff = {
  path: string;
  date: string;
  gameId: string;
  state: PredictionMatchHandoffState;
};

export type PredictionLocationState = {
  sourcePage?: PredictionHandoffSourcePage;
  game?: PredictionNavigationSeedGame;
  gameId?: string;
  date?: string;
} | null | undefined;

export type PredictionDeepLinkNormalizationResult = {
  normalizedGameId: string;
  normalizedDate: string;
  invalidNotice: string | null;
  hasChange: boolean;
  nextSearchParams: URLSearchParams;
};

export type PredictionLocationSeed = {
  stateGame: PredictionNavigationSeedGame | undefined;
  stateGameId: string;
  stateDate: string;
  stateSeedDate: string;
};

export type PredictionRecoveryPathOptions = {
  currentDate?: string | null;
  currentGameId?: string | null;
  searchParams?: URLSearchParams | string | null;
};

export const toPredictionGameId = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return PREDICTION_GAME_ID_PATTERN.test(normalized) ? normalized : null;
};

export const toNumericScore = (value?: number | string | null): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const resolveSeedWinner = (
  homeTeam: string,
  awayTeam: string,
  providedWinner: string | null | undefined,
  homeScore: number | undefined,
  awayScore: number | undefined
): string | undefined => {
  const normalizedWinner = providedWinner?.trim();
  if (normalizedWinner) {
    return normalizedWinner;
  }

  if (homeScore === undefined || awayScore === undefined) {
    return undefined;
  }

  if (homeScore === awayScore) {
    return '무승부';
  }

  return homeScore > awayScore ? homeTeam : awayTeam;
};

export const buildSeedGameDetail = (seedGame: PredictionNavigationSeedGame): GameDetail => ({
  gameId: seedGame.gameId || '',
  gameDate: seedGame.gameDate || seedGame.date,
  stadium: seedGame.stadium,
  stadiumName: seedGame.stadium,
  homeTeam: seedGame.homeTeam || '',
  awayTeam: seedGame.awayTeam || '',
  homeScore: toNumericScore(seedGame.homeScore),
  awayScore: toNumericScore(seedGame.awayScore),
  gameStatus: seedGame.gameStatus,
});

export const extractPredictionLocationSeed = (
  locationState: PredictionLocationState
): PredictionLocationSeed => {
  const stateGame = locationState?.game;
  const stateGameId = typeof locationState?.gameId === 'string'
    ? locationState.gameId.trim()
    : '';
  const stateDate = typeof locationState?.date === 'string'
    ? locationState.date.trim()
    : '';
  const stateSeedDate = typeof stateGame?.sourceDate === 'string'
    ? stateGame.sourceDate.trim()
    : '';

  return {
    stateGame,
    stateGameId,
    stateDate,
    stateSeedDate,
  };
};

export const sanitizePredictionDeepLinkParams = (
  searchParams: URLSearchParams,
  rawDeepLinkGameId: string,
  rawDeepLinkDate: string
): PredictionDeepLinkNormalizationResult => {
  const nextSearchParams = new URLSearchParams(searchParams);
  let hasChange = false;
  let invalidNotice: string | null = null;

  let normalizedGameId = '';
  if (rawDeepLinkGameId) {
    const nextGameId = toPredictionGameId(rawDeepLinkGameId);
    if (!nextGameId) {
      nextSearchParams.delete('gameId');
      hasChange = true;
      invalidNotice = '요청 경로의 gameId 형식이 유효하지 않아 링크를 무시했습니다.';
    } else {
      normalizedGameId = nextGameId;
      if (nextGameId !== rawDeepLinkGameId) {
        nextSearchParams.set('gameId', nextGameId);
        hasChange = true;
      }
    }
  }

  let normalizedDate = '';
  if (rawDeepLinkDate) {
    const nextDate = normalizePredictionDate(rawDeepLinkDate);
    if (!nextDate) {
      nextSearchParams.delete('date');
      hasChange = true;
      invalidNotice = invalidNotice
        ? `${invalidNotice} 날짜 파라미터도 함께 무효합니다.`
        : '요청 경로의 date 형식이 유효하지 않아 링크를 무시했습니다.';
    } else {
      normalizedDate = nextDate;
      if (nextDate !== rawDeepLinkDate) {
        nextSearchParams.set('date', nextDate);
        hasChange = true;
      }
    }
  }

  return {
    normalizedGameId,
    normalizedDate,
    invalidNotice,
    hasChange,
    nextSearchParams,
  };
};

const resolvePredictionRecoverySearchParams = (
  searchParams?: URLSearchParams | string | null
): URLSearchParams => {
  if (searchParams instanceof URLSearchParams) {
    return new URLSearchParams(searchParams.toString());
  }

  if (typeof searchParams === 'string') {
    return new URLSearchParams(searchParams.startsWith('?') ? searchParams.slice(1) : searchParams);
  }

  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search);
  }

  return new URLSearchParams();
};

export const buildPredictionRecoveryPath = ({
  currentDate,
  currentGameId,
  searchParams,
}: PredictionRecoveryPathOptions = {}): string => {
  const resolvedSearchParams = resolvePredictionRecoverySearchParams(searchParams);
  const normalizedCurrentDate = normalizePredictionDate(currentDate || '') || '';
  const normalizedCurrentGameId = toPredictionGameId(currentGameId || '') || '';
  const fallbackDate = normalizePredictionDate(resolvedSearchParams.get('date') || '') || '';
  const fallbackGameId = toPredictionGameId(resolvedSearchParams.get('gameId') || '') || '';
  const nextSearchParams = new URLSearchParams();

  if (normalizedCurrentDate) {
    nextSearchParams.set('date', normalizedCurrentDate);
    if (normalizedCurrentGameId) {
      nextSearchParams.set('gameId', normalizedCurrentGameId);
    }
  } else if (fallbackDate || fallbackGameId) {
    if (fallbackDate) {
      nextSearchParams.set('date', fallbackDate);
    }
    if (fallbackGameId) {
      nextSearchParams.set('gameId', fallbackGameId);
    }
  }

  const query = nextSearchParams.toString();
  return query ? `/prediction?${query}` : '/prediction';
};

export const resolvePredictionHandoffDate = (
  ...candidateDates: Array<string | null | undefined>
): string | null => {
  for (const candidateDate of candidateDates) {
    if (typeof candidateDate !== 'string') {
      continue;
    }

    const normalizedDate = normalizePredictionDate(candidateDate);
    if (normalizedDate) {
      return normalizedDate;
    }
  }

  return null;
};

const toOptionalSeedString = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export const buildPredictionMatchHandoff = ({
  sourcePage,
  game,
  fallbackDate,
}: {
  sourcePage: PredictionHandoffSourcePage;
  game: PredictionMatchHandoffGame;
  fallbackDate?: string | null;
}): PredictionMatchHandoff => {
  const gameId = `${game.gameId ?? ''}`.trim();
  const targetDate = resolvePredictionHandoffDate(
    game.sourceDate,
    game.date,
    game.gameDate,
    fallbackDate,
  ) || '';
  const predictionParams = new URLSearchParams();

  if (targetDate) {
    predictionParams.set('date', targetDate);
  }
  if (gameId) {
    predictionParams.set('gameId', gameId);
  }

  const query = predictionParams.toString();
  const seedGame: PredictionNavigationSeedGame = {
    gameId,
    homeTeam: toOptionalSeedString(game.homeTeam),
    homeTeamFull: toOptionalSeedString(game.homeTeamFull),
    awayTeam: toOptionalSeedString(game.awayTeam),
    awayTeamFull: toOptionalSeedString(game.awayTeamFull),
    time: toOptionalSeedString(game.time),
    stadium: toOptionalSeedString(game.stadium),
    gameStatus: toOptionalSeedString(game.gameStatus),
    gameStatusKr: toOptionalSeedString(game.gameStatusKr),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    winner: game.winner ?? null,
    leagueType: toOptionalSeedString(game.leagueType),
    sourceDate: targetDate,
    date: targetDate,
    gameDate: targetDate,
  };

  return {
    path: query ? `/prediction?${query}` : '/prediction',
    date: targetDate,
    gameId,
    state: {
      sourcePage,
      gameId,
      date: targetDate,
      game: seedGame,
    },
  };
};

export const buildPredictionNavigationSeedGame = (
  stateGame: PredictionNavigationSeedGame | undefined,
  deepLinkGameId: string,
  deepLinkDate: string
): Game | null => {
  if (!stateGame) {
    return null;
  }

  if (deepLinkGameId && typeof stateGame.gameId === 'string' && stateGame.gameId.trim() !== deepLinkGameId) {
    return null;
  }

  const gameId = toPredictionGameId(stateGame.gameId || '') || '';
  if (!gameId) {
    return null;
  }

  const homeTeam = (stateGame.homeTeam || stateGame.homeTeamFull || '').trim();
  const awayTeam = (stateGame.awayTeam || stateGame.awayTeamFull || '').trim();
  if (!homeTeam || !awayTeam) {
    return null;
  }

  const seedHomeScore = toNumericScore(stateGame.homeScore);
  const seedAwayScore = toNumericScore(stateGame.awayScore);
  const seedDate = normalizePredictionDate(
    stateGame.sourceDate || stateGame.date || stateGame.gameDate || deepLinkDate || ''
  ) || '';

  return {
    gameId,
    homeTeam,
    awayTeam,
    stadium: (stateGame.stadium || '구장 미정').trim(),
    gameDate: seedDate,
    homeScore: seedHomeScore,
    awayScore: seedAwayScore,
    winner: resolveSeedWinner(homeTeam, awayTeam, stateGame.winner, seedHomeScore, seedAwayScore),
    leagueType: stateGame.leagueType,
  } as Game;
};

export const buildDeepLinkNotFoundMessage = (
  deepLinkGameId: string,
  deepLinkDate: string,
  deepLinkParamValidationNotice: string | null
): string => {
  const messages: string[] = [];
  if (deepLinkParamValidationNotice) {
    messages.push(deepLinkParamValidationNotice);
  }
  if (deepLinkGameId) {
    messages.push(`게임 ID(${deepLinkGameId})`);
  }
  if (deepLinkDate) {
    messages.push(`날짜(${deepLinkDate})`);
  }

  if (messages.length) {
    const actionMessage = deepLinkGameId
      ? '경기 목록에서 다시 선택해주세요.'
      : '기본 화면으로 이동합니다.';
    return `요청하신 ${messages.join(', ')} 경기는 현재 목록에서 찾을 수 없습니다. ${actionMessage}`;
  }

  return '요청한 경기를 현재 목록에서 찾을 수 없어 기본 화면으로 이동합니다.';
};

export const resolvePredictionDeepLinkSelection = (
  allDatesData: Parameters<typeof resolveDeepLinkSelection>[0],
  gameId: string,
  date: string,
  options?: DeepLinkSelectionOptions
): DeepLinkSelection | null => {
  return resolveDeepLinkSelection(allDatesData, gameId, date, options);
};
