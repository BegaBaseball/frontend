import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { createReview } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { getApiErrorMessage } from '../utils/errorUtils';
import { MateStarIcon } from './icons/MateFlowIcons';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: number;
  reviewee: {
    handle: string;
    name: string;
  };
  onSuccess: () => void;
}

export default function ReviewDialog({ isOpen, onClose, partyId, reviewee, onSuccess }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await createReview({
        partyId,
        revieweeHandle: reviewee.handle,
        rating,
        comment: comment.trim() || undefined,
      });
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      const status = getApiErrorStatus(error);
      if (status === 409) {
        toast.warning('이미 이 참여자에 대한 리뷰를 작성했습니다.');
      } else {
        toast.error(getApiErrorMessage(error, '리뷰 작성에 실패했습니다. 다시 시도해주세요.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['', '별로예요', '아쉬워요', '괜찮아요', '좋았어요', '최고예요'];

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={handleClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4" onClick={handleClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
          className="w-full rounded-xl border bg-white shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card sm:max-w-[400px]"
        >
          <div className="border-b border-gray-100 px-5 py-4 dark:border-border">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {reviewee.name}님에 대한 리뷰
            </h2>
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-5 py-2">
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setRating(num)}
                      onMouseEnter={() => setHoverRating(num)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MateStarIcon
                        className={`h-8 w-8 transition-colors ${num <= (hoverRating || rating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-300'
                          }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="h-5 text-body text-gray-500">
                  {ratingLabels[hoverRating || rating] || '별점을 선택해주세요'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value.slice(0, 200))}
                  placeholder="한줄 후기를 남겨주세요 (선택)"
                  className="min-h-[80px] w-full resize-none rounded-md border border-input bg-input-background px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                />
                <span className="text-right text-body font-semibold text-gray-400">{comment.length}/200</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 dark:border-border sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 py-2 text-body font-semibold text-foreground transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-body font-semibold text-white transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90"
            >
              {isSubmitting ? '제출 중...' : '리뷰 제출'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
