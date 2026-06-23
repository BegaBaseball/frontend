import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApiUrl,
  buildApiRequestHeaders,
  createTimeoutController,
  parseResponseBody,
  toJsonRequestBody,
  toRequestBody,
} from './httpClientCore';

test('buildApiUrl appends non-null query params to a same-origin API path', () => {
  const url = buildApiUrl('/kbo/schedule', {
    date: '2026-03-16',
    limit: 0,
    includePostseason: false,
    skip: null,
    omit: undefined,
  });

  assert.equal(url, '/api/kbo/schedule?date=2026-03-16&limit=0&includePostseason=false');
});

test('parseResponseBody preserves existing JSON, text, empty, and 204 response handling', async () => {
  assert.deepEqual(
    await parseResponseBody(new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
      status: 200,
    })),
    { ok: true },
  );
  assert.deepEqual(await parseResponseBody(new Response('plain error', { status: 500 })), {
    message: 'plain error',
  });
  assert.equal(await parseResponseBody(new Response('', { status: 200 })), null);
  assert.equal(await parseResponseBody(new Response(null, { status: 204 })), null);
});

test('request body helpers preserve BodyInit values and only add JSON content type for non-FormData bodies', () => {
  const formData = new FormData();
  formData.set('file', new Blob(['x']), 'x.txt');

  assert.equal(toRequestBody(formData), formData);
  assert.equal(toJsonRequestBody({ ok: true }), '{"ok":true}');
  assert.deepEqual(buildApiRequestHeaders(toRequestBody({ ok: true })), {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(buildApiRequestHeaders(toRequestBody(formData)), {
    Accept: 'application/json',
  });
});

test('createTimeoutController aborts when the caller signal aborts and removes the listener on cleanup', () => {
  const upstream = new AbortController();
  const timeout = createTimeoutController(10_000, upstream.signal);

  assert.equal(timeout.signal.aborted, false);
  upstream.abort();
  assert.equal(timeout.signal.aborted, true);

  timeout.cleanup();
});
