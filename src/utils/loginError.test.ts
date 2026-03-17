import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginQueryErrorMessage } from './loginError';

test('manual_link_required를 사용자 안내 문구로 매핑한다', () => {
  assert.equal(
    getLoginQueryErrorMessage('?error=manual_link_required'),
    '기존 계정으로 로그인 후 마이페이지에서 소셜 계정을 연동해주세요.',
  );
});

test('provider 세부 오류 메시지를 그대로 노출한다', () => {
  assert.equal(
    getLoginQueryErrorMessage('?error=KAKAO_EMAIL_UNVERIFIED%3A카카오%20계정의%20이메일이%20인증되지%20않았습니다.'),
    '카카오 계정의 이메일이 인증되지 않았습니다.',
  );
});

test('oauth2_link_requires_unlink를 사용자 안내 문구로 매핑한다', () => {
  assert.equal(
    getLoginQueryErrorMessage('?error=oauth2_link_requires_unlink'),
    '같은 소셜 제공자는 먼저 기존 연동을 해제한 뒤 다시 연결해주세요.',
  );
});

test('oauth2_link_conflict를 사용자 안내 문구로 매핑한다', () => {
  assert.equal(
    getLoginQueryErrorMessage('?error=oauth2_link_conflict'),
    '이미 다른 계정에 연결된 소셜 계정입니다. 다른 계정으로는 연동할 수 없습니다.',
  );
});

test('oauth2_state_store_unavailable를 사용자 안내 문구로 매핑한다', () => {
  assert.equal(
    getLoginQueryErrorMessage('?error=oauth2_state_store_unavailable'),
    '로그인 상태를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
  );
});
