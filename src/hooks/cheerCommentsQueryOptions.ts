import type { PageResponse, Comment } from '../api/cheerApi';
import { fetchComments } from '../api/cheerApi';
import { getNextPageParamFromPageResponse } from '../utils/pageResponsePagination';
import { CHEER_KEYS } from './cheerQueryKeys';

export const COMMENT_PAGE_SIZE = 20;

type CommentsPageLike = Pick<Partial<PageResponse<Comment>>, 'last' | 'number' | 'totalPages'>;

export const getNextCommentsPageParam = (lastPage: CommentsPageLike): number | undefined => {
  return getNextPageParamFromPageResponse(lastPage);
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
