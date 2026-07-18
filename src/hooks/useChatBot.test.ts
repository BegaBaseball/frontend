import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatStreamEventError } from '../api/chatbot';
import { resolveChatBotFailureText } from './useChatBot';

const createChatStreamError = (message: string, detail: string | null) => (
  new ChatStreamEventError({
    code: 'AI_STREAM_FAILED',
    message,
    detail,
    retryable: false,
    retryAfterSeconds: null,
    supportedVersions: [],
  })
);

test('chat UI boundary uses upstreamMessage when ChatStreamEventError detail is null', () => {
  assert.equal(
    resolveChatBotFailureText(createChatStreamError('공개 upstream 메시지', null)),
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
