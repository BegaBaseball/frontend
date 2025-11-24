import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDiaries, fetchDiaryStatistics } from '../api/diary';
import { calculateEmojiStats } from '../utils/diary';
import { DiaryStatistics } from '../types/diary';
import { toast } from 'sonner';

const getInitialStatistics = (): DiaryStatistics => ({
  totalCount: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  winRate: 0,
  monthlyCount: 0,
  yearlyCount: 0,
  yearlyWins: 0,
  yearlyWinRate: 0,
  mostVisitedStadium: null,
  mostVisitedCount: 0,
  happiestMonth: null,
  happiestCount: 0,
  firstDiaryDate: null,
  cheerPostCount: 0,
  mateParticipationCount: 0,
});

export const useDiaryStatistics = () => {

  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['diaries'],
    queryFn: fetchDiaries,
    staleTime: 1 * 60 * 1000,
  });
  // const { diaryEntries, cheerPostCount, mateParticipationCount } = useDiaryStore();

  // ========== Fetch Statistics ==========
  const {
    data: statistics = getInitialStatistics(),
    isLoading,
    error,
  } = useQuery({
    queryKey: ['statistics'],
    queryFn: fetchDiaryStatistics,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분
  });

  // ========== Error Handling ==========
  useEffect(() => {
    if (error) {
      toast.error('통계를 불러오는데 실패했습니다.');
    }
  }, [error]);

  // ========== Emoji Statistics ==========
  const emojiStats = useMemo(() => {
    return calculateEmojiStats(diaryEntries);
  }, [diaryEntries]);

  const totalEmojiCount = useMemo(() => {
    return emojiStats.reduce((sum, item) => sum + item.count, 0);
  }, [emojiStats]);

  return {
    statistics,
    emojiStats,
    totalEmojiCount,
    isLoading,
  };
};