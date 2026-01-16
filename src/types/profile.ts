export interface UserProfile {
  id: number;
  name: string;
  email: string;
  favoriteTeam: string | null;
  profileImageUrl: string | null;
  role?: string;
}

export interface UserProfileApiResponse {
  success: boolean;
  data: UserProfile;
  message?: string;
}

export interface ProfileImageDto {
  userId: number;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  bytes: number;
}

export interface ProfileUpdateData {
  name: string;
  email: string;
  favoriteTeam: string | null;
  profileImageUrl?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  data: {
    token?: string;
    profileImageUrl?: string;
  };
  message?: string;
}

export type ViewMode = 'diary' | 'stats' | 'editProfile' | 'mateHistory' | 'changePassword' | 'accountSettings';

export interface UserProviderDto {
  provider: string;
  connectedAt: string;
}