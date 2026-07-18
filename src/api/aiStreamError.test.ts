import assert from 'node:assert/strict';
import test from 'node:test';

import { AI_EVENT_VERSION_HEADER } from './aiStreamContract';
import {
  decodeAiStreamHttpError,
  normalizeAiStreamEventError,
  RateLimitError,
} from './aiStreamError';

test('exports the negotiated AI event version header', () => {
  assert.equal(AI_EVENT_VERSION_HEADER, 'X-AI-Event-Version');
});

test('decodes the canonical top-level error without losing fields', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    code: 'AI_EVENT_VERSION_UNSUPPORTED',
    message: '지원하지 않는 AI 이벤트 버전입니다.',
    detail: null,
    retryable: false,
    retry_after_seconds: null,
    supported_versions: ['1', '2'],
  }), { status: 406, headers: { 'content-type': 'application/json' } }));

  assert.equal(error.statusCode, 406);
  assert.equal(error.code, 'AI_EVENT_VERSION_UNSUPPORTED');
  assert.deepEqual(error.supportedVersions, ['1', '2']);
  assert.equal(error.retryable, false);
});

test('prefers canonical retry timing over the Retry-After header', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    code: 'AI_RATE_LIMITED',
    message: '요청이 많습니다.',
    detail: '잠시 후 다시 시도해주세요.',
    retryable: true,
    retry_after_seconds: 9,
    supported_versions: [],
  }), { status: 429, headers: { 'Retry-After': '17' } }));

  assert.equal(error.retryAfterSeconds, 9);
});

test('adapts old FastAPI detail wrapper', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    detail: { code: 'AI_EVENT_VERSION_UNSUPPORTED', supported_versions: ['1', '2'] },
  }), { status: 406 }));
  assert.equal(error.code, 'AI_EVENT_VERSION_UNSUPPORTED');
  assert.deepEqual(error.supportedVersions, ['1', '2']);
});

test('adapts old Spring ApiResponse', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    success: false,
    code: 'AI_UPSTREAM_TIMEOUT',
    message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  }), { status: 504 }));
  assert.equal(error.code, 'AI_UPSTREAM_TIMEOUT');
  assert.equal(error.retryable, true);
});

test('invalid body uses safe fallback and never exposes raw text', async () => {
  const error = await decodeAiStreamHttpError(new Response(
    'secret-bearing upstream html',
    { status: 503, headers: { 'Retry-After': '17' } },
  ));
  assert.equal(error.code, 'AI_STREAM_REQUEST_FAILED');
  assert.equal(error.retryAfterSeconds, 17);
  assert.equal(error.retryable, true);
  assert.doesNotMatch(error.message, /secret-bearing/);
});

test('rejects invalid supported versions and invalid Retry-After values', async () => {
  const canonical = await decodeAiStreamHttpError(new Response(JSON.stringify({
    code: 'AI_EVENT_VERSION_UNSUPPORTED',
    message: '지원하지 않는 AI 이벤트 버전입니다.',
    detail: null,
    retryable: false,
    retry_after_seconds: -1,
    supported_versions: ['1', '3', 2],
  }), { status: 406 }));
  const datedHeader = await decodeAiStreamHttpError(new Response('{}', {
    status: 503,
    headers: { 'Retry-After': 'Wed, 21 Oct 2015 07:28:00 GMT' },
  }));

  assert.deepEqual(canonical.supportedVersions, ['1']);
  assert.equal(canonical.retryAfterSeconds, null);
  assert.equal(datedHeader.retryAfterSeconds, null);
});

test('normalizes in-stream error without inventing HTTP-only fields', () => {
  assert.deepEqual(normalizeAiStreamEventError({
    code: 'COACH_ANALYSIS_FAILED',
    message: '분석 실패',
    detail: '안전한 상세',
    retryable: true,
  }), {
    code: 'COACH_ANALYSIS_FAILED',
    message: '분석 실패',
    detail: '안전한 상세',
    retryable: true,
    retryAfterSeconds: null,
    supportedVersions: [],
  });
});

test('RateLimitError retains details and falls back to ten seconds', () => {
  const error = new RateLimitError({
    code: 'AI_RATE_LIMITED',
    message: '요청이 많아 잠시 후 다시 시도해주세요.',
    detail: '안전한 상세',
    retryable: true,
    retryAfterSeconds: null,
    supportedVersions: ['1', '2'],
  });

  assert.equal(error.name, 'RateLimitError');
  assert.equal(error.retryAfterSeconds, 10);
  assert.equal(error.code, 'AI_RATE_LIMITED');
  assert.equal(error.detail, '안전한 상세');
  assert.deepEqual(error.supportedVersions, ['1', '2']);
});
