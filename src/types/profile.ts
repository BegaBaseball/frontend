export interface UserProfile {
  id: number;
  name: string;
  handle?: string;
  email: string;
  favoriteTeam: string | null;
  profileImageUrl: string | null;
  role?: string;
  bio?: string | null;
  cheerPoints?: number;
}

export interface PublicUserProfile {
  id: number;
  name: string;
  handle: string;
  favoriteTeam: string | null;
  profileImageUrl: string | null;
  bio?: string | null;
  cheerPoints?: number;
}

export interface UserProfileApiResponse {
  success: boolean;
  data: UserProfile;
  message?: string;
  code?: string;
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
  profileImageUrl?: string | null;
  bio?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  data: {
    token?: string;
    profileImageUrl?: string | null;
    name?: string;
    email?: string;
    favoriteTeam?: string;
    bio?: string;
  };
  message?: string;
}

export type ViewMode = 'diary' | 'stats' | 'editProfile' | 'mateHistory' | 'changePassword' | 'accountSettings' | 'blockedUsers';

export type ProfileSection = 'profile' | 'accountSettings' | 'blockedUsers';
export type ProfileSectionTab = ProfileSection;
export type ProfileUiTab = ProfileSection;

export type NicknameCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export interface UserProviderDto {
  provider: string;
  providerId?: string;
  email?: string;
  connectedAt: string;
}

export interface DeviceSessionItem {
  id: string;
  sessionName?: string;
  deviceLabel?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  lastActiveAt?: string;
  lastSeenAt?: string;
  isCurrent?: boolean;
  isRevoked?: boolean;
  ip?: string;
}
