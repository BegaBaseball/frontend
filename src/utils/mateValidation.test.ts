import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateMateApplyMessage,
  validateMateChatMessage,
  validateMateDescription,
} from './mateValidation';

test('mate description validation은 길이와 연락처 제한을 적용한다', () => {
  assert.equal(validateMateDescription('짧아요'), '소개글은 최소 10자 이상 입력해주세요.');
  assert.equal(
    validateMateDescription('연락은 010-1234-5678 로 주세요.'),
    '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.',
  );
  assert.equal(validateMateDescription('같이 즐겁고 안전하게 직관하실 분 찾습니다!'), '');
});

test('mate apply validation은 소개 메시지 기준을 적용한다', () => {
  assert.equal(validateMateApplyMessage('안녕'), '메시지는 최소 10자 이상 입력해주세요.');
  assert.equal(
    validateMateApplyMessage('www.example.com 에서 확인해주세요'),
    '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.',
  );
  assert.equal(validateMateApplyMessage('함께 즐겁고 안전하게 관람하고 싶어요!'), '');
});

test('mate chat validation은 금지 단어와 외부 연락처를 차단한다', () => {
  assert.equal(validateMateChatMessage('욕설 포함'), '부적절한 단어가 포함되어 있습니다.');
  assert.equal(
    validateMateChatMessage('제 메일은 test@example.com 입니다'),
    '개인정보 보호를 위해 연락처 정보나 외부 링크는 공유할 수 없습니다.',
  );
  assert.equal(validateMateChatMessage('현장에서 뵙고 이야기 나눠요!'), '');
});
