import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatStreamEventError, sendChatMessageStream } from './chatbot';

const buildStreamResponse = (chunks: string[]) => {
  let chunkIndex = 0;

  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunkIndex >= chunks.length) {
        controller.close();
        return;
      }

      controller.enqueue(new TextEncoder().encode(chunks[chunkIndex]));
      chunkIndex += 1;
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
};

test('sendChatMessageStream rejects when SSE error event is received', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: status\n',
    'data: {"message":"⚠️"}\n',
    '\n',
    'event: error\n',
    'data: {"message":"temporary_issue","detail":"지금은 응답 템포가 잠깐 흔들리고 있어요. 같은 질문을 다시 보내주세요."}\n',
    '\n',
  ]) as never);

  await assert.rejects(
    () => sendChatMessageStream(
      { question: '테스트 질문', history: null },
      () => undefined,
    ),
    (error) => {
      assert.ok(error instanceof ChatStreamEventError);
      assert.equal(error.message, 'TEMPORARY_STREAM_ERROR');
      assert.equal(error.eventCode, 'temporary_issue');
      assert.equal(error.detail, '지금은 응답 템포가 잠깐 흔들리고 있어요. 같은 질문을 다시 보내주세요.');
      return true;
    },
  );
});
