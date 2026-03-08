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
