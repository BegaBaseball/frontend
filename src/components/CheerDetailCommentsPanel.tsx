import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import * as cheerApi from '../api/cheerApi';
import type { Comment } from '../api/cheerApi';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import {
  COMMENT_PAGE_SIZE,
  getCheerCommentsQueryOptions,
} from '../hooks/cheerCommentsQueryOptions';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import { getDuplicateCommentErrorMessage, parseError } from '../utils/errorUtils';
import AdSlot from './ads/AdSlot';
import { CommentItem } from './cheer/CommentItem';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import type { ConfirmOptions } from './contexts/confirmDialogCore';

type PendingComment = Comment & { isPending?: boolean };
type CheerCommentsPage = Awaited<ReturnType<typeof cheerApi.fetchComments>>;
type CheerCommentsInfiniteData = InfiniteData<CheerCommentsPage, number>;

interface CheerDetailCommentsPanelProps {
  resolvedPostId: number;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
  isLoggedIn: boolean;
  authUserId: string | null;
  authUserHandle?: string | null;
  authUserDisplayName: string;
  authUserProfileImageUrl?: string | null;
  areCommentRepliesAvailable: boolean;
  detailAccent: string;
  primaryBorderStyle: CSSProperties;
  surfaceTintStyle: CSSProperties;
  onRedirectToLogin: () => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const resolveProfileImage = (imageUrl?: string | null) => {
  if (!imageUrl) return baseballLogo;
  if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return DEFAULT_PROFILE_IMAGE;
  return imageUrl;
};

const countCommentNodes = (list: PendingComment[]): number => list.reduce(
  (total, comment) => total + 1 + countCommentNodes((comment.replies as PendingComment[] | undefined) ?? []),
  0,
);

const removeCommentTree = (
  list: PendingComment[],
  targetId: number,
): { comments: PendingComment[]; removedCount: number } => {
  let removedCount = 0;

  const comments = list.flatMap((comment) => {
    if (comment.id === targetId) {
      removedCount += countCommentNodes([comment]);
      return [];
    }

    const childResult = removeCommentTree((comment.replies as PendingComment[] | undefined) ?? [], targetId);
    removedCount += childResult.removedCount;

    return [{
      ...comment,
      replies: childResult.comments,
    }];
  });

  return { comments, removedCount };
};

export default function CheerDetailCommentsPanel({
  resolvedPostId,
  commentCount,
  onCommentCountChange,
  isLoggedIn,
  authUserId,
  authUserHandle,
  authUserDisplayName,
  authUserProfileImageUrl,
  areCommentRepliesAvailable,
  detailAccent,
  primaryBorderStyle,
  surfaceTintStyle,
  onRedirectToLogin,
  confirm,
}: CheerDetailCommentsPanelProps) {
  const { deleteCommentMutation } = useCheerMutations();
  const queryClient = useQueryClient();
  const commentsQueryOptions = useMemo(
    () => getCheerCommentsQueryOptions(resolvedPostId),
    [resolvedPostId],
  );
  const commentsQuery = useInfiniteQuery(commentsQueryOptions);
  const [commentText, setCommentText] = useState('');
  const [commentsTotal, setCommentsTotal] = useState(commentCount);
  const [sendingComment, setSendingComment] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplyPending, setIsReplyPending] = useState(false);
  const [commentLikeAnimating, setCommentLikeAnimating] = useState<Record<number, boolean>>({});
  const commentLikeTimersRef = useRef<Record<number, number>>({});
  const commentsRef = useRef<PendingComment[]>([]);
  const comments = useMemo<PendingComment[]>(
    () => commentsQuery.data?.pages.flatMap((page) => page.content as PendingComment[]) ?? [],
    [commentsQuery.data],
  );
  const commentsLoading = commentsQuery.isPending;
  const loadingMoreComments = commentsQuery.isFetchingNextPage;
  const commentsError = commentsQuery.isError ? '댓글을 불러오지 못했습니다.' : null;

  useEffect(() => {
    return () => {
      Object.values(commentLikeTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    setCommentsTotal(commentCount);
  }, [commentCount]);

  const syncCommentCount = useCallback((nextCount: number) => {
    setCommentsTotal(nextCount);
    onCommentCountChange(nextCount);
  }, [onCommentCountChange]);

  useEffect(() => {
    const serverTotal = commentsQuery.data?.pages[0]?.totalElements;
    if (typeof serverTotal === 'number') {
      syncCommentCount(serverTotal);
    }
  }, [commentsQuery.data, syncCommentCount]);

  const createEmptyCommentsData = useCallback((): CheerCommentsInfiniteData => ({
    pages: [{
      content: [],
      totalElements: 0,
      last: true,
      totalPages: 1,
      size: COMMENT_PAGE_SIZE,
      number: 0,
    }],
    pageParams: [0],
  }), []);

  const setCommentsData = useCallback((
    updater: (data: CheerCommentsInfiniteData) => CheerCommentsInfiniteData,
  ) => {
    queryClient.setQueryData<CheerCommentsInfiniteData>(
      commentsQueryOptions.queryKey,
      (oldData) => updater(oldData ?? createEmptyCommentsData()),
    );
  }, [commentsQueryOptions.queryKey, createEmptyCommentsData, queryClient]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      onRedirectToLogin();
      return;
    }

    const trimmed = commentText.trim();
    const draft = commentText;
    const optimisticId = Date.now() * -1;
    const optimisticComment: PendingComment = {
      id: optimisticId,
      author: authUserDisplayName,
      content: trimmed,
      timeAgo: '방금 전',
      likes: 0,
      likeCount: 0,
      likedByMe: false,
      authorProfileImageUrl: authUserProfileImageUrl ?? undefined,
      isPending: true,
    };

    setCommentText('');
    const previousData = queryClient.getQueryData<CheerCommentsInfiniteData>(commentsQueryOptions.queryKey);
    const previousTotal = commentsTotal;
    const nextTotal = previousTotal + 1;
    setCommentsData((data) => ({
      ...data,
      pages: data.pages.map((page, index) => ({
        ...page,
        content: index === 0 ? [optimisticComment, ...(page.content as PendingComment[])] : page.content,
        totalElements: nextTotal,
      })),
    }));
    syncCommentCount(nextTotal);
    setSendingComment(true);

    try {
      const created = await cheerApi.createComment(resolvedPostId, trimmed);
      if (created?.id) {
        setCommentsData((data) => ({
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            content: (page.content as PendingComment[]).map((comment) =>
              comment.id === optimisticId ? { ...created, isPending: false } : comment
            ),
          })),
        }));
      } else {
        await commentsQuery.refetch();
      }
    } catch (error) {
      queryClient.setQueryData(commentsQueryOptions.queryKey, previousData);
      syncCommentCount(previousTotal);
      setCommentText(draft);
      const parsed = parseError(error);
      toast.error(getDuplicateCommentErrorMessage(error, parsed.message || '댓글 작성 실패'));
    } finally {
      setSendingComment(false);
    }
  };

  const updateCommentLikes = (
    list: PendingComment[],
    targetId: number,
  ): PendingComment[] => list.map((comment) => {
    if (comment.id === targetId) {
      const isLiked = Boolean(comment.likedByMe);
      const currentCount = comment.likeCount ?? comment.likes ?? 0;
      return {
        ...comment,
        likedByMe: !isLiked,
        likeCount: currentCount + (isLiked ? -1 : 1),
      };
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentLikes(comment.replies as PendingComment[], targetId),
      };
    }
    return comment;
  });

  const handleCommentLike = async (commentId: number) => {
    if (!isLoggedIn) {
      onRedirectToLogin();
      return;
    }

    const previousData = queryClient.getQueryData<CheerCommentsInfiniteData>(commentsQueryOptions.queryKey);
    setCommentsData((data) => ({
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        content: updateCommentLikes(page.content as PendingComment[], commentId),
      })),
    }));
    setCommentLikeAnimating((prev) => ({ ...prev, [commentId]: true }));

    if (commentLikeTimersRef.current[commentId]) {
      window.clearTimeout(commentLikeTimersRef.current[commentId]);
    }
    commentLikeTimersRef.current[commentId] = window.setTimeout(() => {
      setCommentLikeAnimating((prev) => ({ ...prev, [commentId]: false }));
    }, 450);

    try {
      await cheerApi.toggleCommentLike(commentId);
    } catch (error) {
      console.error('Comment like failed', error);
      queryClient.setQueryData(commentsQueryOptions.queryKey, previousData);
      toast.error(parseError(error).message || '좋아요 처리 실패');
    }
  };

  const handleReplyToggle = (commentId: number) => {
    if (!isLoggedIn) {
      onRedirectToLogin();
      return;
    }
    setActiveReplyId((prev) => (prev === commentId ? null : commentId));
    setReplyDraft('');
  };

  const handleReplyChange = (commentId: number, value: string) => {
    if (activeReplyId === commentId) {
      setReplyDraft(value);
    }
  };

  const handleReplyCancel = () => {
    setActiveReplyId(null);
    setReplyDraft('');
  };

  const handleReplySubmit = async (commentId: number) => {
    if (!commentId || commentId !== activeReplyId) return;
    if (!replyDraft.trim()) return;
    setIsReplyPending(true);
    try {
      handleReplyCancel();
    } finally {
      setIsReplyPending(false);
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    const commentDeleteConfirmed = await confirm({
      title: '댓글 삭제',
      description: '댓글을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      variant: 'destructive',
    });
    if (!commentDeleteConfirmed) return;

    const previousComments = commentsRef.current;
    const previousData = queryClient.getQueryData<CheerCommentsInfiniteData>(commentsQueryOptions.queryKey);
    const previousTotal = commentsTotal;
    const { comments: nextComments, removedCount } = removeCommentTree(previousComments, commentId);
    const nextTotal = Math.max(0, previousTotal - Math.max(removedCount, 1));

    commentsRef.current = nextComments;
    setCommentsData((data) => ({
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        content: removeCommentTree(page.content as PendingComment[], commentId).comments,
        totalElements: nextTotal,
      })),
    }));
    syncCommentCount(nextTotal);

    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Comment deletion failed', error);
      commentsRef.current = previousComments;
      queryClient.setQueryData(commentsQueryOptions.queryKey, previousData);
      syncCommentCount(previousTotal);
      toast.error(parseError(error).message || '댓글 삭제 실패');
    }
  };

  const handleLoadMoreComments = async () => {
    if (loadingMoreComments || !commentsQuery.hasNextPage) {
      return;
    }
    try {
      await commentsQuery.fetchNextPage();
    } catch (error) {
      console.error('댓글 추가 로드 실패:', error);
      toast.error('댓글을 더 불러오지 못했습니다.');
    }
  };

  return (
    <div
      id="cheer-comments-section"
      className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10"
    >
      <div className="mb-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[18px] font-bold text-slate-900 dark:text-white sm:text-[19px]">댓글 {commentsTotal}개</h3>
          </div>
        </div>
      </div>

      {isLoggedIn ? (
        <div
          className="mb-2 rounded-[18px] border bg-white/85 p-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-3"
          style={primaryBorderStyle}
        >
          <div className="flex gap-3">
            <ProfileAvatar
              src={authUserProfileImageUrl ? resolveProfileImage(authUserProfileImageUrl) : undefined}
              alt={authUserDisplayName}
              fallbackName={authUserDisplayName}
              width={40}
              height={40}
              showRing
              ringVariant="cheerFeed"
            />
            <div className="min-w-0 flex-1">
                <Textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="오늘의 응원 한마디를 남겨보세요."
                  disabled={sendingComment}
                  aria-label="댓글 입력"
                  className="min-h-[54px] rounded-[16px] border-slate-200 bg-slate-50/90 px-3 py-2 text-[16px] font-semibold leading-5 dark:border-white/10 dark:bg-slate-950/70"
                />
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[16px] font-bold text-slate-500 dark:text-white">
                  서로를 존중하는 응원 문화를 지켜주세요.
                </p>
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || sendingComment}
                  aria-label="댓글 등록"
                  className="h-7 rounded-full px-3 text-[16px] font-bold text-white sm:h-7 sm:text-[16px]"
                  style={{ backgroundColor: detailAccent }}
                >
                  등록
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mb-2 rounded-[18px] border p-2.5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/80"
          style={{
            ...primaryBorderStyle,
            ...surfaceTintStyle,
          }}
        >
          <p className="text-[16px] font-bold text-slate-600 dark:text-white">
            댓글과 좋아요는 로그인 후 이용할 수 있습니다.
          </p>
          <Button
            onClick={onRedirectToLogin}
            className="mt-2.5 h-7 rounded-full px-3 text-[16px] font-bold text-white"
            style={{ backgroundColor: detailAccent }}
          >
            로그인하고 참여하기
          </Button>
        </div>
      )}

      {commentsError ? (
        <div className="rounded-[16px] border border-slate-200 bg-white p-3 text-[16px] font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-white">
            <p className="font-bold">{commentsError}</p>
          <Button
            variant="outline"
            className="mt-3 rounded-full font-bold"
            onClick={() => {
              void commentsQuery.refetch();
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : commentsLoading ? (
          <div aria-busy="true" aria-label="댓글 불러오는 중" className="space-y-1.5">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-2 rounded-[16px] border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-slate-900/70"
              >
              <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <>
          <AdSlot
            slotId="cheer_detail_1"
            pageType="cheer_detail"
            contentId={resolvedPostId ? String(resolvedPostId) : null}
            listIndex={3}
            creativeType="native_card"
            loggedIn={isLoggedIn}
            userId={authUserId ? String(authUserId) : null}
            wave="ads_wave2"
            minHeight={128}
            className="mb-3"
          />
            <div
            className="rounded-[18px] border p-3 text-center text-[16px] font-bold text-slate-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
            style={{
              ...primaryBorderStyle,
              ...surfaceTintStyle,
            }}
            >
            아직 댓글이 없습니다. 첫 댓글로 응원의 흐름을 시작해보세요.
          </div>
        </>
      ) : (
        <>
          {comments.length < 3 ? (
            <AdSlot
              slotId="cheer_detail_1"
              pageType="cheer_detail"
              contentId={resolvedPostId ? String(resolvedPostId) : null}
              listIndex={3}
              creativeType="native_card"
              loggedIn={isLoggedIn}
              userId={authUserId ? String(authUserId) : null}
              wave="ads_wave2"
              minHeight={128}
              className="mb-3"
            />
          ) : null}
          <div
            role="list"
            aria-label="댓글 목록"
            className="space-y-1.5"
          >
            {comments.flatMap((comment, index) => [
              <div
                key={comment.id}
                role="listitem"
                className="rounded-[18px] border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
              >
                <CommentItem
                  comment={comment}
                  canInteract={isLoggedIn}
                  canLike={isLoggedIn}
                  repliesEnabled={areCommentRepliesAvailable}
                  repliesComingSoon={!areCommentRepliesAvailable}
                  activeReplyId={activeReplyId}
                  replyDraft={replyDraft}
                  isReplyPending={isReplyPending}
                  isCommentLikePending={false}
                  commentLikeAnimating={commentLikeAnimating}
                  onCommentLike={handleCommentLike}
                  onReplyToggle={handleReplyToggle}
                  onReplyChange={handleReplyChange}
                  onReplySubmit={handleReplySubmit}
                  onReplyCancel={handleReplyCancel}
                  onDelete={handleCommentDelete}
                  userHandle={authUserHandle ?? undefined}
                />
              </div>,
              index === 4 && comments.length > 5 ? (
                <AdSlot
                  key="cheer-detail-1"
                  slotId="cheer_detail_1"
                  pageType="cheer_detail"
                  contentId={resolvedPostId ? String(resolvedPostId) : null}
                  listIndex={3}
                  creativeType="native_card"
                  loggedIn={isLoggedIn}
                  userId={authUserId ? String(authUserId) : null}
                  wave="ads_wave2"
                  minHeight={128}
                  className="my-2"
                />
              ) : null,
            ])}
          </div>
          {commentsQuery.hasNextPage ? (
            <Button
              variant="outline"
              className="mt-3 h-8 w-full rounded-full text-[16px] font-bold"
              onClick={() => {
                void handleLoadMoreComments();
              }}
              disabled={loadingMoreComments}
              aria-label="댓글 더 불러오기"
              data-testid="cheer-comments-show-more"
            >
              {loadingMoreComments ? '불러오는 중...' : '댓글 더보기'}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
