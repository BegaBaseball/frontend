import { getTodayString } from '../utils/predictionDates';
import {
  buildDeepLinkNotFoundMessage,
  buildPredictionRecoveryPath,
  buildPredictionNavigationSeedGame,
  buildSeedGameDetail,
  resolvePredictionDeepLinkSelection,
  sanitizePredictionDeepLinkParams,
} from '../utils/predictionDeepLink';
import { normalizePredictionDate } from '../utils/predictionHomeLogic';
import type { DateGames, Game, GameDetail } from '../types/prediction';
import { DEEP_LINK_RESOLVE_MAX_ATTEMPTS } from './predictionHookShared';

type PredictionNavigationSeedRuntimeResult = {
  normalizedSeedDate: string;
  seededGame: Game;
  seededGameDetail: GameDetail;
  nextAllDatesData: DateGames[];
};

type PredictionScheduleDeepLinkSelectionOutcome =
  | {
    type: 'resolved';
    notice: string | null;
    selection?: { dateIndex: number; gameIndex: number };
  }
  | {
    type: 'load-single-date';
    targetDate: string;
    nextAttempt: number;
  }
  | {
    type: 'load-more';
    direction: 'past' | 'future';
    nextAttempt: number;
    nextDirection: 'past' | 'future';
  }
  | {
    type: 'fallback';
    notice: string;
  };

type BuildPredictionNavigationSeedRuntimeResultOptions = {
  navigationSeedGame: Game | null;
  deepLinkDate: string;
  stateGame: Parameters<typeof buildSeedGameDetail>[0] | undefined;
};

type ResolvePredictionScheduleDeepLinkOutcomeOptions = {
  allDatesData: DateGames[];
  currentDateIndex: number;
  deepLinkGameId: string;
  deepLinkDate: string;
  deepLinkParamValidationNotice: string | null;
  canResolveMorePast: boolean;
  canResolveMoreFuture: boolean;
  deepLinkResolutionAttempt: number;
  deepLinkResolutionDirection: 'past' | 'future';
  maxAttempts?: number;
};

type RunPredictionScheduleDeepLinkResolutionOptions = ResolvePredictionScheduleDeepLinkOutcomeOptions & {
  onMarkDeepLinkResolved: () => void;
  onSetDeepLinkNotice: (notice: string | null) => void;
  onSelectResolvedDeepLink: (selection: { dateIndex: number; gameIndex: number }) => void;
  onEmitSelectionResolved: (gameId?: string) => void;
  onLoadSingleDate: (targetDate: string, nextAttempt: number) => void;
  onLoadMore: (
    direction: 'past' | 'future',
    nextAttempt: number,
    nextDirection: 'past' | 'future',
  ) => void;
  onFallback: (notice: string, currentGameId?: string) => void;
};

export {
  buildDeepLinkNotFoundMessage,
  buildPredictionRecoveryPath,
  sanitizePredictionDeepLinkParams,
} from '../utils/predictionDeepLink';

export const buildPredictionNavigationSeedRuntimeResult = ({
  navigationSeedGame,
  deepLinkDate,
  stateGame,
}: BuildPredictionNavigationSeedRuntimeResultOptions): PredictionNavigationSeedRuntimeResult | null => {
  if (!navigationSeedGame || !stateGame) {
    return null;
  }

  const normalizedSeedDate = normalizePredictionDate(
    navigationSeedGame.gameDate || deepLinkDate || getTodayString(),
  ) || getTodayString();
  const seededGame: Game = {
    ...navigationSeedGame,
    gameDate: normalizedSeedDate,
  };

  return {
    normalizedSeedDate,
    seededGame,
    seededGameDetail: buildSeedGameDetail({
      ...stateGame,
      gameId: seededGame.gameId,
      homeTeam: seededGame.homeTeam,
      awayTeam: seededGame.awayTeam,
      stadium: seededGame.stadium,
      homeScore: seededGame.homeScore,
      awayScore: seededGame.awayScore,
      winner: seededGame.winner,
      leagueType: seededGame.leagueType,
      gameDate: normalizedSeedDate,
    }),
    nextAllDatesData: [{ date: normalizedSeedDate, games: [seededGame] }],
  };
};

export const resolvePredictionScheduleDeepLinkOutcome = ({
  allDatesData,
  currentDateIndex,
  deepLinkGameId,
  deepLinkDate,
  deepLinkParamValidationNotice,
  canResolveMorePast,
  canResolveMoreFuture,
  deepLinkResolutionAttempt,
  deepLinkResolutionDirection,
  maxAttempts = DEEP_LINK_RESOLVE_MAX_ATTEMPTS,
}: ResolvePredictionScheduleDeepLinkOutcomeOptions): PredictionScheduleDeepLinkSelectionOutcome => {
  const buildFallbackNotice = () => buildDeepLinkNotFoundMessage(
    deepLinkGameId,
    deepLinkDate,
    deepLinkParamValidationNotice,
  );

  if (!deepLinkGameId && !deepLinkDate) {
    return {
      type: 'resolved',
      notice: deepLinkParamValidationNotice
        ? `${deepLinkParamValidationNotice} 기본 화면으로 이동합니다.`
        : null,
    };
  }

  const selection = resolvePredictionDeepLinkSelection(allDatesData, deepLinkGameId, deepLinkDate);
  if (selection) {
    return {
      type: 'resolved',
      notice: deepLinkParamValidationNotice,
      selection,
    };
  }

  if (deepLinkDate) {
    const isTargetDateLoaded = allDatesData.some((entry) => entry.date === deepLinkDate);
    if (!isTargetDateLoaded && deepLinkResolutionAttempt < 2) {
      return {
        type: 'load-single-date',
        targetDate: deepLinkDate,
        nextAttempt: deepLinkResolutionAttempt + 1,
      };
    }

    return {
      type: 'fallback',
      notice: buildFallbackNotice(),
    };
  }

  if ((canResolveMorePast || canResolveMoreFuture) && deepLinkResolutionAttempt < maxAttempts) {
    const nextDirection = deepLinkResolutionDirection === 'future' ? 'past' : 'future';
    const direction =
      deepLinkResolutionDirection === 'future' && canResolveMoreFuture
        ? 'future'
        : 'past';

    return {
      type: 'load-more',
      direction,
      nextAttempt: deepLinkResolutionAttempt + 1,
      nextDirection,
    };
  }

  return {
    type: 'fallback',
    notice: buildFallbackNotice(),
  };
};

export const runPredictionScheduleDeepLinkResolution = ({
  allDatesData,
  currentDateIndex,
  deepLinkGameId,
  deepLinkDate,
  deepLinkParamValidationNotice,
  canResolveMorePast,
  canResolveMoreFuture,
  deepLinkResolutionAttempt,
  deepLinkResolutionDirection,
  maxAttempts,
  onMarkDeepLinkResolved,
  onSetDeepLinkNotice,
  onSelectResolvedDeepLink,
  onEmitSelectionResolved,
  onLoadSingleDate,
  onLoadMore,
  onFallback,
}: RunPredictionScheduleDeepLinkResolutionOptions) => {
  const outcome = resolvePredictionScheduleDeepLinkOutcome({
    allDatesData,
    currentDateIndex,
    deepLinkGameId,
    deepLinkDate,
    deepLinkParamValidationNotice,
    canResolveMorePast,
    canResolveMoreFuture,
    deepLinkResolutionAttempt,
    deepLinkResolutionDirection,
    maxAttempts,
  });

  if (outcome.type === 'resolved') {
    onMarkDeepLinkResolved();
    onSetDeepLinkNotice(outcome.notice);
    if (outcome.selection) {
      const selectedDeepLinkGameId =
        allDatesData[outcome.selection.dateIndex]?.games[outcome.selection.gameIndex]?.gameId;
      onSelectResolvedDeepLink(outcome.selection);
      onEmitSelectionResolved(selectedDeepLinkGameId);
    }
    return;
  }

  if (outcome.type === 'load-single-date') {
    onLoadSingleDate(outcome.targetDate, outcome.nextAttempt);
    return;
  }

  if (outcome.type === 'load-more') {
    onLoadMore(outcome.direction, outcome.nextAttempt, outcome.nextDirection);
    return;
  }

  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  onMarkDeepLinkResolved();
  onSetDeepLinkNotice(outcome.notice);
  onFallback(outcome.notice, currentDateGames[0]?.gameId);
};

export const buildPredictionNavigationSeedPreview = buildPredictionNavigationSeedGame;
