import { getApiErrorMessage } from '../utils/errorUtils';
import { privateGet } from './privateClient';

export interface LinkTokenResponse {
  linkToken: string;
  expiresIn: number;
}

export const getLinkToken = async (): Promise<LinkTokenResponse> => {
  try {
    return await privateGet<LinkTokenResponse>('/auth/link-token');
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '연동 토큰 발급에 실패했습니다.'));
  }
};
