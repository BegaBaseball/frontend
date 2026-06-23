import { lazy, Suspense } from 'react';

import ViewportDeferred from './ViewportDeferred';
import {
  MateDetailHostBlock,
  MateDetailIntroBlock,
  MateDetailReviewBlock,
  MateDetailSeatViewBlock,
} from './MateDetailReferenceBlocks';
import type { Party } from '../types/mate';

const LazyMateDetailReviewsSection = lazy(() => import('./MateDetailReviewsSection'));

interface MateDetailInfoSectionsProps {
  party: Party;
  routePartyId?: string;
  isHost: boolean;
  isApproved: boolean;
  summaryPolicyText: string;
  currentUserId: number | null;
  currentUserHandle?: string;
  onOpenHostProfile: () => void;
  onOpenSeatViewGuide: () => void;
  onOpenChat: () => void;
  onRequestReview: (target: { handle: string; name: string }) => void;
}

export default function MateDetailInfoSections({
  party,
  isHost,
  isApproved,
  summaryPolicyText,
  currentUserId,
  currentUserHandle,
  onOpenHostProfile,
  onOpenSeatViewGuide,
  onOpenChat,
  onRequestReview,
}: MateDetailInfoSectionsProps) {
  return (
    <>
      <MateDetailSeatViewBlock party={party} onOpenSeatViewGuide={onOpenSeatViewGuide} />
      <MateDetailHostBlock party={party} onOpenHostProfile={onOpenHostProfile} onOpenChat={onOpenChat} />
      <MateDetailIntroBlock party={party} summaryPolicyText={summaryPolicyText} />
      <MateDetailReviewBlock party={party} />

      {party.status === 'COMPLETED' && currentUserId && (isHost || isApproved) && (
        <ViewportDeferred
          rootMargin="0px 0px 240px 0px"
          fallback={<div className="min-h-[112px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60" />}
        >
          <Suspense fallback={null}>
            <LazyMateDetailReviewsSection
              partyId={party.id}
              partyStatus={party.status}
              partyHostHandle={party.hostHandle}
              partyHostName={party.hostName}
              currentUserId={currentUserId}
              currentUserHandle={currentUserHandle}
              isHost={isHost}
              sectionCardClass="border border-gray-200/90 bg-white dark:border-white/15 dark:bg-[#000000]"
              insetPanelClass="rounded-[13px] border border-gray-200/80 bg-gray-50 dark:border-border dark:bg-secondary/70"
              onRequestReview={onRequestReview}
            />
          </Suspense>
        </ViewportDeferred>
      )}
    </>
  );
}
