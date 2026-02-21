import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QR_REFRESH_LEAD_MS,
  QR_REFRESH_MIN_RETRY_MS,
  resolveQrRefreshDelayMs,
} from './qrRefresh';

test('만료가 충분히 미래이면 만료 2분 전 지연을 반환한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');
  const expiresAt = '2026-03-01T12:30:00Z';

  const delayMs = resolveQrRefreshDelayMs(expiresAt, nowMs);

  assert.equal(delayMs, 30 * 60 * 1000 - QR_REFRESH_LEAD_MS);
});

test('만료 임박이면 최소 10초 재시도를 반환한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');
  const expiresAt = '2026-03-01T12:01:00Z';

  const delayMs = resolveQrRefreshDelayMs(expiresAt, nowMs);

  assert.equal(delayMs, QR_REFRESH_MIN_RETRY_MS);
});

test('만료 시각이 과거면 최소 10초 재시도를 반환한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');
  const expiresAt = '2026-03-01T11:59:00Z';

  const delayMs = resolveQrRefreshDelayMs(expiresAt, nowMs);

  assert.equal(delayMs, QR_REFRESH_MIN_RETRY_MS);
});

test('만료 시각 파싱 실패 문자열이면 최소 10초 재시도를 반환한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');
  const expiresAt = 'not-a-date';

  const delayMs = resolveQrRefreshDelayMs(expiresAt, nowMs);

  assert.equal(delayMs, QR_REFRESH_MIN_RETRY_MS);
});

test('만료 시각이 누락되면 최소 10초 재시도를 반환한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');

  assert.equal(resolveQrRefreshDelayMs(undefined, nowMs), QR_REFRESH_MIN_RETRY_MS);
  assert.equal(resolveQrRefreshDelayMs(null, nowMs), QR_REFRESH_MIN_RETRY_MS);
  assert.equal(resolveQrRefreshDelayMs('', nowMs), QR_REFRESH_MIN_RETRY_MS);
});

test('옵션 파라미터(lead/min)를 전달하면 해당 정책으로 계산한다', () => {
  const nowMs = Date.parse('2026-03-01T12:00:00Z');
  const expiresAt = '2026-03-01T12:01:00Z';
  const customLeadMs = 30_000;
  const customMinRetryMs = 5_000;

  const delayMs = resolveQrRefreshDelayMs(expiresAt, nowMs, customLeadMs, customMinRetryMs);

  assert.equal(delayMs, customLeadMs);
});
