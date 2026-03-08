import test from 'node:test';
import assert from 'node:assert/strict';

import { installSafeConsole } from './safeLogger';

interface WindowLike {
  console: Record<string, (...args: unknown[]) => void>;
  __safeLoggerState?: Record<string, (...args: unknown[]) => void>;
  __safeLoggerPatched?: boolean;
}

const setupSafeConsoleCapture = () => {
  const calls: unknown[][] = [];
  const fakeConsole: WindowLike['console'] = {
    error: (...args: unknown[]) => {
      calls.push(args);
    },
    warn: (...args: unknown[]) => {
      calls.push(args);
    },
    info: (...args: unknown[]) => {
      calls.push(args);
    },
    log: (...args: unknown[]) => {
      calls.push(args);
    },
    debug: (...args: unknown[]) => {
      calls.push(args);
    },
  };

  const windowLike: WindowLike = {
    console: fakeConsole,
    __safeLoggerState: {},
    __safeLoggerPatched: false,
  };
  (globalThis as { window?: WindowLike }).window = windowLike;
  installSafeConsole();
  return { calls, console: windowLike.console };
};

test('safeLogger strips query strings from URL-like log arguments', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.error('oauth callback', 'https://api.example.com/callback?code=abc123&state=xyz');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'https://api.example.com/callback');
});

test('safeLogger redacts inline token-like assignments', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.error('headers', 'Authorization=BearerAbcdef123');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'Authorization=[REDACTED]');
});

test('safeLogger redacts bearer token values', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.warn('auth', 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.payload');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'Bearer [REDACTED]');
});

test('safeLogger redacts JWT-shaped tokens', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.info('token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123signature');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], '[REDACTED_JWT]');
});

test('safeLogger redacts sensitive keys in objects', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.error('response', {
    accessToken: 'secret-token',
    nested: {
      token: 'nested-token',
    },
  });

  assert.equal(calls.length, 1);
  const payload = calls[0][1] as { accessToken: unknown; nested: { token: unknown } };
  assert.equal(payload.accessToken, '[REDACTED]');
  assert.equal(payload.nested.token, '[REDACTED]');
});

test('safeLogger redacts sensitive label/value pairs in plain text', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.warn('auth', 'Authorization: token-abc-123');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'Authorization: [REDACTED]');
});

test('safeLogger redacts sensitive key-values inside json-like strings', () => {
  const { calls, console } = setupSafeConsoleCapture();
  console.info('response', '{"accessToken":"token-abc-123","name":"user"}');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], '{"accessToken": [REDACTED],"name":"user"}');
});
