import {
  buildPredictionDetailPath,
  buildPredictionListPath,
  toPredictionGameId,
} from './predictionDeepLink';

export const buildPredictionEffectiveSearchParams = (
  searchParams: URLSearchParams,
  routeGameId?: string | null,
): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(searchParams);
  const normalizedRouteGameId = toPredictionGameId(routeGameId || '') || '';

  if (normalizedRouteGameId) {
    nextSearchParams.set('gameId', normalizedRouteGameId);
  }

  return nextSearchParams;
};

export const buildPredictionRouteNavigationPath = (
  searchParams: URLSearchParams,
): string => {
  const gameId = toPredictionGameId(searchParams.get('gameId') || '') || '';
  const date = searchParams.get('date') || '';

  return gameId
    ? buildPredictionDetailPath({ gameId, date })
    : buildPredictionListPath({ date });
};
