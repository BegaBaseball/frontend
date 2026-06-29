import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPredictionEffectiveSearchParams,
  buildPredictionRouteNavigationPath,
} from './predictionRouteNavigation';

test('buildPredictionEffectiveSearchParams overlays route gameId over query params', () => {
  const result = buildPredictionEffectiveSearchParams(
    new URLSearchParams('date=2026-03-07&gameId=LEGACY-1'),
    ' ROUTE-2 ',
  );

  assert.equal(result.get('date'), '2026-03-07');
  assert.equal(result.get('gameId'), 'ROUTE-2');
});

test('buildPredictionRouteNavigationPath uses detail route when gameId is present', () => {
  const path = buildPredictionRouteNavigationPath(new URLSearchParams('date=2026-03-07&gameId=GAME-1'));

  assert.equal(path, '/prediction/matches/GAME-1?date=2026-03-07');
});

test('buildPredictionRouteNavigationPath uses list route when gameId is removed', () => {
  const path = buildPredictionRouteNavigationPath(new URLSearchParams('date=2026-03-07'));

  assert.equal(path, '/prediction?date=2026-03-07');
});
