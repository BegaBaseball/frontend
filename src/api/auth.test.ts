import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import { requestPasswordReset } from './auth';

test('requestPasswordReset은 서버의 generic 성공 메시지를 그대로 반환한다', async (t) => {
  t.mock.method(api, 'post', async () => ({
    data: {
      success: true,
      message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
    },
  }) as never);

  const response = await requestPasswordReset('user@example.com');

  assert.deepEqual(response, {
    success: true,
    message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
  });
});
