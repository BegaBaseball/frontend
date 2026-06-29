import { type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { MateStarIcon } from './MateIcons';
import { getApiErrorStatus } from '../api/errorStatus';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyReviewsQueryOptions,
} from '../hooks/mateDetailRoute';
import { hasSameMateUserIdentity } from '../utils/mate';
import type { Application, PartyStatus } from '../types/mate';

interface MateDetailReviewTarget {
  handle: string;
  name: string;
}

interface MateDetailReviewsSectionProps {
  partyId: number;
  partyStatus: PartyStatus;
  partyHostHandle?: string;
  partyHostName: string;
  currentUserId: number | null;
  currentUserHandle?: string;
  isHost: boolean;
  sectionCardClass: string;
  insetPanelClass: string;
  onRequestReview: (target: MateDetailReviewTarget) => void;
}

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function InlineBadge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={joinClassNames(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-body font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function MateDetailReviewsSection({
  partyId,
  partyStatus,
  partyHostHandle,
  partyHostName,
  currentUserId,
  currentUserHandle,
  isHost,
  sectionCardClass,
  insetPanelClass,
  onRequestReview,
}: MateDetailReviewsSectionProps) {
  const reviewsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyReviewsQueryOptions(partyId)
      : getMatePartyReviewsQueryOptions('unknown')),
    enabled: Boolean(partyId && currentUserId && partyStatus === 'COMPLETED'),
  });
  const applicationsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(partyId && isHost && partyStatus === 'COMPLETED'),
  });

  useEffect(() => {
    if (reviewsQuery.error && getApiErrorStatus(reviewsQuery.error) !== 403) {
      toast.error('리뷰 정보를 불러오는데 실패했습니다.');
    }
  }, [reviewsQuery.error]);

  if (!currentUserId || partyStatus !== 'COMPLETED') {
    return null;
  }

  const reviews = Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [];
  const approvedApplications = Array.isArray(applicationsQuery.data)
    ? applicationsQuery.data.filter((app) => app.isApproved)
    : [];
  const targets = isHost
    ? approvedApplications
      .filter((app): app is Application & { applicantHandle: string } => Boolean(app.applicantHandle))
      .map((app) => ({
        handle: app.applicantHandle,
        name: app.applicantName,
      }))
    : (partyHostHandle
      ? [{
        handle: partyHostHandle,
        name: partyHostName,
      }]
      : []);

  return (
    <Card className={`p-4 ${sectionCardClass}`}>
      <h3 className="mb-3 flex items-center gap-1.5 text-body font-semibold text-gray-900 dark:text-white">
        <MateStarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        리뷰
      </h3>
      <div className="space-y-2">
        {targets.length === 0 ? (
          <p className="text-body text-gray-400">리뷰 대상이 없습니다.</p>
        ) : targets.map((target) => {
          const myReview = reviews.find(
            (review) => hasSameMateUserIdentity(
              { handle: review.reviewerHandle },
              { handle: currentUserHandle },
            ) && hasSameMateUserIdentity(
              { handle: review.revieweeHandle },
              target,
            ),
          );

          return (
            <div
              key={target.handle}
              className={`flex items-center justify-between p-3 ${insetPanelClass}`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-body font-semibold text-gray-900 dark:text-white">
                  {target.name}
                </span>
                {myReview && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <MateStarIcon
                        key={num}
                        className={`w-3.5 h-3.5 ${num <= myReview.rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                    {myReview.comment && (
                      <span className="ml-1 max-w-[120px] truncate text-body text-gray-500 dark:text-white/60">
                        "{myReview.comment}"
                      </span>
                    )}
                  </div>
                )}
              </div>
              {myReview ? (
                <InlineBadge className="text-gray-500 dark:border-border dark:text-white">
                  작성 완료
                </InlineBadge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-body border-primary text-primary hover:bg-primary/10"
                  onClick={() => onRequestReview(target)}
                >
                  리뷰 작성
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
