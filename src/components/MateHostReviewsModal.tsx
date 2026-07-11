import { useQuery } from '@tanstack/react-query';

import { fetchHostReviews } from '../api/mate';
import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';
import { MateDetailStarIcon as MateStarIcon } from './icons/MateDetailIcons';

interface MateHostReviewsModalProps {
  hostHandle: string;
  hostName?: string;
  onClose: () => void;
}

const formatReviewDate = (createdAt?: string | null) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function MateHostReviewsModal({ hostHandle, hostName, onClose }: MateHostReviewsModalProps) {
  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ['host-reviews', hostHandle],
    queryFn: () => fetchHostReviews(hostHandle),
    staleTime: 60_000,
    enabled: Boolean(hostHandle),
  });

  return (
    <PlainDialog
      open
      onClose={onClose}
      title={`${hostName ? `${hostName} 호스트 ` : '호스트 '}후기`}
      className="sm:max-w-lg"
      footer={(
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      )}
    >
      <div className="max-h-[60vh] space-y-2.5 overflow-y-auto py-1" data-testid="mate-host-reviews">
        {isLoading ? (
          <p className="py-6 text-center text-13 text-gray-500 dark:text-white/60">후기를 불러오는 중…</p>
        ) : isError ? (
          <p className="py-6 text-center text-13 text-gray-500 dark:text-white/60">후기를 불러오지 못했습니다.</p>
        ) : reviews.length === 0 ? (
          <p className="py-6 text-center text-13 text-gray-500 dark:text-white/60">아직 등록된 후기가 없어요.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-13 border border-gray-200/80 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-caption font-bold text-gray-900 dark:text-white">
                  {review.reviewerHandle ? `@${review.reviewerHandle}` : '익명 메이트'}
                </span>
                <span
                  className="inline-flex items-center gap-0.5 text-yellow-500"
                  aria-label={`별점 ${Math.max(1, Math.min(5, review.rating || 0))}점`}
                >
                  {Array.from({ length: Math.max(1, Math.min(5, review.rating || 0)) }).map((_, starIndex) => (
                    <MateStarIcon key={starIndex} className="h-3 w-3 fill-yellow-500" />
                  ))}
                </span>
                <span className="ml-auto text-12 text-gray-400 dark:text-white/55">{formatReviewDate(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p className="m-0 text-caption leading-[1.6] text-gray-600 dark:text-white/70">{review.comment}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </PlainDialog>
  );
}
