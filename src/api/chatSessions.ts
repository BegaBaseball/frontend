import { privateDelete, privateGet, privatePost } from './privateClient';
import {
  ChatFavoriteItem,
  ChatSessionSummary,
  StoredChatMessage,
} from '../types/chatbot';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const getData = <T>(payload: ApiEnvelope<T>): T => {
  if (!payload.success || payload.data === undefined) {
    throw new Error(payload.message || 'AI 채팅 저장 응답이 올바르지 않습니다.');
  }
  return payload.data;
};

export const listChatSessions = async (): Promise<ChatSessionSummary[]> => {
  const response = await privateGet<ApiEnvelope<ChatSessionSummary[]>>('/ai/chat/sessions');
  return getData(response);
};

export const createChatSession = async (): Promise<ChatSessionSummary> => {
  const response = await privatePost<ApiEnvelope<ChatSessionSummary>, undefined>('/ai/chat/sessions');
  return getData(response);
};

export const getChatSessionMessages = async (sessionId: number): Promise<StoredChatMessage[]> => {
  const response = await privateGet<ApiEnvelope<StoredChatMessage[]>>(`/ai/chat/sessions/${sessionId}/messages`);
  return getData(response);
};

export const saveUserChatMessage = async (
  sessionId: number,
  content: string,
): Promise<StoredChatMessage> => {
  const response = await privatePost<ApiEnvelope<StoredChatMessage>, { content: string }>(
    `/ai/chat/sessions/${sessionId}/messages/user`,
    { content },
  );
  return getData(response);
};

export const saveAssistantChatMessage = async (
  sessionId: number,
  payload: Record<string, unknown>,
): Promise<StoredChatMessage> => {
  const response = await privatePost<ApiEnvelope<StoredChatMessage>, Record<string, unknown>>(
    `/ai/chat/sessions/${sessionId}/messages/assistant`,
    payload,
  );
  return getData(response);
};

export const deleteChatSession = async (sessionId: number): Promise<void> => {
  await privateDelete(`/ai/chat/sessions/${sessionId}`);
};

export const listChatFavorites = async (): Promise<ChatFavoriteItem[]> => {
  const response = await privateGet<ApiEnvelope<ChatFavoriteItem[]>>('/ai/chat/favorites');
  return getData(response);
};

export const addChatFavorite = async (messageId: number): Promise<ChatFavoriteItem> => {
  const response = await privatePost<ApiEnvelope<ChatFavoriteItem>, undefined>(
    `/ai/chat/favorites/${messageId}`,
  );
  return getData(response);
};

export const removeChatFavorite = async (messageId: number): Promise<void> => {
  await privateDelete(`/ai/chat/favorites/${messageId}`);
};
