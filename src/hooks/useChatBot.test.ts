import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatStreamEventError, sendChatMessageStream } from '../api/chatbot';
import { resolveChatBotFailureText } from './useChatBot';

const createChatStreamError = (
  message: string,
  detail: string | null,
  upstreamMessageIsPublic = false,
) => (
  new ChatStreamEventError({
    code: 'AI_STREAM_FAILED',
    message,
    detail,
    retryable: false,
    retryAfterSeconds: null,
    supportedVersions: [],
  }, { upstreamMessageIsPublic })
);

const buildStreamResponse = (body: string, headers: Record<string, string> = {}) => new Response(body, {
  status: 200,
  headers: { 'Content-Type': 'text/event-stream', ...headers },
});

test('chat UI boundary uses an explicitly public upstreamMessage when detail is null', () => {
  assert.equal(
    resolveChatBotFailureText(createChatStreamError('공개 upstream 메시지', null, true)),
    '공개 upstream 메시지',
  );
});

test('chat UI boundary prefers detail over upstreamMessage', () => {
  assert.equal(
    resolveChatBotFailureText(createChatStreamError('공개 upstream 메시지', '공개 상세 메시지')),
    '공개 상세 메시지',
  );
});

test('chat UI boundary uses the generic fallback when detail and upstreamMessage are empty', () => {
  assert.equal(
    resolveChatBotFailureText(createChatStreamError('', null)),
    '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
  );
});

test('chat UI boundary does not display a v1 SSE producer message without public provenance', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '1';
  t.after(() => {
    if (previousVersion === undefined) delete process.env.VITE_AI_EVENT_VERSION;
    else process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse(
    'event: error\ndata: {"code":"AI_STREAM_FAILED","message":"secret-bearing v1 diagnostic","detail":null}\n\n',
  ));

  await assert.rejects(
    () => sendChatMessageStream({ question: '오류', history: null }, () => undefined),
    (error) => {
      assert.equal(
        resolveChatBotFailureText(error),
        '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
      );
      return true;
    },
  );
});

test('chat UI boundary does not display a v2 SSE producer message without public provenance', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    if (previousVersion === undefined) delete process.env.VITE_AI_EVENT_VERSION;
    else process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse(
    'event: stream.error\ndata: {"version":2,"type":"stream.error","data":{"code":"AI_STREAM_FAILED","message":"secret-bearing v2 diagnostic","detail":null,"retryable":false}}\n\n',
    { 'X-AI-Event-Version': '2' },
  ));

  await assert.rejects(
    () => sendChatMessageStream({ question: '오류', history: null }, () => undefined),
    (error) => {
      assert.equal(
        resolveChatBotFailureText(error),
        '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
      );
      return true;
    },
  );
});
