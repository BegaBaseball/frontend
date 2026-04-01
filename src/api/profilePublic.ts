import type { PublicUserProfile } from '../types/profile';
import { getApiErrorMessage } from '../utils/errorUtils';
import { publicGet } from './publicClient';

interface PublicProfileEnvelope {
  success: boolean;
  data: PublicUserProfile;
  message?: string;
}

const normalizeFavoriteTeam = (value?: string | null): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '없음' ? null : trimmed;
};

const normalizePublicProfile = (profile: PublicUserProfile): PublicUserProfile => ({
  ...profile,
  favoriteTeam: normalizeFavoriteTeam(profile.favoriteTeam),
});

export async function fetchPublicUserProfileByHandle(handle: string): Promise<PublicUserProfile> {
  try {
    const response = await publicGet<PublicProfileEnvelope>(`/users/profile/${encodeURIComponent(handle)}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || '프로필 데이터를 불러올 수 없습니다.');
    }

    return normalizePublicProfile(response.data);
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

