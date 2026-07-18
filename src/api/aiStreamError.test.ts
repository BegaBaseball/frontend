import assert from 'node:assert/strict';
import test from 'node:test';

import { AI_EVENT_VERSION_HEADER } from './aiStreamContract';
import {
  decodeAiStreamHttpError,
  normalizeAiStreamEventError,
  RateLimitError,
  resolveRateLimitErrorDetails,
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
  assert.equal(error.message, '지원하지 않는 AI 이벤트 버전입니다.');
  assert.equal(error.detail, null);
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
    detail: {
      code: 'AI_EVENT_VERSION_UNSUPPORTED',
      supported_versions: ['1', '2'],
      message: 'secret-bearing nested message',
      detail: 'secret-bearing nested detail',
    },
  }), { status: 406 }));
  assert.equal(error.code, 'AI_EVENT_VERSION_UNSUPPORTED');
  assert.equal(error.message, '지원하지 않는 AI 이벤트 버전입니다.');
  assert.equal(error.detail, null);
  assert.deepEqual(error.supportedVersions, ['1', '2']);
  assert.doesNotMatch(error.message, /secret-bearing/);
});

test('rejects nested FastAPI-like bodies outside the exact legacy version adapter', async () => {
  const wrongStatus = await decodeAiStreamHttpError(new Response(JSON.stringify({
    detail: {
      code: 'AI_EVENT_VERSION_UNSUPPORTED',
      supported_versions: ['1', '2'],
      message: 'secret-bearing nested message',
    },
  }), { status: 500 }));
  const wrongCode = await decodeAiStreamHttpError(new Response(JSON.stringify({
    detail: {
      code: 'INTERNAL_ERROR',
      supported_versions: ['1', '2'],
      message: 'secret-bearing nested message',
    },
  }), { status: 406 }));
  const wrongVersions = await decodeAiStreamHttpError(new Response(JSON.stringify({
    detail: {
      code: 'AI_EVENT_VERSION_UNSUPPORTED',
      supported_versions: ['2', '1'],
      message: 'secret-bearing nested message',
    },
  }), { status: 406 }));

  for (const error of [wrongStatus, wrongCode, wrongVersions]) {
    assert.equal(error.code, 'AI_STREAM_REQUEST_FAILED');
    assert.equal(error.detail, null);
    assert.doesNotMatch(error.message, /secret-bearing/);
  }
});

test('adapts old Spring ApiResponse', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    success: false,
    code: 'AI_UPSTREAM_TIMEOUT',
    message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    data: { internal: 'secret-bearing nested data' },
  }), { status: 504 }));
  assert.equal(error.code, 'AI_UPSTREAM_TIMEOUT');
  assert.equal(error.detail, null);
  assert.equal(error.retryable, true);
});

test('rejects malformed old Spring responses instead of salvaging their message', async () => {
  const error = await decodeAiStreamHttpError(new Response(JSON.stringify({
    success: false,
    message: 'secret-bearing spring message',
    data: { internal: 'secret-bearing nested data' },
  }), { status: 500 }));

  assert.equal(error.code, 'AI_STREAM_REQUEST_FAILED');
  assert.equal(error.detail, null);
  assert.doesNotMatch(error.message, /secret-bearing/);
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

test('rejects the entire canonical candidate when any field or invariant is invalid', async () => {
  const base = {
    code: 'AI_UPSTREAM_UNAVAILABLE',
    message: 'secret-bearing canonical message',
    detail: 'secret-bearing canonical detail',
    retryable: true,
    retry_after_seconds: 3,
    supported_versions: [],
  };
  const invalidCandidates = [
    { ...base, extra: true },
    { ...base, detail: 7 },
    { ...base, retryable: 'true' },
    { ...base, retry_after_seconds: -1 },
    { ...base, retry_after_seconds: 1.5 },
    { ...base, supported_versions: ['1', '2'] },
    {
      ...base,
      code: 'AI_EVENT_VERSION_UNSUPPORTED',
      supported_versions: [],
    },
    {
      ...base,
      code: 'AI_EVENT_VERSION_UNSUPPORTED',
      supported_versions: ['2', '1'],
    },
    {
      code: base.code,
      message: base.message,
      detail: base.detail,
      retryable: base.retryable,
      retry_after_seconds: base.retry_after_seconds,
    },
  ];

  for (const candidate of invalidCandidates) {
    const error = await decodeAiStreamHttpError(new Response(JSON.stringify(candidate), {
      status: 503,
    }));
    assert.equal(error.code, 'AI_STREAM_REQUEST_FAILED');
    assert.equal(error.detail, null);
    assert.doesNotMatch(error.message, /secret-bearing/);
  }
});

test('rejects invalid Retry-After values', async () => {
  const datedHeader = await decodeAiStreamHttpError(new Response('{}', {
    status: 503,
    headers: { 'Retry-After': 'Wed, 21 Oct 2015 07:28:00 GMT' },
  }));

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

test('shared rate-limit mapping keeps the public message and retry timing', () => {
  const mapped = resolveRateLimitErrorDetails(new RateLimitError({
    code: 'AI_RATE_LIMITED',
    message: '요청이 많아 잠시 후 다시 시도해주세요.',
    detail: null,
    retryable: true,
    retryAfterSeconds: 23,
    supportedVersions: [],
  }));

  assert.deepEqual(mapped, {
    message: '요청이 많아 잠시 후 다시 시도해주세요.',
    retryAfterSeconds: 23,
  });
  assert.equal(resolveRateLimitErrorDetails(new Error('not rate limited')), null);
});
