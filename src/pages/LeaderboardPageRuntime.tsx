import { lazy, Suspense, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboardPublic';
import { isLoggedInUser, useAuthStore } from '../store/authStore';
import RetroLeaderboard from '../components/retro/RetroLeaderboard';

const AuthenticatedRetroLeaderboard = lazy(() => import('../components/retro/AuthenticatedRetroLeaderboard'));

/**
 * 리더보드 페이지 컨테이너
 * useLeaderboard 훅으로 데이터를 가져와 RetroLeaderboard에 전달
 */
export default function LeaderboardPageRuntime() {
  const navigate = useNavigate();

  const isLoggedIn = useAuthStore((state) => isLoggedInUser(state.user));
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const currentUserHandle = useAuthStore((state) => state.user?.handle);

  const {
    leaderboard,
    hotStreaks,
    tickerMessages,
    isLoading,
    refetch,
  } = useLeaderboard('season', 0, 10);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePredict = useCallback(() => {
    navigate('/prediction');
  }, [navigate]);

  const hotStreakEntries = useMemo(() => hotStreaks.map((hs) => ({
    handle: hs.handle,
    userName: hs.userName,
    profileImageUrl: hs.profileImageUrl,
    level: hs.level,
    rankTitle: '',
    score: 0,
    streak: hs.streak,
  })), [hotStreaks]);

  const retroLeaderboardProps = {
    leaderboard,
    tickerMessages,
    hotStreaks: hotStreakEntries,
    isLoading,
    currentUserHandle,
    onRefresh: handleRefresh,
    onPredict: handlePredict,
  } as const;

  if (isLoggedIn && !isAuthLoading) {
    return (
      <Suspense fallback={<RetroLeaderboard {...retroLeaderboardProps} />}>
        <AuthenticatedRetroLeaderboard {...retroLeaderboardProps} />
      </Suspense>
    );
  }

  return (
    <RetroLeaderboard
      {...retroLeaderboardProps}
    />
  );
}
