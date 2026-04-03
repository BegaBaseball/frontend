import assert from 'node:assert/strict';
import test from 'node:test';

import { Message } from '../types/chatbot';
import { appendTextToBotMessage, buildHistoryPayload } from './chatbot';

const buildMessage = (overrides: Partial<Message>): Message => ({
  text: '기본 메시지',
  sender: 'user',
  timestamp: new Date('2026-03-23T09:00:00.000Z'),
  status: 'COMPLETED',
  ...overrides,
});

test('buildHistoryPayload는 시스템/미완료/빈 메시지를 제외하고 없으면 null을 반환한다', () => {
  const history = buildHistoryPayload([
    buildMessage({ isSystem: true, text: '안녕하세요' }),
    buildMessage({ status: 'ERROR', text: '오류 응답' }),
    buildMessage({ status: 'CANCELLED', text: '취소된 응답' }),
    buildMessage({ text: '   ' }),
  ]);

  assert.equal(history, null);
});

test('buildHistoryPayload는 완료된 user/bot 메시지를 API role 형식으로 변환한다', () => {
  const history = buildHistoryPayload([
    buildMessage({ sender: 'user', text: '한화 최근 경기 알려줘' }),
    buildMessage({ sender: 'bot', text: '최근 5경기 기준으로 정리하면...' }),
  ]);

  assert.deepEqual(history, [
    { role: 'user', content: '한화 최근 경기 알려줘' },
    { role: 'assistant', content: '최근 5경기 기준으로 정리하면...' },
  ]);
});

test('buildHistoryPayload는 최근 완료 메시지 8개까지만 유지한다', () => {
  const conversation = Array.from({ length: 10 }, (_, index) => buildMessage({
    sender: index % 2 === 0 ? 'user' : 'bot',
    text: `메시지-${index + 1}`,
    timestamp: new Date(`2026-03-23T09:${String(index).padStart(2, '0')}:00.000Z`),
  }));

  const history = buildHistoryPayload(conversation);

  assert.deepEqual(history, [
    { role: 'user', content: '메시지-3' },
    { role: 'assistant', content: '메시지-4' },
    { role: 'user', content: '메시지-5' },
    { role: 'assistant', content: '메시지-6' },
    { role: 'user', content: '메시지-7' },
    { role: 'assistant', content: '메시지-8' },
    { role: 'user', content: '메시지-9' },
    { role: 'assistant', content: '메시지-10' },
  ]);
});

test('appendTextToBotMessage는 기존 bot 메시지 뒤에 배치 텍스트를 붙인다', () => {
  const baseMessage = buildMessage({
    sender: 'bot',
    text: '첫 문장',
  });

  const nextMessage = appendTextToBotMessage(baseMessage, ' 두 번째 문장');

  assert.notEqual(nextMessage, baseMessage);
  assert.equal(nextMessage.text, '첫 문장 두 번째 문장');
});

test('appendTextToBotMessage는 추가 텍스트가 없으면 기존 객체를 유지한다', () => {
  const baseMessage = buildMessage({
    sender: 'bot',
    text: '변경 없음',
  });

  const nextMessage = appendTextToBotMessage(baseMessage, '');

  assert.equal(nextMessage, baseMessage);
});
