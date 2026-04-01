import type { AccountDeletionRecoveryInfo } from '../types/profile';
import { publicGet, publicPost } from './publicClient';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const getEnvelopeMessage = (fallback: string, error: unknown): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

export async function getAccountDeletionRecoveryInfo(token: string): Promise<AccountDeletionRecoveryInfo> {
  try {
    const response = await publicGet<ApiEnvelope<AccountDeletionRecoveryInfo>>(
      '/auth/account/deletion/recovery',
      {
        params: { token },
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || '계정 복구 정보를 확인하지 못했습니다.');
    }

    return response.data;
  } catch (error) {
    throw new Error(getEnvelopeMessage('계정 복구 정보 조회에 실패했습니다.', error));
  }
}

export async function requestAccountDeletionRecovery(token: string): Promise<void> {
  try {
    const response = await publicPost<ApiEnvelope<undefined>, { token: string }>(
      '/auth/account/deletion/recovery',
      { token },
    );

    if (!response.success) {
      throw new Error(response.message || '계정 복구에 실패했습니다.');
    }
  } catch (error) {
    throw new Error(getEnvelopeMessage('계정 복구에 실패했습니다.', error));
  }
}
