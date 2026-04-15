import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomeNavigationState, buildHomeRequestErrorContext } from './homeErrorContext';
import { PublicApiError } from '../api/publicClient';

test('buildHomeRequestErrorContext는 axios-like 오류의 상태와 code를 노출한다', () => {
  const context = buildHomeRequestErrorContext({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed with status code 500',
    response: {
      status: 500,
      data: {
        code: 'HOME_BOOTSTRAP_FAILED',
      },
    },
  }, '/home/bootstrap', new Date('2026-03-16T12:00:00'));

  assert.deepEqual(context, {
    endpoint: '/home/bootstrap',
    selectedDate: '2026-03-16',
    status: 500,
    responseCode: 'HOME_BOOTSTRAP_FAILED',
    errorName: 'AxiosError',
    message: 'Request failed with status code 500',
  });
});

test('buildHomeRequestErrorContext는 일반 Error에서 fallback 정보를 유지한다', () => {
  const context = buildHomeRequestErrorContext(
    new Error('boom'),
    '/home/bootstrap',
    new Date('2026-03-16T12:00:00'),
  );

  assert.deepEqual(context, {
    endpoint: '/home/bootstrap',
    selectedDate: '2026-03-16',
    status: null,
    responseCode: null,
    errorName: 'Error',
    message: 'boom',
  });
});

test('buildHomeRequestErrorContext는 PublicApiError의 상태와 code를 노출한다', () => {
  const context = buildHomeRequestErrorContext(
    new PublicApiError(409, 'manual data required', {
      code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    }),
    '/home/bootstrap',
    new Date('2026-04-13T12:00:00'),
  );

  assert.deepEqual(context, {
    endpoint: '/home/bootstrap',
    selectedDate: '2026-04-13',
    status: 409,
    responseCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    errorName: 'PublicApiError',
    message: 'manual data required',
  });
});

test('buildHomeNavigationState는 날짜가 있으면 기본 hasPrev/hasNext를 계산한다', () => {
  const state = buildHomeNavigationState({
    prevGameDate: '2026-03-15',
    nextGameDate: null,
  });

  assert.deepEqual(state, {
    prev: '2026-03-15',
    next: null,
    hasPrev: true,
    hasNext: false,
  });
});
