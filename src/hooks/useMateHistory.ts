import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getMateMyPartyHistoryQueryOptions } from './mateQueryOptions';
import { MateHistoryTab } from '../types/mate';
import { toast } from 'sonner';
import { useAuthSession } from '../store/authStore';
import { getApiErrorStatus } from '../api/errorStatus';

export const useMateHistory = (tab: MateHistoryTab) => {
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const canLoadMyParties = isLoggedIn && !isAuthLoading && userId !== null && userId > 0;
  const historyQueryOptions = getMateMyPartyHistoryQueryOptions(userId, tab);

  // ========== Fetch My Parties ==========
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    ...historyQueryOptions,
    enabled: canLoadMyParties,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) {
        return undefined;
      }
      const nextPage = lastPage.number + 1;
      return nextPage < lastPage.totalPages ? nextPage : undefined;
    },
    initialPageParam: 0,
  });

  // ========== Error Handling ==========
  useEffect(() => {
    if (error) {
      if (getApiErrorStatus(error) === 403) {
        return;
      }

      toast.error('메이트 내역을 불러오는데 실패했습니다.');
    }
  }, [error]);

  const parties = useMemo(
    () => data?.pages.flatMap((page) => page.content) ?? [],
    [data],
  );

  // ========== Empty Messages ==========
  const emptyMessage = useMemo(() => {
    if (tab === 'completed') return '완료된 메이트 내역이 없습니다';
    if (tab === 'ongoing') return '진행 중인 메이트가 없습니다';
    return '참여한 메이트 내역이 없습니다';
  }, [tab]);

  return {
    parties,
    isLoading,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    isEmpty: parties.length === 0,
    emptyMessage,
  };
};
