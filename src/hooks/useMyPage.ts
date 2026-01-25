import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchUserProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { ViewMode } from '../types/profile';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';

const VALID_VIEW_MODES: ViewMode[] = ['diary', 'stats', 'editProfile', 'mateHistory', 'changePassword', 'accountSettings'];

export const useMyPage = () => {
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);

  const [searchParams, setSearchParams] = useSearchParams();

  // URL에서 viewMode 읽기
  const getViewModeFromUrl = useCallback((): ViewMode => {
    const viewParam = searchParams.get('view');
    if (viewParam && VALID_VIEW_MODES.includes(viewParam as ViewMode)) {
      return viewParam as ViewMode;
    }
    return 'diary'; // 기본값
  }, [searchParams]);

  const [viewMode, setViewModeState] = useState<ViewMode>(getViewModeFromUrl);

  // URL 변경 시 viewMode 동기화
  useEffect(() => {
    setViewModeState(getViewModeFromUrl());
  }, [getViewModeFromUrl]);

  // viewMode 변경 시 URL 업데이트
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    if (mode === 'diary') {
      // diary는 기본값이므로 URL에서 제거
      searchParams.delete('view');
    } else {
      searchParams.set('view', mode);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
  const handle = profile?.handle || '';
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
    handle,
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