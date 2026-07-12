import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AiStreamContractError,
  decodeAiStreamV2Event,
  isTypedDone,
  resolveAiEventVersion,
} from './aiStreamContract';

const examples = {
  'chat.status': { message: '준비 중' },
  'chat.queue': {
    state: 'queued',
    queue_position: 1,
    estimated_wait_time: 2,
    rpm_limit: 60,
  },
  'chat.message.delta': { delta: '안녕' },
  'chat.meta': { verified: true, style: 'markdown' },
  'coach.status': { status: '분석 중' },
  'coach.preview.chunk': { text: '미리보기', attempt: 1 },
  'coach.preview.reset': { attempt: 2 },
  'coach.message.delta': { delta: '분석' },
  'coach.meta': {
    request_mode: 'manual_detail',
    analysis_type: 'game_review',
    manual_data_request: {
      scope: 'coach_analysis',
      missing_items: [{
        key: 'record',
        label: '경기 기록',
        reason: '내부 데이터 누락',
        expected_format: 'internal record',
      }],
      operator_message: '운영자 입력 필요',
      blocking: true,
      code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
  },
  'stream.error': {
    code: 'AI_STREAM_ERROR',
    message: '처리 중 오류가 발생했습니다.',
    detail: null,
    retryable: true,
  },
  'stream.done': { reason: 'completed' },
} as const;

test('decodeAiStreamV2Event parses every approved discriminator', () => {
  for (const [type, data] of Object.entries(examples)) {
    const decoded = decodeAiStreamV2Event({
      event: type,
      data: JSON.stringify({ version: 2, type, data }),
    });

    assert.equal(decoded.version, 2);
    assert.equal(decoded.type, type);
  }
});

test('decodeAiStreamV2Event rejects malformed JSON', () => {
  assert.throws(
    () => decodeAiStreamV2Event({ event: 'stream.done', data: '{' }),
    AiStreamContractError,
  );
});

test('decodeAiStreamV2Event rejects unknown version and type', () => {
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'stream.done',
      data: JSON.stringify({ version: 1, type: 'stream.done', data: { reason: 'completed' } }),
    }),
    /version/,
  );
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'unknown',
      data: JSON.stringify({ version: 2, type: 'unknown', data: {} }),
    }),
    /type/,
  );
});

test('decodeAiStreamV2Event rejects event/type mismatch and extra envelope keys', () => {
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'chat.status',
      data: JSON.stringify({ version: 2, type: 'stream.done', data: { reason: 'completed' } }),
    }),
    /does not match/,
  );
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'stream.done',
      data: JSON.stringify({
        version: 2,
        type: 'stream.done',
        data: { reason: 'completed' },
        legacy: true,
      }),
    }),
    /top-level/,
  );
});

test('decodeAiStreamV2Event rejects missing or invalid required data', () => {
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'chat.message.delta',
      data: JSON.stringify({ version: 2, type: 'chat.message.delta', data: { delta: '' } }),
    }),
    /delta/,
  );
  assert.throws(
    () => decodeAiStreamV2Event({
      event: 'chat.queue',
      data: JSON.stringify({ version: 2, type: 'chat.queue', data: { state: 'queued' } }),
    }),
    /queue_position/,
  );
});

test('resolveAiEventVersion defaults to v2 and rejects unsupported config', () => {
  assert.equal(resolveAiEventVersion(undefined), '2');
  assert.equal(resolveAiEventVersion('1'), '1');
  assert.equal(resolveAiEventVersion('2'), '2');
  assert.throws(() => resolveAiEventVersion('3'), /VITE_AI_EVENT_VERSION/);
});

test('isTypedDone recognizes only decoded stream.done events', () => {
  const done = decodeAiStreamV2Event({
    event: 'stream.done',
    data: JSON.stringify({ version: 2, type: 'stream.done', data: { reason: 'completed' } }),
  });
  const delta = decodeAiStreamV2Event({
    event: 'chat.message.delta',
    data: JSON.stringify({ version: 2, type: 'chat.message.delta', data: { delta: '안녕' } }),
  });

  assert.equal(isTypedDone(done), true);
  assert.equal(isTypedDone(delta), false);
});
