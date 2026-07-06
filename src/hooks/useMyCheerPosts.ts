import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchMyCheerPosts } from '../api/cheerApi';
import { getApiErrorStatus } from '../api/errorStatus';
import { useAuthSession } from '../store/authStore';
import { getNextPageParamFromPageResponse } from '../utils/pageResponsePagination';
import { CHEER_KEYS } from './cheerQueryKeys';

const MY_CHEER_POSTS_PAGE_SIZE = 10;

export const useMyCheerPosts = () => {
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const canLoadMyPosts = isLoggedIn && !isAuthLoading && userId !== null && userId > 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
    isError,
  } = useInfiniteQuery({
    queryKey: CHEER_KEYS.myPosts({ size: MY_CHEER_POSTS_PAGE_SIZE }),
    queryFn: ({ pageParam = 0 }) => fetchMyCheerPosts({
      page: pageParam as number,
      size: MY_CHEER_POSTS_PAGE_SIZE,
    }),
    enabled: canLoadMyPosts,
    getNextPageParam: getNextPageParamFromPageResponse,
    initialPageParam: 0,
    retry: false,
  });

  useEffect(() => {
    if (!error) {
      return;
    }
    if (getApiErrorStatus(error) === 403) {
      return;
    }

    toast.error('응원석 글을 불러오는데 실패했습니다.');
  }, [error]);

  const posts = useMemo(
    () => data?.pages.flatMap((page) => page.content) ?? [],
    [data],
  );
  const errorStatus = getApiErrorStatus(error);

  return {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    refetch,
    isError,
    isEmpty: posts.length === 0,
    emptyMessage: '작성한 응원석 글이 없습니다',
    errorMessage: errorStatus === 404
      ? '응원석 글 조회 경로를 찾을 수 없습니다.'
      : '응원석 글을 불러오지 못했습니다.',
  };
};
