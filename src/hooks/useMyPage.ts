import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchUserProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { UserProfile, ViewMode } from '../types/profile';

const VALID_VIEW_MODES: ViewMode[] = ['diary', 'stats', 'editProfile', 'mateHistory', 'changePassword', 'accountSettings', 'blockedUsers'];
const LEGACY_TAB_TO_VIEW_MODE: Record<string, ViewMode> = {
  account: 'accountSettings',
  blocked: 'blockedUsers',
  edit: 'editProfile',
  profile: 'editProfile',
  settings: 'accountSettings',
};

export const useMyPage = () => {
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [searchParams, setSearchParams] = useSearchParams();

  // URL에서 viewMode 읽기
  const getViewModeFromUrl = useCallback((): ViewMode => {
    const viewParam = searchParams.get('view');
    if (viewParam && VALID_VIEW_MODES.includes(viewParam as ViewMode)) {
      return viewParam as ViewMode;
    }

    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const mappedMode = LEGACY_TAB_TO_VIEW_MODE[tabParam.toLowerCase()];
      if (mappedMode) {
        return mappedMode;
      }
    }

    return 'diary'; // 기본값
  }, [searchParams]);

  const [viewMode, setViewModeState] = useState<ViewMode>(getViewModeFromUrl);

  // URL 변경 시 viewMode 동기화
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const viewParam = searchParams.get('view');
    const mappedTabMode = tabParam ? LEGACY_TAB_TO_VIEW_MODE[tabParam.toLowerCase()] : undefined;
    setViewModeState(getViewModeFromUrl());

    const hasLegacyTabMode = Boolean(tabParam && mappedTabMode);
    if (!hasLegacyTabMode) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('tab');

    const isViewParamValid = Boolean(viewParam && VALID_VIEW_MODES.includes(viewParam as ViewMode));
    if (!isViewParamValid && mappedTabMode) {
      nextSearchParams.set('view', mappedTabMode);
      if (mappedTabMode === 'diary') {
        nextSearchParams.delete('view');
      }
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [getViewModeFromUrl, searchParams, setSearchParams]);

  // viewMode 변경 시 URL 업데이트
  const setViewMode = useCallback((mode: ViewMode) => {
    if (viewMode === mode) {
      return;
    }

    setViewModeState(mode);
    const nextSearchParams = new URLSearchParams(searchParams);

    if (mode === 'diary') {
      // diary는 기본값이므로 URL에서 제거
      nextSearchParams.delete('view');
      nextSearchParams.delete('tab');
    } else {
      nextSearchParams.set('view', mode);
      nextSearchParams.delete('tab');
    }

    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams, viewMode]);

  const fallbackProfile = useMemo<UserProfile | null>(() => {
    if (!user) return null;

    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      handle: user.handle,
      favoriteTeam: user.favoriteTeam || '없음',
      profileImageUrl: user.profileImageUrl ?? null,
      role: user.role,
      bio: user.bio ?? null,
      cheerPoints: user.cheerPoints ?? 0,
    };
  }, [user]);

  // ========== React Query ==========
  const {
    data: profile = fallbackProfile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['userProfile', userId ?? 'guest'],
    queryFn: fetchUserProfile,
    enabled: isLoggedIn && !isAuthLoading && !!userId && userId > 0,
    retry: 1,
  });

  // ========== 로그인 체크 ==========
  useEffect(() => {
    if (!isLoggedIn) {
      navigateToLogin();
    }
  }, [isLoggedIn, navigateToLogin]);

  // ========== Computed Values ==========
  const profileImage = profile?.profileImageUrl ?? null;
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
    profile,

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
