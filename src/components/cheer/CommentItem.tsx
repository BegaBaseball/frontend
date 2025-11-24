// components/cheer/CommentItem.tsx
import { Heart, CornerDownRight, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Comment as CheerComment } from '../../store/cheerStore';

interface CommentItemProps {
  comment: CheerComment;
  depth?: number;
  canInteract: boolean;
  activeReplyId: number | null;
  replyDraft: string;
  isReplyPending: boolean;
  isCommentLikePending: boolean;
  onCommentLike: (commentId: number) => void;
  onReplyToggle: (commentId: number) => void;
  onReplyChange: (commentId: number, value: string) => void;
  onReplySubmit: (commentId: number) => void;
  onReplyCancel: () => void;
}

export function CommentItem({
  comment,
  depth = 0,
  canInteract,
  activeReplyId,
  replyDraft,
  isReplyPending,
  isCommentLikePending,
  onCommentLike,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  onReplyCancel,
}: CommentItemProps) {
  const isReply = depth > 0;
  const likeCount = comment.likeCount ?? 0;
  const isReplyOpen = activeReplyId === comment.id;
  const isCommentLiked = Boolean(comment.likedByMe);

  return (
    <div
      className={`${
        depth === 0
          ? 'border-b border-gray-100 pb-6 last:border-b-0 last:pb-0'
          : 'pl-10 pt-4'
      }`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          {isReply ? <CornerDownRight className="h-4 w-4 text-gray-300" /> : null}
          <ProfileAvatar
            src={comment.authorProfileImageUrl}
            alt={comment.author}
            size={isReply ? 'sm' : 'md'}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{comment.author}</p>
              <p className="text-xs text-gray-500">{comment.timeAgo}</p>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-gray-700 leading-relaxed">
            {comment.content}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <button
              onClick={() => onCommentLike(comment.id)}
              disabled={!canInteract || isCommentLikePending}
              className={`flex items-center gap-1 transition-colors hover:text-red-500 ${
                isCommentLiked ? 'text-red-500' : ''
              } ${!canInteract ? 'cursor-not-allowed text-gray-400 hover:text-gray-400' : ''}`}
            >
              <Heart
                className={`h-4 w-4 ${isCommentLiked ? 'fill-red-500 text-red-500' : ''}`}
              />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={() => onReplyToggle(comment.id)}
              disabled={!canInteract}
              className="flex items-center gap-1 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              답글 달기
            </button>
          </div>

          {isReplyOpen && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Textarea
                value={replyDraft}
                onChange={(e) => onReplyChange(comment.id, e.target.value)}
                placeholder="답글을 입력하세요"
                className="min-h-[80px]"
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
                  activeReplyId={activeReplyId}
                  replyDraft={replyDraft}
                  isReplyPending={isReplyPending}
                  isCommentLikePending={isCommentLikePending}
                  onCommentLike={onCommentLike}
                  onReplyToggle={onReplyToggle}
                  onReplyChange={onReplyChange}
                  onReplySubmit={onReplySubmit}
                  onReplyCancel={onReplyCancel}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}