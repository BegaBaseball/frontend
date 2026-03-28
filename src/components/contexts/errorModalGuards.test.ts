import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldIgnoreGlobalApiError } from './errorModalGuards';

test('INVALID_AUTHOR 응답은 전역 에러 모달에서 무시한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'invalid author',
    statusCode: 401,
    responseCode: 'INVALID_AUTHOR',
  }), true);
});

test('취소된 요청 오류는 전역 에러 모달에서 무시한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request was canceled',
    statusCode: 0,
  }), true);
});

test('홈 라우트의 홈 bootstrap 500 오류는 전역 에러 모달에서 무시한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
    endpoint: '/home/bootstrap?date=2026-03-16',
  }, '/home'), true);
});

test('홈 라우트의 home widgets 500 오류는 전역 에러 모달에서 무시한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
    endpoint: '/home/widgets?date=2026-03-16&seasonYear=2025',
  }, '/home'), true);
});

test('홈 라우트의 공개 메이트 fallback 500 오류는 전역 에러 모달에서 무시한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
    endpoint: '/parties?page=0&size=1000',
  }, '/home'), true);
});

test('비홈 라우트의 홈 엔드포인트 500 오류는 전역 에러 모달을 유지한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
    endpoint: '/home/bootstrap?date=2026-03-16',
  }, '/stadium'), false);
});

test('홈 라우트라도 비홈 엔드포인트 500 오류는 전역 에러 모달을 유지한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
    endpoint: '/stadiums',
  }, '/home'), false);
});

test('엔드포인트 정보가 없는 서버 500 오류는 전역 에러 모달을 유지한다', () => {
  assert.equal(shouldIgnoreGlobalApiError({
    message: 'Request failed with status code 500',
    statusCode: 500,
  }, '/home'), false);
});
