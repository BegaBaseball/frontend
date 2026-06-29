import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateField,
  validatePasswordResetField,
} from './validation';

test('signup password validation matches the backend 12 character minimum', () => {
  assert.equal(validateField('password', 'Test1234!Ab'), '비밀번호는 12자 이상이어야 합니다');
  assert.equal(validateField('password', 'Test1234!Abc'), '');
});

test('password reset validation matches the backend 12 character minimum', () => {
  assert.equal(validatePasswordResetField('newPassword', 'Test1234!Ab'), '비밀번호는 12자 이상이어야 합니다');
  assert.equal(validatePasswordResetField('newPassword', 'Test1234!Abc'), '');
});
