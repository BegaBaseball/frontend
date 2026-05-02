import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPredictionUserVoteResolution,
  hasRenderableGameDetail,
  resolvePredictionUserVoteResolutionState,
  shouldPreserveUserVoteStateOnError,
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

test('shouldPreserveUserVoteStateOnError는 auth/permission 실패만 유지한다', () => {
  assert.equal(shouldPreserveUserVoteStateOnError('AUTH'), true);
  assert.equal(shouldPreserveUserVoteStateOnError('PERMISSION'), true);
  assert.equal(shouldPreserveUserVoteStateOnError('NETWORK'), false);
  assert.equal(shouldPreserveUserVoteStateOnError('SERVER'), false);
});

test('applyPredictionUserVoteResolution은 요청한 경기만 unknown-auth로 마킹한다', () => {
  assert.deepEqual(
    applyPredictionUserVoteResolution(
      { existing: 'resolved' },
      ['20260520LGKT0', '20260521SSGNC0'],
      'unknown-auth',
    ),
    {
      existing: 'resolved',
      '20260520LGKT0': 'unknown-auth',
      '20260521SSGNC0': 'unknown-auth',
    },
  );
});

test('resolvePredictionUserVoteResolutionState는 값이 없으면 resolved를 기본값으로 사용한다', () => {
  assert.equal(resolvePredictionUserVoteResolutionState({}, '20260520LGKT0'), 'resolved');
  assert.equal(
    resolvePredictionUserVoteResolutionState({ '20260520LGKT0': 'unknown-auth' }, '20260520LGKT0'),
    'unknown-auth',
  );
});
