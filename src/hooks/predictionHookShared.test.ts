import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasRenderableGameDetail,
  shouldShowPredictionDetailFallback,
} from './predictionHookShared';

test('hasRenderableGameDetail은 기존 데이터가 있으면 true를 반환한다', () => {
  assert.equal(hasRenderableGameDetail({
    data: {
      gameId: '20260320HHLG0',
    } as never,
  }), true);

  assert.equal(hasRenderableGameDetail({
    data: null,
    hasRenderableData: true,
  }), true);

  assert.equal(hasRenderableGameDetail({
    data: null,
    hasRenderableData: false,
  }), false);
});

test('shouldShowPredictionDetailFallback은 렌더 가능한 데이터가 전혀 없을 때만 true를 반환한다', () => {
  assert.equal(shouldShowPredictionDetailFallback({
    detailError: 'timeout',
    hasRenderableData: false,
    hasCurrentGame: false,
  }), true);

  assert.equal(shouldShowPredictionDetailFallback({
    detailError: 'timeout',
    hasRenderableData: true,
    hasCurrentGame: false,
  }), false);

  assert.equal(shouldShowPredictionDetailFallback({
    detailError: 'timeout',
    hasRenderableData: false,
    hasCurrentGame: true,
  }), false);
});
