import { privateGet, privatePost } from './privateClient';
import type { DirectMessage, DirectMessageRoomBootstrap } from '../types/dm';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

const unwrapEnvelope = <T>(response: ApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
};

export async function bootstrapDirectMessageRoom(targetHandle: string): Promise<DirectMessageRoomBootstrap> {
  const response = await privatePost<ApiEnvelope<DirectMessageRoomBootstrap>, { targetHandle: string }>(
    '/dm/rooms',
    { targetHandle },
  );
  return unwrapEnvelope(response, '대화방을 준비하지 못했습니다.');
}

export async function fetchDirectMessages(roomId: number | string): Promise<DirectMessage[]> {
  const response = await privateGet<ApiEnvelope<DirectMessage[]>>(`/dm/rooms/${roomId}/messages`);
  return unwrapEnvelope(response, '메시지 기록을 불러오지 못했습니다.');
}

export async function sendDirectMessage(
  roomId: number,
  content: string,
  clientMessageId?: string,
): Promise<DirectMessage> {
  const response = await privatePost<ApiEnvelope<DirectMessage>, {
    roomId: number;
    content: string;
    clientMessageId?: string;
  }>('/dm/messages', {
    roomId,
    content,
    clientMessageId,
  });
  return unwrapEnvelope(response, '메시지 전송에 실패했습니다.');
}
