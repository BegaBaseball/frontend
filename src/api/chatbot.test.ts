import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ChatQueueStatus,
  ChatStreamEventError,
  convertVoiceToText,
  RateLimitError,
  sendChatMessageStream,
  type ChatStreamRequest,
} from './chatbot';

process.env.VITE_AI_EVENT_VERSION = '1';

const validTypedRequest = {
  question: '질문',
  history: [{ role: 'user', content: '이전 질문' }],
} satisfies ChatStreamRequest;
const invalidTypedRequest = {
  question: '질문',
  history: [
    // @ts-expect-error Chat v2 history roles are restricted by the generated contract.
    { role: 'system', content: '금지된 역할' },
  ],
} satisfies ChatStreamRequest;
// @ts-expect-error Chat v2 requests require a question from the generated contract.
const missingQuestionRequest = { history: null } satisfies ChatStreamRequest;
void validTypedRequest;
void invalidTypedRequest;
void missingQuestionRequest;

type MetaPayload = {
  verified: boolean;
  cached?: boolean;
  intent?: string;
  strategy?: string;
  style: string;
  modelUsage?: unknown[];
  modelUsageComplete?: boolean;
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

test('sendChatMessageStream defaults to v2 and consumes negotiated chat events', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  delete process.env.VITE_AI_EVENT_VERSION;
  t.after(() => {
    if (previousVersion === undefined) {
      delete process.env.VITE_AI_EVENT_VERSION;
    } else {
      process.env.VITE_AI_EVENT_VERSION = previousVersion;
    }
  });

  let requestHeaders: Headers | null = null;
  t.mock.method(globalThis, 'fetch', async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
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

  const capturedHeaders = requestHeaders as unknown as Headers;
  assert.equal(capturedHeaders.get('X-AI-Event-Version'), '2');
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

test('sendChatMessageStream preserves canonical pre-stream version error fields', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'AI_EVENT_VERSION_UNSUPPORTED',
    message: '지원하지 않는 AI 이벤트 버전입니다.',
    detail: null,
    retryable: false,
    retry_after_seconds: null,
    supported_versions: ['1', '2'],
  }), { status: 406 }));

  await assert.rejects(
    () => sendChatMessageStream({ question: '버전', history: null }, () => undefined),
    (error) => {
      assert.ok(error instanceof ChatStreamEventError);
      assert.equal(error.eventCode, 'AI_EVENT_VERSION_UNSUPPORTED');
      assert.deepEqual(error.supportedVersions, ['1', '2']);
      assert.equal(error.retryable, false);
      assert.equal(error.upstreamMessage, '지원하지 않는 AI 이벤트 버전입니다.');
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('sendChatMessageStream sends explicit v1 header in rollback mode', async (t) => {
  let requestHeaders: Headers | null = null;
  t.mock.method(globalThis, 'fetch', async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
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

  const capturedHeaders = requestHeaders as unknown as Headers;
  assert.equal(capturedHeaders.get('X-AI-Event-Version'), '1');
});

test('sendChatMessageStream rejects the legacy DONE sentinel in v2 mode', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    if (previousVersion === undefined) {
      delete process.env.VITE_AI_EVENT_VERSION;
    } else {
      process.env.VITE_AI_EVENT_VERSION = previousVersion;
    }
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: done\n',
    'data: [DONE]\n\n',
  ], { 'X-AI-Event-Version': '2' }));

  await assert.rejects(
    () => sendChatMessageStream({ question: '버전 경계', history: null }, () => undefined),
    /AI stream|incomplete|JSON/i,
  );
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
      assert.equal(error.upstreamMessage, 'temporary_issue');
      assert.equal(error.detail, '지금은 응답 템포가 잠깐 흔들리고 있어요. 같은 질문을 다시 보내주세요.');
      return true;
    },
  );
});

test('sendChatMessageStream preserves normalized v2 stream.error details', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: stream.error\n',
    'data: {"version":2,"type":"stream.error","data":{"code":"AI_UPSTREAM_UNAVAILABLE","message":"AI 서비스가 현재 사용할 수 없습니다.","detail":"잠시 후 다시 시도해주세요.","retryable":true}}\n\n',
    'event: stream.done\n',
    'data: {"version":2,"type":"stream.done","data":{"reason":"error"}}\n\n',
  ], { 'X-AI-Event-Version': '2' }));

  await assert.rejects(
    () => sendChatMessageStream({ question: '오류', history: null }, () => undefined),
    (error) => {
      assert.ok(error instanceof ChatStreamEventError);
      assert.equal(error.eventCode, 'AI_UPSTREAM_UNAVAILABLE');
      assert.equal(error.upstreamMessage, 'AI 서비스가 현재 사용할 수 없습니다.');
      assert.equal(error.detail, '잠시 후 다시 시도해주세요.');
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterSeconds, null);
      assert.deepEqual(error.supportedVersions, []);
      return true;
    },
  );
});

test('sendChatMessageStream keeps null detail separate from the v2 upstream message', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    if (previousVersion === undefined) {
      delete process.env.VITE_AI_EVENT_VERSION;
      return;
    }
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: stream.error\n',
    'data: {"version":2,"type":"stream.error","data":{"code":"AI_UPSTREAM_UNAVAILABLE","message":"AI 서비스가 현재 사용할 수 없습니다.","detail":null,"retryable":true}}\n\n',
  ], { 'X-AI-Event-Version': '2' }));

  await assert.rejects(
    () => sendChatMessageStream({ question: '오류', history: null }, () => undefined),
    (error) => {
      assert.ok(error instanceof ChatStreamEventError);
      assert.equal(error.upstreamMessage, 'AI 서비스가 현재 사용할 수 없습니다.');
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('sendChatMessageStream normalizes meta payload into shared AI shapes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"verified":true,"cached":true,"intent":"team_summary","strategy":"rag_v3","style":"compact","model_usage":[{"role":"answer","tokens":12}],"model_usage_complete":true,"data_sources":[{"title":"KBO","url":"https://example.com/source"}],"tool_calls":[{"tool_name":"document_query","parameters":{"team":"KIA"}}]}\n',
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
  assert.deepEqual(receivedMeta.modelUsage, [{ role: 'answer', tokens: 12 }]);
  assert.equal(receivedMeta.modelUsageComplete, true);
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
    JSON.stringify({
      code: 'AI_RATE_LIMITED',
      message: '요청이 많아 잠시 후 다시 시도해주세요.',
      detail: '분당 요청 한도를 초과했습니다.',
      retryable: true,
      retry_after_seconds: 19,
      supported_versions: [],
    }),
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
      assert.equal(error.retryAfterSeconds, 19);
      assert.equal(error.code, 'AI_RATE_LIMITED');
      assert.equal(error.detail, '분당 요청 한도를 초과했습니다.');
      assert.equal(error.retryable, true);
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
