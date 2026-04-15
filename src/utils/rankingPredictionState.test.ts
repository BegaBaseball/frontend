import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRankingPredictionInitFailure } from './rankingPredictionState';

test('resolveRankingPredictionInitFailure는 종료 코드를 closed로 분류한다', () => {
  assert.equal(resolveRankingPredictionInitFailure({
    status: 409,
    message: '현재는 순위 예측 기간이 아닙니다.',
    data: {
      code: 'RANKING_PREDICTION_CLOSED',
      message: '현재는 순위 예측 기간이 아닙니다.',
    },
  }), 'closed');
});

test('resolveRankingPredictionInitFailure는 인증 오류를 redirect-auth로 분류한다', () => {
  assert.equal(resolveRankingPredictionInitFailure({
    status: 401,
    message: '로그인이 필요합니다.',
    data: {
      code: 'AUTHENTICATION_REQUIRED',
      message: '로그인이 필요합니다.',
    },
  }), 'redirect-auth');
});

test('resolveRankingPredictionInitFailure는 서버 오류를 error로 분류한다', () => {
  assert.equal(resolveRankingPredictionInitFailure({
    status: 500,
    message: '서버 오류가 발생했습니다.',
    data: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    },
  }), 'error');
});
