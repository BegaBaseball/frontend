// components/cheer/CommentItem.tsx
import { Heart, CornerDownRight, Send, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Comment as CheerComment } from '../../api/cheerApi';

interface CommentItemProps {
  comment: CheerComment & { isPending?: boolean };
  depth?: number;
  canInteract: boolean; // For replies
  canLike: boolean; // For likes
  repliesEnabled?: boolean;
  activeReplyId: number | null;
  replyDraft: string;
  isReplyPending: boolean;
  isCommentLikePending: boolean;
  commentLikeAnimating: Record<number, boolean>;
  onCommentLike: (commentId: number) => void;
  onReplyToggle: (commentId: number) => void;
  onReplyChange: (commentId: number, value: string) => void;
  onReplySubmit: (commentId: number) => void;
  onReplyCancel: () => void;
  onDelete?: (commentId: number) => void; // Added
  userEmail?: string; // Added for ownership check
}

export function CommentItem({
  comment,
  depth = 0,
  canInteract,
  canLike,
  repliesEnabled = true,
  activeReplyId,
  replyDraft,
  isReplyPending,
  isCommentLikePending,
  commentLikeAnimating,
  onCommentLike,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  onReplyCancel,
  onDelete, // Added
  userEmail, // Added
}: CommentItemProps) {
  const isReply = depth > 0;
  const likeCount = comment.likeCount ?? 0;
  const isReplyOpen = activeReplyId === comment.id;
  const isCommentLiked = Boolean(comment.likedByMe);
  const isCommentLikeAnimating = Boolean(commentLikeAnimating[comment.id]);
  const showReplyAction = canInteract && repliesEnabled;

  return (
    <div
      className={`${depth === 0
        ? 'border-b border-gray-100 dark:border-gray-800 pb-6 last:border-b-0 last:pb-0'
        : 'pl-10 pt-4'
        }`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          {isReply ? <CornerDownRight className="h-4 w-4 text-gray-300 dark:text-gray-600" /> : null}
          <ProfileAvatar
            src={comment.authorProfileImageUrl}
            alt={comment.author}
            size={isReply ? 'sm' : 'md'}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{comment.author}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {comment.isPending ? '전송 중...' : comment.timeAgo}
              </p>
            </div>
            {/* Delete Button */}
            {onDelete && userEmail && comment.authorEmail === userEmail && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
            {comment.content}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => onCommentLike(comment.id)}
              disabled={!canLike || isCommentLikePending}
              className={`flex items-center gap-1 transition-colors hover:text-red-500 ${isCommentLiked ? 'text-red-500' : ''
                } ${!canLike ? 'cursor-not-allowed text-gray-400 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-600' : ''}`}
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors">
                {isCommentLikeAnimating && (
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-red-500/20 animate-like-ring" />
                )}
                <Heart
                  className={`h-4 w-4 ${isCommentLiked ? 'fill-red-500 text-red-500' : ''} ${isCommentLikeAnimating ? 'animate-like-pop' : ''}`}
                />
              </span>
              <span>{likeCount}</span>
            </button>
            {showReplyAction && (
              <button
                onClick={() => onReplyToggle(comment.id)}
                disabled={!canInteract}
                className="flex items-center gap-1 transition-colors hover:text-gray-700 dark:hover:text-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
              >
                답글 달기
              </button>
            )}
          </div>

          {repliesEnabled && isReplyOpen && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <Textarea
                value={replyDraft}
                onChange={(e) => onReplyChange(comment.id, e.target.value)}
                placeholder="답글을 입력하세요"
                className="min-h-[80px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                disabled={!canInteract || isReplyPending}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={onReplyCancel}
                  disabled={isReplyPending}
                >
                  취소
                </Button>
                <Button
                  onClick={() => onReplySubmit(comment.id)}
                  disabled={
                    !canInteract || isReplyPending || replyDraft.trim().length === 0
                  }
                  className="flex items-center gap-2 text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  <Send className="h-4 w-4" />
                  답글 작성
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  canInteract={canInteract}
                  canLike={canLike}
                  repliesEnabled={repliesEnabled}
                  activeReplyId={activeReplyId}
                  replyDraft={replyDraft}
                  isReplyPending={isReplyPending}
                  isCommentLikePending={isCommentLikePending}
                  commentLikeAnimating={commentLikeAnimating}
                  onCommentLike={onCommentLike}
                  onReplyToggle={onReplyToggle}
                  onReplyChange={onReplyChange}
                  onReplySubmit={onReplySubmit}
                  onReplyCancel={onReplyCancel}
                  onDelete={onDelete} // Pass through
                  userEmail={userEmail} // Pass through
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
