import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserProfile } from '../api/profile';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { UserProfile, ViewMode } from '../types/profile';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';

const VALID_VIEW_MODES: ViewMode[] = ['diary', 'stats', 'editProfile', 'mateHistory', 'changePassword', 'accountSettings', 'blockedUsers'];
const LEGACY_TAB_TO_VIEW_MODE: Record<string, ViewMode> = {
  account: 'accountSettings',
  blocked: 'blockedUsers',
  edit: 'editProfile',
  profile: 'editProfile',
  settings: 'accountSettings',
};

export const useMyPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const {
    userId,
    userEmail,
    userName,
    userHandle,
    userFavoriteTeam,
    userProfileImageUrl,
    userRole,
    userProvider,
    userBio,
    userCheerPoints,
    userHasPassword,
  } = useAuthProfileSnapshot();

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
    if (!userId) return null;

    return {
      id: userId,
      name: userName || '',
      email: userEmail ?? '',
      handle: userHandle,
      favoriteTeam: userFavoriteTeam || '없음',
      profileImageUrl: userProfileImageUrl ?? null,
      role: userRole,
      provider: userProvider,
      bio: userBio ?? null,
      cheerPoints: userCheerPoints ?? 0,
      hasPassword: userHasPassword,
    };
  }, [userBio, userCheerPoints, userFavoriteTeam, userHandle, userHasPassword, userId, userName, userProfileImageUrl, userProvider, userRole, userEmail]);

  const user = useMemo<UserProfile | null>(() => {
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      name: userName || '',
      email: userEmail ?? '',
      handle: userHandle,
      favoriteTeam: userFavoriteTeam || '없음',
      profileImageUrl: userProfileImageUrl ?? null,
      role: userRole,
      provider: userProvider,
      bio: userBio ?? null,
      cheerPoints: userCheerPoints ?? 0,
      hasPassword: userHasPassword,
    };
  }, [userBio, userCheerPoints, userFavoriteTeam, userHandle, userHasPassword, userId, userName, userEmail, userProfileImageUrl, userProvider, userRole]);

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
    if (!isAuthLoading && !isLoggedIn) {
      navigate(buildLoginPath(getCurrentRelativeUrl()), { replace: true });
    }
  }, [isLoggedIn, isAuthLoading, navigate]);

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
