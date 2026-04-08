import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeTeam,
  CoachAnalyzeError,
  getCoachGenerationModeLabel,
  getCoachStreamReadTimeoutMs,
} from './coach';

const baseRequest = {
  home_team_id: 'HH',
  away_team_id: 'SS',
  request_mode: 'manual_detail' as const,
};

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
      assert.equal(error.statusCode, null);
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
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
    'data: {"code":"coach_data_insufficient","message":"분석에 필요한 데이터가 충분하지 않습니다."}\n',
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

test('getCoachGenerationModeLabel은 generation_mode를 사용자 문구로 변환한다', () => {
  assert.equal(getCoachGenerationModeLabel('llm_manual'), '근거 기반 상세 분석');
  assert.equal(getCoachGenerationModeLabel('evidence_fallback'), '근거 기반 보수 생성');
});

test('getCoachStreamReadTimeoutMs는 manual_detail에 더 긴 read timeout을 사용한다', () => {
  assert.equal(getCoachStreamReadTimeoutMs('auto_brief'), 30000);
  assert.equal(getCoachStreamReadTimeoutMs('manual_detail'), 90000);
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
