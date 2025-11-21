import { Message } from '../types/chatbot';

const HISTORY_MESSAGE_LIMIT = 8;

/**
 * 대화 기록을 API payload 형식으로 변환
 */
export const buildHistoryPayload = (conversation: Message[]) => {
  const trimmed = conversation
    .filter((msg) => msg.text && msg.text.trim().length > 0)
    .slice(-HISTORY_MESSAGE_LIMIT);

  if (!trimmed.length) return null;

  return trimmed.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));
};