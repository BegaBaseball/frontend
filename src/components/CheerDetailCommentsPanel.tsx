import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import * as cheerApi from '../api/cheerApi';
import type { Comment } from '../api/cheerApi';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import { getDuplicateCommentErrorMessage, parseError } from '../utils/errorUtils';
import AdSlot from './ads/AdSlot';
import { CommentItem } from './cheer/CommentItem';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MessageSquare } from 'lucide-react';
import type { ConfirmOptions } from './contexts/confirmDialogCore';

type PendingComment = Comment & { isPending?: boolean };

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
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplyPending, setIsReplyPending] = useState(false);
  const [commentLikeAnimating, setCommentLikeAnimating] = useState<Record<number, boolean>>({});
  const commentLikeTimersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      Object.values(commentLikeTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const data = await cheerApi.fetchComments(resolvedPostId);
        setComments(data.content);
        if (typeof data.totalElements === 'number') {
          onCommentCountChange(data.totalElements);
        } else {
          onCommentCountChange(data.content?.length ?? 0);
        }
      } catch (error) {
        console.error('댓글 목록 로드 실패:', error);
        setCommentsError('댓글을 불러오지 못했습니다.');
      } finally {
        setCommentsLoading(false);
      }
    };

    void loadComments();
  }, [onCommentCountChange, resolvedPostId]);

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
    setComments((prev) => [optimisticComment, ...prev]);
    onCommentCountChange(commentCount + 1);
    setSendingComment(true);

    try {
      const created = await cheerApi.createComment(resolvedPostId, trimmed);
      if (created?.id) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === optimisticId ? { ...created, isPending: false } : comment
          )
        );
      } else {
        const reloaded = await cheerApi.fetchComments(resolvedPostId);
        setComments(reloaded.content);
        onCommentCountChange(
          typeof reloaded.totalElements === 'number'
            ? reloaded.totalElements
            : reloaded.content?.length ?? 0
        );
      }
    } catch (error) {
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
      onCommentCountChange(Math.max(0, commentCount - 1));
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

    setComments((prev) => updateCommentLikes(prev, commentId));
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
      setComments((prev) => updateCommentLikes(prev, commentId));
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
      toast.info('답글 기능은 준비 중입니다.');
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

    const previousComments = [...comments];

    const filterComments = (list: PendingComment[], targetId: number): PendingComment[] => (
      list.filter((comment) => comment.id !== targetId).map((comment) => ({
        ...comment,
        replies: comment.replies ? filterComments(comment.replies as PendingComment[], targetId) : [],
      }))
    );

    setComments((prev) => filterComments(prev, commentId));
    onCommentCountChange(Math.max(0, commentCount - 1));

    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Comment deletion failed', error);
      setComments(previousComments);
      onCommentCountChange(previousComments.length);
      toast.error(parseError(error).message || '댓글 삭제 실패');
    }
  };

  return (
    <div
      id="cheer-comments-section"
      className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10"
    >
      <div className="mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: detailAccent }}>
            댓글
          </p>
          <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">댓글 {commentCount}개</h3>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 sm:text-[13px]">
            응원은 댓글에서 더 뜨거워집니다.
          </p>
          {!areCommentRepliesAvailable && (
            <div
              data-testid="cheer-reply-status"
              className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>답글 기능은 준비 중입니다. 지금은 댓글과 좋아요로 응원에 참여할 수 있습니다.</span>
            </div>
          )}
        </div>
      </div>

      {isLoggedIn ? (
        <div
          className="mb-4 rounded-[20px] border bg-white/85 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-3.5"
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
              ringClassName="p-px bg-black/5 dark:bg-white/10"
            />
            <div className="min-w-0 flex-1">
              <Textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="오늘의 응원 한마디를 남겨보세요."
                disabled={sendingComment}
                aria-label="댓글 입력"
                className="min-h-[64px] rounded-[16px] border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-sm leading-5 dark:border-white/10 dark:bg-slate-950/70"
              />
              <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  서로를 존중하는 응원 문화를 지켜주세요.
                </p>
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || sendingComment}
                  aria-label="댓글 등록"
                  className="h-8 rounded-full px-4 text-[12px] text-white sm:h-9 sm:text-[13px]"
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
          className="mb-4 rounded-[20px] border p-4 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/80"
          style={{
            ...primaryBorderStyle,
            ...surfaceTintStyle,
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            댓글, 좋아요, 답글 참여는 로그인 후 이용할 수 있습니다.
          </p>
          <Button
            onClick={onRedirectToLogin}
            className="mt-4 h-9 rounded-full px-4 text-[13px] text-white"
            style={{ backgroundColor: detailAccent }}
          >
            로그인하고 참여하기
          </Button>
        </div>
      )}

      {commentsError ? (
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
          <p>{commentsError}</p>
          <Button
            variant="outline"
            className="mt-3 rounded-full"
            onClick={async () => {
              setCommentsLoading(true);
              setCommentsError(null);
              try {
                const data = await cheerApi.fetchComments(resolvedPostId);
                setComments(data.content);
                onCommentCountChange(
                  typeof data.totalElements === 'number'
                    ? data.totalElements
                    : data.content?.length ?? 0
                );
              } catch (error) {
                console.error('댓글 목록 로드 실패:', error);
                setCommentsError('댓글을 불러오지 못했습니다.');
              } finally {
                setCommentsLoading(false);
              }
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : commentsLoading ? (
        <div aria-busy="true" aria-label="댓글 불러오는 중" className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex animate-pulse gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/70"
            >
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
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
            minHeight={152}
            className="mb-4"
          />
          <div
            className="rounded-[18px] border p-3 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400"
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
              minHeight={152}
              className="mb-4"
            />
          ) : null}
          <div
            role="list"
            aria-label="댓글 목록"
            className="space-y-2"
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
              index === 2 ? (
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
                  minHeight={152}
                />
              ) : null,
            ])}
          </div>
        </>
      )}
    </div>
  );
}
