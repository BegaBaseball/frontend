import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard, usePowerups } from '../hooks/useLeaderboard';
import { useAuthStore } from '../store/authStore';
import RetroLeaderboard from '../components/retro/RetroLeaderboard';
import type { LeaderboardType } from '../api/leaderboard';

/**
 * 리더보드 페이지 컨테이너
 * useLeaderboard 훅으로 데이터를 가져와 RetroLeaderboard에 전달
 */
export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<LeaderboardType>('season');
  const [page, setPage] = useState(0);

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const {
    leaderboard,
    myRank,
    hotStreaks,
    tickerMessages,
    isLoading,
    totalPages,
    refetch,
  } = useLeaderboard(type, page, 10);

  const {
    powerups,
    activePowerups,
    usePowerup,
  } = usePowerups();

  const handleTypeChange = useCallback((newType: LeaderboardType) => {
    setType(newType);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleMyScore = useCallback(() => {
    if (myRank && myRank.rank > 0) {
      const pageSize = 10;
      const targetPage = Math.floor((myRank.rank - 1) / pageSize);
      setPage(targetPage);
    } else {
      toast.info('아직 랭킹 정보가 없습니다.', { description: '예측에 참여해서 첫 점수를 획득해보세요!' });
    }
  }, [myRank, setPage]);

  const handlePredict = useCallback(() => {
    navigate('/prediction');
  }, [navigate]);

  const handleUsePowerup = useCallback(async (powerupType: string) => {
    await usePowerup(powerupType);
  }, [usePowerup]);

  const hotStreakEntries = hotStreaks.map((hs) => ({
    userId: hs.userId,
    userName: hs.userName,
    profileImageUrl: hs.profileImageUrl,
    level: hs.level,
    rankTitle: '',
    score: 0,
    streak: hs.streak,
  }));

  return (
    <RetroLeaderboard
      leaderboard={leaderboard}
      userStats={myRank}
      tickerMessages={tickerMessages}
      hotStreaks={hotStreakEntries}
      powerups={powerups as unknown as Record<string, number>}
      activePowerups={activePowerups}
      isLoading={isLoading}
      currentUserId={currentUserId}
      onTypeChange={handleTypeChange}
      onPageChange={handlePageChange}
      onRefresh={handleRefresh}
      onMyScore={handleMyScore}
      onPredict={handlePredict}
      onUsePowerup={handleUsePowerup}
      totalPages={totalPages}
    />
  );
}
