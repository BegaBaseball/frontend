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

test('sendChatMessageStream normalizes meta payload into shared AI shapes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"verified":true,"cached":true,"intent":"team_summary","strategy":"rag_v3","style":"compact","data_sources":[{"title":"KBO","url":"https://example.com/source"}],"tool_calls":[{"tool_name":"document_query","parameters":{"team":"KIA"}}]}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  let metaPayload: {
    verified: boolean;
    cached?: boolean;
    intent?: string;
    strategy?: string;
    style: string;
    dataSources: Array<{ title: string; url?: string; content?: string }>;
    toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
  } | null = null;

  await sendChatMessageStream(
    { question: '테스트 질문', history: null },
    () => undefined,
    (meta) => {
      metaPayload = meta;
    },
  );

  assert.notEqual(metaPayload, null);
  assert.equal(metaPayload?.verified, true);
  assert.equal(metaPayload?.cached, true);
  assert.equal(metaPayload?.intent, 'team_summary');
  assert.equal(metaPayload?.strategy, 'rag_v3');
  assert.equal(metaPayload?.style, 'compact');
  assert.deepEqual(metaPayload?.dataSources, [
    { title: 'KBO', url: 'https://example.com/source', content: undefined },
  ]);
  assert.deepEqual(metaPayload?.toolCalls, [
    { toolName: 'document_query', parameters: { team: 'KIA' } },
  ]);
});

test('sendChatMessageStream preserves explicit abort without mapping to stream errors', async (t) => {
  let delivered = false;

  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        const signal = init?.signal;
        signal?.addEventListener('abort', () => {
          controller.error(signal.reason ?? new DOMException('manual abort', 'AbortError'));
        }, { once: true });
      },
      pull(controller) {
        if (delivered) {
          return;
        }
        delivered = true;
        controller.enqueue(new TextEncoder().encode('event: message\ndata: {"delta":"첫"}\n\n'));
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  });

  const controller = new AbortController();
  const deltas: string[] = [];

  const streamPromise = sendChatMessageStream(
    { question: '테스트 질문', history: null },
    (delta) => {
      deltas.push(delta);
      controller.abort(new DOMException('manual abort', 'AbortError'));
    },
    undefined,
    { signal: controller.signal },
  );

  await assert.rejects(
    () => streamPromise,
    (error) => error instanceof DOMException && error.name === 'AbortError',
  );

  assert.deepEqual(deltas, ['첫']);
});

test('sendChatMessageStream forwards finish_reason and cancelled in meta', async (t) => {
  const metaPayloads: Array<{
    verified: boolean;
    cached: boolean;
    finish_reason?: string;
    cancelled?: boolean;
    error?: string;
  }> = [];

  const fetchMock = async () => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"안녕"}\n',
    '\n',
    'event: meta\n',
    'data: {"verified":true,"cached":false,"finish_reason":"cancelled","cancelled":true,"error":"temporary_generation_issue"}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]);

  t.mock.method(globalThis, 'fetch', fetchMock as never);

  await sendChatMessageStream(
    { question: '테스트 질문', history: null },
    () => undefined,
    (meta) => {
      metaPayloads.push(meta as {
        verified: boolean;
        cached: boolean;
        finish_reason?: string;
        cancelled?: boolean;
        error?: string;
      });
    },
  );

  assert.equal(metaPayloads.length, 1);
  const metaPayload = metaPayloads[0];
  assert.equal(metaPayload.finish_reason, 'cancelled');
  assert.equal(metaPayload.cancelled, true);
  assert.equal(metaPayload.error, 'temporary_generation_issue');
});
