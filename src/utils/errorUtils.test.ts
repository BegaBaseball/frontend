import test from 'node:test';
import assert from 'node:assert/strict';

import { getApiErrorMessage, getDuplicateCommentErrorMessage, parseError } from './errorUtils';

test('parseError는 raw 500 기술 문구를 사용자 친화형 메시지로 바꾼다', () => {
  const parsed = parseError({
    status: 500,
    data: null,
    message: 'Request failed with status code 500',
  });

  assert.equal(parsed.type, 'SERVER');
  assert.equal(parsed.message, '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
  assert.equal(parsed.rawMessage, 'Request failed with status code 500');
});

test('parseError는 사용자 친화적인 서버 메시지는 그대로 유지한다', () => {
  const parsed = parseError({
    status: 400,
    data: { message: '이미 사용 중인 이메일입니다.' },
    message: 'Bad Request',
  });

  assert.equal(parsed.type, 'UNKNOWN');
  assert.equal(parsed.message, '이미 사용 중인 이메일입니다.');
});

test('getApiErrorMessage는 429 기본 문구를 반환한다', () => {
  const message = getApiErrorMessage({
    status: 429,
    data: null,
    message: 'Too Many Requests',
  }, 'fallback');

  assert.equal(message, '요청이 많습니다. 잠시 후 다시 시도해주세요.');
});

test('getApiErrorMessage는 일반 Error의 기술 문구에서 호출부 fallback을 우선한다', () => {
  const message = getApiErrorMessage(new Error('Request failed with status code 500'), '로그인에 실패했습니다.');
  assert.equal(message, '로그인에 실패했습니다.');
});

test('getApiErrorMessage는 일반 Error의 사용자 메시지를 유지한다', () => {
  const message = getApiErrorMessage(new Error('이메일 또는 비밀번호가 일치하지 않습니다.'), 'fallback');
  assert.equal(message, '이메일 또는 비밀번호가 일치하지 않습니다.');
});

test('getDuplicateCommentErrorMessage는 DUPLICATE_COMMENT를 전용 문구로 바꾼다', () => {
  const message = getDuplicateCommentErrorMessage({
    status: 409,
    data: { code: 'DUPLICATE_COMMENT', message: '중복된 댓글입니다.' },
    message: 'Conflict',
  }, 'fallback');

  assert.equal(message, '이미 같은 댓글이 등록되었습니다. 잠시 후 다시 시도해주세요.');
});
