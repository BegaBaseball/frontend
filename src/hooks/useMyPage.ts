import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { ViewMode } from '../types/profile';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';

export const useMyPage = () => {
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);

  const [viewMode, setViewMode] = useState<ViewMode>('diary');

  // ========== React Query ==========
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    enabled: isLoggedIn,
    retry: 1,
  });

  // ========== 로그인 체크 ==========
  useEffect(() => {
    if (!isLoggedIn) {
      navigateToLogin();
    }
  }, [isLoggedIn, navigateToLogin]);

  // ========== Computed Values ==========
  const profileImage = profile?.profileImageUrl || DEFAULT_PROFILE_IMAGE;
  const name = profile?.name || '로딩 중...';
  const email = profile?.email || 'loading@...';
  const savedFavoriteTeam = profile?.favoriteTeam || '없음';

  // ========== Handlers ==========
  const handleProfileUpdated = () => {
    setViewMode('diary');
    refetch();
  };

  const handleToggleStats = () => {
    setViewMode(viewMode === 'stats' ? 'diary' : 'stats');
  };

  return {
    // Auth
    isLoggedIn,
    user,

    // Profile Data
    profileImage,
    name,
    email,
    savedFavoriteTeam,
    isLoading,
    isError,

    // View Mode
    viewMode,
    setViewMode,

    // Handlers
    handleProfileUpdated,
    handleToggleStats,
    refetch,
  };
};