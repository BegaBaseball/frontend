export interface UserProfile {
  id: number;
  name: string;
  email: string;
  favoriteTeam: string | null;
  profileImageUrl: string | null;
  role?: string;
  bio?: string | null;
}

export interface PublicUserProfile {
  id: number;
  name: string;
  favoriteTeam: string | null;
  profileImageUrl: string | null;
  bio?: string | null;
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
  bio?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  data: {
    token?: string;
    profileImageUrl?: string;
    name?: string;
    email?: string;
    favoriteTeam?: string;
    bio?: string;
  };
  message?: string;
}

export type ViewMode = 'diary' | 'stats' | 'editProfile' | 'mateHistory' | 'changePassword' | 'accountSettings';

export interface UserProviderDto {
  provider: string;
  connectedAt: string;
}