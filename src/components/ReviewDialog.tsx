import { useState } from 'react';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { api } from '../utils/api';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: number;
  reviewerId: number;
  reviewee: {
    id: number;
    name: string;
  };
  onSuccess: () => void;
}

export default function ReviewDialog({ isOpen, onClose, partyId, reviewerId, reviewee, onSuccess }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await api.createReview({
        partyId,
        reviewerId,
        revieweeId: reviewee.id,
        rating,
        comment: comment.trim() || undefined,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      const status = error.status;
      const msg = error.data?.message || error.message || '';

      if (status === 409 || msg.includes('duplicate') || msg.includes('이미') || msg.includes('Duplicate')) {
        toast.warning('이미 이 참여자에 대한 리뷰를 작성했습니다.');
      } else {
        toast.error(msg || '리뷰 작성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['', '별로예요', '아쉬워요', '괜찮아요', '좋았어요', '최고예요'];

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{reviewee.name}님에 대한 리뷰</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  onMouseEnter={() => setHoverRating(num)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${num <= (hoverRating || rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                      }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-500 h-5">
              {ratingLabels[hoverRating || rating] || '별점을 선택해주세요'}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="한줄 후기를 남겨주세요 (선택)"
              className="min-h-[80px]"
            />
            <span className="text-xs text-gray-400 text-right">{comment.length}/200</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            {isSubmitting ? '제출 중...' : '리뷰 제출'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
