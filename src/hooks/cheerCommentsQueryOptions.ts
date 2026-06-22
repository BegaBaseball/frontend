import type { PageResponse, Comment } from '../api/cheerApi';
import { fetchComments } from '../api/cheerApi';
import { CHEER_KEYS } from './cheerQueryKeys';

export const COMMENT_PAGE_SIZE = 20;

type CommentsPageLike = Pick<Partial<PageResponse<Comment>>, 'last' | 'number' | 'totalPages'>;

export const getNextCommentsPageParam = (lastPage: CommentsPageLike): number | undefined => {
  if (lastPage.last) {
    return undefined;
  }

  const currentPage = typeof lastPage.number === 'number' ? lastPage.number : 0;
  const nextPage = currentPage + 1;

  if (typeof lastPage.totalPages === 'number' && nextPage >= lastPage.totalPages) {
    return undefined;
  }

  return nextPage;
};

export const getCheerCommentsQueryOptions = (
  postId: number,
  size = COMMENT_PAGE_SIZE,
) => ({
  queryKey: CHEER_KEYS.comments(postId),
  queryFn: ({ pageParam = 0, signal }: { pageParam?: unknown; signal: AbortSignal }) => fetchComments(
    postId,
    typeof pageParam === 'number' ? pageParam : 0,
    size,
    { signal },
  ),
  initialPageParam: 0,
  getNextPageParam: getNextCommentsPageParam,
  staleTime: 30 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: false,
} as const);
