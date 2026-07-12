import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ChatQueueStatus,
  ChatStreamEventError,
  convertVoiceToText,
  RateLimitError,
  sendChatMessageStream,
} from './chatbot';

process.env.VITE_AI_EVENT_VERSION = '1';

type MetaPayload = {
  verified: boolean;
  cached?: boolean;
  intent?: string;
  strategy?: string;
  style: string;
  dataSources: Array<{ title: string; url?: string; content?: string }>;
  toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
};

const buildStreamResponse = (
  chunks: string[],
  headers: Record<string, string> = {},
) => {
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
    headers: { 'Content-Type': 'text/event-stream', ...headers },
  });
};

test('sendChatMessageStream consumes negotiated v2 chat events', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });

  let requestHeaders: Headers | null = null;
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    requestHeaders = new Headers(init?.headers);
    return buildStreamResponse([
      'event: chat.queue\n',
      'data: {"version":2,"type":"chat.queue","data":{"state":"queued","queue_position":2,"estimated_wait_time":4,"rpm_limit":60}}\n\n',
      'event: chat.message.delta\n',
      'data: {"version":2,"type":"chat.message.delta","data":{"delta":"안녕"}}\n\n',
      'event: chat.meta\n',
      'data: {"version":2,"type":"chat.meta","data":{"verified":true,"style":"markdown","tool_calls":[],"data_sources":[]}}\n\n',
      'event: stream.done\n',
      'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
    ], { 'X-AI-Event-Version': '2' });
  });

  const deltas: string[] = [];
  const queues: ChatQueueStatus[] = [];
  let verified = false;
  await sendChatMessageStream(
    { question: '테스트 질문', history: null },
    (delta) => deltas.push(delta),
    (meta) => {
      verified = meta.verified;
    },
    { onQueueStatus: (status) => queues.push(status) },
  );

  assert.equal(requestHeaders?.get('X-AI-Event-Version'), '2');
  assert.deepEqual(deltas, ['안녕']);
  assert.deepEqual(queues, [{
    state: 'queued',
    queuePosition: 2,
    estimatedWaitTime: 4,
    rpmLimit: 60,
  }]);
  assert.equal(verified, true);
});

test('sendChatMessageStream rejects v2 when response negotiation header is missing', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: stream.done\n',
    'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
  ]));

  await assert.rejects(
    () => sendChatMessageStream(
      { question: '테스트 질문', history: null },
      () => undefined,
    ),
    /negotiated version/,
  );
});

test('sendChatMessageStream sends explicit v1 header in rollback mode', async (t) => {
  let requestHeaders: Headers | null = null;
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    requestHeaders = new Headers(init?.headers);
    return buildStreamResponse([
      'event: done\n',
      'data: [DONE]\n\n',
    ]);
  });

  await sendChatMessageStream(
    { question: '테스트 질문', history: null },
    () => undefined,
  );

  assert.equal(requestHeaders?.get('X-AI-Event-Version'), '1');
});

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

  let metaPayload: MetaPayload | null = null;

  await sendChatMessageStream(
    { question: '테스트 질문', history: null },
    () => undefined,
    (meta) => {
      metaPayload = meta;
    },
  );

  const receivedMeta = metaPayload as unknown as MetaPayload;
  if (!receivedMeta) {
    throw new Error('Expected meta payload');
  }
  assert.equal(receivedMeta.verified, true);
  assert.equal(receivedMeta.cached, true);
  assert.equal(receivedMeta.intent, 'team_summary');
  assert.equal(receivedMeta.strategy, 'rag_v3');
  assert.equal(receivedMeta.style, 'compact');
  assert.deepEqual(receivedMeta.dataSources, [
    { title: 'KBO', url: 'https://example.com/source', content: undefined },
  ]);
  assert.deepEqual(receivedMeta.toolCalls, [
    { toolName: 'document_query', parameters: { team: 'KIA' } },
  ]);
});

test('sendChatMessageStream preserves explicit abort without mapping to stream errors', async (t) => {
  let delivered = false;

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
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

test('sendChatMessageStream forwards queue status events', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: queue\n',
    'data: {"state":"queued","queuePosition":2,"estimatedWaitTime":7,"rpmLimit":18}\n',
    '\n',
    'event: queue\n',
    'data: {"state":"processing","queuePosition":0,"estimatedWaitTime":0,"rpmLimit":18}\n',
    '\n',
    'event: message\n',
    'data: {"delta":"대기 후 응답"}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const queueStatuses: ChatQueueStatus[] = [];
  const deltas: string[] = [];

  await sendChatMessageStream(
    { question: '대기열 테스트', history: null },
    (delta) => {
      deltas.push(delta);
    },
    undefined,
    {
      onQueueStatus: (status) => {
        queueStatuses.push(status);
      },
    },
  );

  assert.deepEqual(queueStatuses, [
    {
      state: 'queued',
      queuePosition: 2,
      estimatedWaitTime: 7,
      rpmLimit: 18,
    },
    {
      state: 'processing',
      queuePosition: 0,
      estimatedWaitTime: 0,
      rpmLimit: 18,
    },
  ]);
  assert.deepEqual(deltas, ['대기 후 응답']);
});

test('sendChatMessageStream maps 429 Retry-After to RateLimitError', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify({ detail: '요청이 많아 잠시 후 다시 시도해주세요.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '37',
      },
    },
  ) as never);

  await assert.rejects(
    () => sendChatMessageStream(
      { question: '대기열 overflow 테스트', history: null },
      () => undefined,
    ),
    (error) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.retryAfterSeconds, 37);
      return true;
    },
  );
});

test('convertVoiceToText는 private voice endpoint 응답의 text를 반환한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      text: '변환된 텍스트',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const audioBlob = new Blob(['voice'], { type: 'audio/webm' });
  const text = await convertVoiceToText(audioBlob);

  assert.match(requestUrl, /\/api\/ai\/chat\/voice$/);
  assert.equal(requestInit?.method, 'POST');
  assert.ok(requestInit?.body instanceof FormData);
  assert.equal(text, '변환된 텍스트');
});

test('convertVoiceToText는 timeout을 사용자 메시지로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Request timed out after 10000ms');
  });

  const audioBlob = new Blob(['voice'], { type: 'audio/webm' });

  await assert.rejects(
    () => convertVoiceToText(audioBlob),
    {
      message: '변환 시간이 초과되었습니다.',
    },
  );
});
