import assert from 'node:assert/strict';
import test from 'node:test';

import api from './axios';
import { analyzeTeam, CoachAnalyzeError } from './coach';

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
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(JSON.stringify({ detail: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as never);
  t.mock.method(api, 'post', async () => ({ status: 401 }) as never);

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
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(JSON.stringify({ detail: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as never);
  t.mock.method(api, 'post', async () => {
    throw new Error('Request failed with status code 401');
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

test('analyzeTeam은 SSE error 이벤트를 분석 실패로 승격한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildStreamResponse([
    'event: meta\n',
    'data: {"request_mode":"manual_detail"}\n',
    '\n',
    'event: error\n',
    'data: {"code":"coach_internal_error","message":"분석 중 오류가 발생했습니다."}\n',
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
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
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

  t.mock.method(globalThis, 'fetch', async (_input, init) => buildStreamResponse([
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
