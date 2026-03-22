import api from './axios';
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
  const response = await api.get<ApiEnvelope<ChatSessionSummary[]>>('/ai/chat/sessions', {
    skipGlobalErrorHandler: true,
  });
  return getData(response.data);
};

export const createChatSession = async (): Promise<ChatSessionSummary> => {
  const response = await api.post<ApiEnvelope<ChatSessionSummary>>('/ai/chat/sessions', undefined, {
    skipGlobalErrorHandler: true,
  });
  return getData(response.data);
};

export const getChatSessionMessages = async (sessionId: number): Promise<StoredChatMessage[]> => {
  const response = await api.get<ApiEnvelope<StoredChatMessage[]>>(`/ai/chat/sessions/${sessionId}/messages`, {
    skipGlobalErrorHandler: true,
  });
  return getData(response.data);
};

export const saveUserChatMessage = async (
  sessionId: number,
  content: string,
): Promise<StoredChatMessage> => {
  const response = await api.post<ApiEnvelope<StoredChatMessage>>(
    `/ai/chat/sessions/${sessionId}/messages/user`,
    { content },
    { skipGlobalErrorHandler: true },
  );
  return getData(response.data);
};

export const saveAssistantChatMessage = async (
  sessionId: number,
  payload: Record<string, unknown>,
): Promise<StoredChatMessage> => {
  const response = await api.post<ApiEnvelope<StoredChatMessage>>(
    `/ai/chat/sessions/${sessionId}/messages/assistant`,
    payload,
    { skipGlobalErrorHandler: true },
  );
  return getData(response.data);
};

export const deleteChatSession = async (sessionId: number): Promise<void> => {
  await api.delete(`/ai/chat/sessions/${sessionId}`, {
    skipGlobalErrorHandler: true,
  });
};

export const listChatFavorites = async (): Promise<ChatFavoriteItem[]> => {
  const response = await api.get<ApiEnvelope<ChatFavoriteItem[]>>('/ai/chat/favorites', {
    skipGlobalErrorHandler: true,
  });
  return getData(response.data);
};

export const addChatFavorite = async (messageId: number): Promise<ChatFavoriteItem> => {
  const response = await api.post<ApiEnvelope<ChatFavoriteItem>>(
    `/ai/chat/favorites/${messageId}`,
    undefined,
    { skipGlobalErrorHandler: true },
  );
  return getData(response.data);
};

export const removeChatFavorite = async (messageId: number): Promise<void> => {
  await api.delete(`/ai/chat/favorites/${messageId}`, {
    skipGlobalErrorHandler: true,
  });
};
