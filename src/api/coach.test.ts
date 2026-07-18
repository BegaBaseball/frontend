import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeTeam,
  CoachAnalyzeError,
  COACH_PAYLOAD_TOO_LARGE_MESSAGE,
  getCoachGenerationModeLabel,
  getCoachStreamRequestTimeoutMs,
  getCoachStreamReadTimeoutMs,
} from './coach';
import { RateLimitError } from './aiStreamError';
import { baseRequest, buildStreamResponse } from './coachTestSupport';

process.env.VITE_AI_EVENT_VERSION = '1';

test('analyzeTeam은 기본 v2 협상 coach 이벤트를 타입으로 소비한다', async (t) => {
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
  let requestBody: Record<string, unknown> | null = null;
  t.mock.method(globalThis, 'fetch', async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestHeaders = new Headers(init?.headers);
    requestBody = JSON.parse(String(init?.body));
    return buildStreamResponse([
      'event: coach.status\n',
      'data: {"version":2,"type":"coach.status","data":{"status":"분석 중"}}\n\n',
      'event: coach.preview.chunk\n',
      'data: {"version":2,"type":"coach.preview.chunk","data":{"text":"미리보기","attempt":1}}\n\n',
      'event: coach.message.delta\n',
      'data: {"version":2,"type":"coach.message.delta","data":{"delta":"상세 분석"}}\n\n',
      'event: coach.meta\n',
      'data: {"version":2,"type":"coach.meta","data":{"request_mode":"manual_detail","analysis_type":"game_review","generation_mode":"evidence_fallback","data_quality":"insufficient","llm_skip_reason":"manual_data_required","manual_data_request":{"scope":"coach_analysis","missing_items":[{"key":"record","label":"경기 기록","reason":"내부 데이터 누락","expected_format":"internal record"}],"operator_message":"운영자 입력 필요","blocking":true,"code":"MANUAL_BASEBALL_DATA_REQUIRED"},"structured_response":{"headline":"분석","sentiment":"neutral","analysis_type":"game_review","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"상세 분석","coach_note":"확인 필요"}}}\n\n',
      'event: stream.done\n',
      'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
    ], { 'X-AI-Event-Version': '2' });
  });

  const previews: Array<{ text: string; attempt: number }> = [];
  const statuses: string[] = [];
  const response = await analyzeTeam(
    { ...baseRequest, analysisType: 'game_review' },
    undefined,
    {
      onPreviewChunk: (text, attempt) => previews.push({ text, attempt }),
      onStatus: (status) => statuses.push(status),
    },
  );

  const capturedHeaders = requestHeaders as unknown as Headers;
  const capturedBody = requestBody as unknown as Record<string, unknown>;
  assert.equal(capturedHeaders.get('X-AI-Event-Version'), '2');
  assert.equal(capturedBody.analysis_type, 'game_review');
  assert.equal(capturedBody.analysisType, undefined);
  assert.deepEqual(statuses, ['분석 중']);
  assert.deepEqual(previews, [{ text: '미리보기', attempt: 1 }]);
  assert.equal(response.answer, '상세 분석');
  assert.equal(response.analysis_type, 'game_review');
  assert.equal(response.llm_skip_reason, 'manual_data_required');
  assert.equal(response.manual_data_request?.code, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.equal(response.manual_data_request?.missingItems[0].key, 'record');
  assert.equal(response.manual_data_request?.operatorMessage, '운영자 입력 필요');
});

test('analyzeTeam은 v2 payload-limit stream.error를 전용 오류로 승격한다', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: stream.error\n',
    'data: {"version":2,"type":"stream.error","data":{"code":"AI_PROXY_PAYLOAD_TOO_LARGE","message":"요청 본문이 큽니다.","detail":null,"retryable":false}}\n\n',
    'event: stream.done\n',
    'data: {"version":2,"type":"stream.done","data":{"reason":"error"}}\n\n',
  ], { 'X-AI-Event-Version': '2' }));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
      assert.equal(error.upstreamCode, 'AI_PROXY_PAYLOAD_TOO_LARGE');
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test('analyzeTeam은 v2 응답 협상 헤더 누락을 계약 오류로 처리한다', async (t) => {
  const previousVersion = process.env.VITE_AI_EVENT_VERSION;
  process.env.VITE_AI_EVENT_VERSION = '2';
  t.after(() => {
    process.env.VITE_AI_EVENT_VERSION = previousVersion;
  });
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: stream.done\n',
    'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
  ]));

  await assert.rejects(() => analyzeTeam(baseRequest), /negotiated version/);
});

test('analyzeTeam은 rollback 모드에서 v1 헤더를 명시한다', async (t) => {
  let requestHeaders: Headers | null = null;
  t.mock.method(globalThis, 'fetch', async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestHeaders = new Headers(init?.headers);
    return buildStreamResponse(['event: done\ndata: [DONE]\n\n']);
  });

  await analyzeTeam(baseRequest);

  const capturedHeaders = requestHeaders as unknown as Headers;
  assert.equal(capturedHeaders.get('X-AI-Event-Version'), '1');
});

test('analyzeTeam rejects the legacy DONE sentinel in v2 mode', async (t) => {
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
    'event: done\ndata: [DONE]\n\n',
  ], { 'X-AI-Event-Version': '2' }));

  await assert.rejects(() => analyzeTeam(baseRequest));
});

test('analyzeTeam preserves canonical 504 stream error details', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'AI_UPSTREAM_TIMEOUT',
    message: 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
    detail: null,
    retryable: true,
    retry_after_seconds: null,
    supported_versions: [],
  }), { status: 504 }));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'STREAM_TIMEOUT');
      assert.equal(error.statusCode, 504);
      assert.equal(error.upstreamCode, 'AI_UPSTREAM_TIMEOUT');
      assert.equal(error.upstreamMessage, 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      assert.equal(error.retryable, true);
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('analyzeTeam preserves canonical 406 supported versions', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'AI_EVENT_VERSION_UNSUPPORTED',
    message: '지원하지 않는 AI 이벤트 버전입니다.',
    detail: null,
    retryable: false,
    retry_after_seconds: null,
    supported_versions: ['1', '2'],
  }), { status: 406 }));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.deepEqual(error.supportedVersions, ['1', '2']);
      assert.equal(error.upstreamCode, 'AI_EVENT_VERSION_UNSUPPORTED');
      assert.equal(error.upstreamMessage, '지원하지 않는 AI 이벤트 버전입니다.');
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('analyzeTeam maps canonical 429 to the shared RateLimitError', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'AI_RATE_LIMITED',
    message: '요청이 많아 잠시 후 다시 시도해주세요.',
    detail: '분당 요청 한도를 초과했습니다.',
    retryable: true,
    retry_after_seconds: 11,
    supported_versions: [],
  }), {
    status: 429,
    headers: { 'Retry-After': '31' },
  }));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.code, 'AI_RATE_LIMITED');
      assert.equal(error.retryAfterSeconds, 11);
      assert.equal(error.detail, '분당 요청 한도를 초과했습니다.');
      return true;
    },
  );
});

test('analyzeTeam은 401에서 auth 전용 에러를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      detail: 'Unauthorized',
      message: url.endsWith('/auth/reissue') ? 'reissue failed' : 'Unauthorized',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'AUTH_EXPIRED');
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.');
      return true;
    },
  );
});

test('analyzeTeam은 reissue 요청이 401로 실패해도 auth 전용 에러를 던진다', async (t) => {
  let requestCount = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;

    return new Response(JSON.stringify({ detail: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'AUTH_EXPIRED');
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.');
      return true;
    },
  );

  assert.equal(requestCount, 2);
});

test('analyzeTeam은 AI upstream 401을 auth 만료로 오인하지 않는다', async (t) => {
  let requestCount = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;

    return new Response(JSON.stringify({
      code: 'AI_UPSTREAM_UNAUTHORIZED',
      message: 'AI 서비스 인증에 실패했습니다.',
      detail: null,
      retryable: false,
      retry_after_seconds: null,
      supported_versions: [],
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
      assert.equal(error.upstreamMessage, 'AI 서비스 인증에 실패했습니다.');
      assert.equal(error.detail, null);
      return true;
    },
  );

  assert.equal(requestCount, 1);
});

test('analyzeTeam은 5xx에서 generic 분석 실패 에러를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response('server exploded', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  ) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.statusCode, 500);
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
      return true;
    },
  );
});

test('analyzeTeam은 5xx JSON 에러 응답 메시지를 사용자 메시지로 노출한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(
      JSON.stringify({
        success: false,
        code: 'AI_UPSTREAM_UNAVAILABLE',
        message: 'AI 서비스가 현재 사용할 수 없습니다.',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as never
  ));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.statusCode, 502);
      assert.equal(error.message, 'AI 서비스가 현재 사용할 수 없습니다.');
      return true;
    },
  );
});

test('analyzeTeam은 504 timeout 응답을 stream timeout 전용 메시지로 매핑한다', async (t) => {
  let requestCount = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;

    return new Response(
      JSON.stringify({
        success: false,
        code: 'AI_UPSTREAM_TIMEOUT',
      }),
      {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'STREAM_TIMEOUT');
      assert.equal(error.statusCode, 504);
      assert.equal(error.message, 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      return true;
    },
  );

  assert.equal(requestCount, 2);
});

test('analyzeTeam은 AI proxy payload limit 413을 전용 에러로 매핑한다', async (t) => {
  let requestCount = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;

    return new Response(
      JSON.stringify({
        success: false,
        code: 'AI_PROXY_PAYLOAD_TOO_LARGE',
        message: 'AI 요청 본문이 너무 큽니다.',
        data: { maxBytes: 65536 },
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
      assert.equal(error.statusCode, 413);
      assert.equal(error.message, COACH_PAYLOAD_TOO_LARGE_MESSAGE);
      return true;
    },
  );

  assert.equal(requestCount, 1);
});

test('analyzeTeam은 non-JSON 413도 payload limit 전용 에러로 매핑한다', async (t) => {
  let requestCount = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;

    return new Response('request entity too large', {
      status: 413,
      headers: { 'Content-Type': 'text/plain' },
    });
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
      assert.equal(error.statusCode, 413);
      assert.equal(error.message, COACH_PAYLOAD_TOO_LARGE_MESSAGE);
      return true;
    },
  );

  assert.equal(requestCount, 1);
});

test('analyzeTeam은 AI proxy payload code를 5xx 메시지 노출보다 우선한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(
      JSON.stringify({
        success: false,
        code: 'AI_PROXY_PAYLOAD_TOO_LARGE',
        message: 'AI 요청 본문이 너무 큽니다.',
        data: { maxBytes: 65536 },
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    ) as never
  ));

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
      assert.equal(error.statusCode, 502);
      assert.equal(error.message, COACH_PAYLOAD_TOO_LARGE_MESSAGE);
      assert.notEqual(error.message, 'AI 요청 본문이 너무 큽니다.');
      return true;
    },
  );
});

test('analyzeTeam은 SSE 이벤트 경계 뒤에는 event 타입을 message로 되돌린다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"resolved_focus":["recent_form"]}\n',
    '\n',
    'data: {"delta":"경계 이후 메시지"}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.answer, '경계 이후 메시지');
  assert.deepEqual(response.resolved_focus, ['recent_form']);
});

test('analyzeTeam은 SSE keepalive comment를 무시하고 완료한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    ': ping\n',
    '\n',
    'event: message\n',
    'data: {"delta":"응답"}\n',
    '\n',
    ': ping\n',
    '\n',
    'event: meta\n',
    'data: {"request_mode":"manual_detail"}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.answer, '응답');
});

test('analyzeTeam은 SSE error 이벤트를 분석 실패로 승격한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"manual_detail"}\n',
    '\n',
    'event: error\n',
    'data: {"code":"coach_data_insufficient","message":"분석에 필요한 데이터가 충분하지 않습니다.","detail":"확인 가능한 내부 기록이 부족합니다."}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.message, '분석에 필요한 데이터가 충분하지 않습니다.');
      assert.equal(error.upstreamMessage, '분석에 필요한 데이터가 충분하지 않습니다.');
      assert.equal(error.detail, '확인 가능한 내부 기록이 부족합니다.');
      return true;
    },
  );
});

test('analyzeTeam은 SSE payload limit error 이벤트를 전용 에러로 승격한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: error\n',
    'data: {"code":"AI_PROXY_PAYLOAD_TOO_LARGE","message":"AI 요청 본문이 너무 큽니다.","data":{"maxBytes":65536}}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
      assert.equal(error.statusCode, null);
      assert.equal(error.message, COACH_PAYLOAD_TOO_LARGE_MESSAGE);
      assert.equal(error.upstreamMessage, 'AI 요청 본문이 너무 큽니다.');
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('analyzeTeam은 trailing newline 없는 마지막 done 이벤트도 파싱한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"첫 문장"}\n',
    '\n',
    'event: meta\n',
    'data: {"structured_response":{"headline":"메타 헤드라인","sentiment":"positive","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"상세 리포트","coach_note":"코치 노트"},"game_status_bucket":"COMPLETED","grounding_warnings":["근거 주의"],"resolved_focus":["recent_form"]}\n',
    '\n',
    'event: done\n',
    'data: [DONE]',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.answer, '첫 문장');
  assert.equal(response.structuredData?.headline, '메타 헤드라인');
  assert.equal(response.structuredData?.coach_note, '코치 노트');
  assert.equal(response.game_status_bucket, 'COMPLETED');
  assert.deepEqual(response.grounding_warnings, ['근거 주의']);
  assert.deepEqual(response.resolved_focus, ['recent_form']);
});

test('analyzeTeam은 generation_mode를 파싱해 manual 상세 분석 여부를 유지한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"manual_detail","generation_mode":"llm_manual","structured_response":{"headline":"메타 헤드라인","sentiment":"positive","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"상세 리포트","coach_note":"코치 노트"}}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.generation_mode, 'llm_manual');
});

test('analyzeTeam은 llm_skip_reason 메타를 보존한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"auto_brief","analysis_type":"game_preview","generation_mode":"evidence_fallback","cache_state":"PENDING_WAIT","in_progress":true,"llm_skip_reason":"pending_wait","structured_response":{"headline":"브리핑 준비 중","sentiment":"neutral","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"브리핑 생성 중","coach_note":"잠시 후 다시 확인해주세요."}}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam({
    ...baseRequest,
    request_mode: 'auto_brief',
    analysis_type: 'game_preview',
  });

  assert.equal(response.llm_skip_reason, 'pending_wait');
  assert.equal(response.llmSkipReason, 'pending_wait');
});

test('analyzeTeam은 analysisType을 analysis_type payload로 정규화하고 SSE meta를 보존한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;

    assert.equal(body.analysis_type, 'game_preview');
    assert.equal(body.analysisType, undefined);

    return buildStreamResponse([
      'event: meta\n',
      'data: {"request_mode":"manual_detail","analysis_type":"game_preview","generation_mode":"deterministic_preview","structured_response":{"headline":"프리뷰 헤드라인","sentiment":"neutral","analysisType":"game_preview","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"프리뷰 리포트","coach_note":"프리뷰 노트"}}\n',
      '\n',
      'event: done\n',
      'data: [DONE]\n',
      '\n',
    ]) as never;
  });

  const response = await analyzeTeam({
    ...baseRequest,
    analysisType: 'game_preview',
  });

  assert.equal(response.analysis_type, 'game_preview');
  assert.equal(response.analysisType, 'game_preview');
  assert.equal(response.generation_mode, 'deterministic_preview');
  assert.equal(response.structuredData?.analysisType, 'game_preview');
});

test('analyzeTeam은 win_probability_home 메타를 보존한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"manual_detail","win_probability_home":0.62,"structured_response":{"headline":"메타 헤드라인","sentiment":"positive","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"상세 리포트","coach_note":"코치 노트"}}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.win_probability_home, 0.62);
});

test('analyzeTeam은 evidence_fallback meta를 성공 응답으로 유지하고 누락 focus 메타를 파싱한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"manual_detail","generation_mode":"evidence_fallback","data_quality":"partial","focus_section_missing":true,"missing_focus_sections":["bullpen"],"structured_response":{"headline":"제한 근거 헤드라인","sentiment":"neutral","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"축약 리포트","coach_note":"축약 노트"}}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.generation_mode, 'evidence_fallback');
  assert.equal(response.data_quality, 'partial');
  assert.equal(response.focus_section_missing, true);
  assert.deepEqual(response.missing_focus_sections, ['bullpen']);
  assert.equal(response.structuredData?.headline, '제한 근거 헤드라인');
});

test('getCoachGenerationModeLabel은 generation_mode를 사용자 문구로 변환한다', () => {
  assert.equal(getCoachGenerationModeLabel('deterministic_review'), '규칙 기반 경기 리뷰');
  assert.equal(getCoachGenerationModeLabel('deterministic_preview'), '규칙 기반 경기 프리뷰');
  assert.equal(getCoachGenerationModeLabel('llm_manual'), '근거 기반 상세 분석');
  assert.equal(getCoachGenerationModeLabel('evidence_fallback'), '확인 근거 기반');
});

test('getCoachStreamReadTimeoutMs는 manual_detail에 더 긴 read timeout을 사용한다', () => {
  assert.equal(getCoachStreamReadTimeoutMs('auto_brief'), 30000);
  assert.equal(getCoachStreamReadTimeoutMs('manual_detail'), 90000);
});

test('getCoachStreamRequestTimeoutMs는 manual_detail 연결 대기에도 긴 timeout을 사용한다', () => {
  assert.equal(getCoachStreamRequestTimeoutMs('auto_brief'), 30000);
  assert.equal(getCoachStreamRequestTimeoutMs('manual_detail'), 90000);
});

test('analyzeTeam은 AI 메타의 tool_calls와 data_sources를 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"tool_calls":[{"tool_name":"database_query","parameters":{"team":"LG"}}],"data_sources":[{"title":"KBO 기록실","url":"https://example.com/kbo"}]}\n',
    '\n',
    'event: done\n',
    'data: [DONE]\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.deepEqual(response.tool_calls, [
    { toolName: 'database_query', parameters: { team: 'LG' } },
  ]);
  assert.deepEqual(response.data_sources, [
    { title: 'KBO 기록실', url: 'https://example.com/kbo', content: undefined },
  ]);
});

test('analyzeTeam은 DONE 없이 종료된 스트림을 분석 실패로 처리한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"중간 응답"}\n',
    '\n',
  ]) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
      return true;
    },
  );
});

test('analyzeTeam은 terminal meta 이후 done 이벤트가 유실돼도 성공으로 복구한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"부분 응답"}\n',
    '\n',
    'event: meta\n',
    'data: {"request_mode":"manual_detail","cache_state":"HIT","in_progress":false,"structured_response":{"headline":"복구 헤드라인","sentiment":"neutral","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"복구 리포트","coach_note":"복구 노트"}}\n',
    '\n',
  ]) as never);

  const response = await analyzeTeam(baseRequest);

  assert.equal(response.answer, '부분 응답');
  assert.equal(response.structuredData?.headline, '복구 헤드라인');
  assert.equal(response.cache_state, 'HIT');
});

test('analyzeTeam은 message delta를 누적하고 done으로 종료한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"첫"}\n',
    '\n',
    'event: message\n',
    'data: {"delta":" 문장"}\n',
    '\n',
    'event: done\n',
    'data: [DONE]',
  ]) as never);

  const streamed: string[] = [];
  const response = await analyzeTeam(baseRequest, (chunk) => {
    streamed.push(chunk);
  });

  assert.equal(response.answer, '첫 문장');
  assert.deepEqual(streamed, ['첫', '첫 문장']);
});

test('analyzeTeam은 explicit abort를 timeout이나 generic failure로 바꾸지 않는다', async (t) => {
  let delivered = false;

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, _init?: RequestInit) => buildStreamResponse([
    'event: message\n',
    'data: {"delta":"첫 문장"}\n',
    '\n',
  ]) as never);

  const controller = new AbortController();
  const streamPromise = analyzeTeam(
    baseRequest,
    () => {
      if (!delivered) {
        delivered = true;
        controller.abort(new DOMException('manual abort', 'AbortError'));
      }
    },
    { signal: controller.signal },
  );

  await assert.rejects(
    () => streamPromise,
    (error) => error instanceof DOMException && error.name === 'AbortError',
  );
});
