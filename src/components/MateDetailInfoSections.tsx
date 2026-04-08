import { lazy, Suspense, type ReactNode } from 'react';
import { Info, MapPin, MessageSquare, Shield, Star } from 'lucide-react';

import AdSlot from './ads/AdSlot';
import ViewportDeferred from './ViewportDeferred';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import type { Party } from '../types/mate';
import {
  extractHashtags,
  formatHostAverageRating,
  getHostAverageRating,
  stripHashtags,
} from '../utils/mate';

const LazyMateDetailReviewsSection = lazy(() => import('./MateDetailReviewsSection'));

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
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[16px] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface MateDetailInfoSectionsProps {
  party: Party;
  routePartyId?: string;
  isHost: boolean;
  isApproved: boolean;
  currentUserId: number | null;
  currentUserHandle?: string;
  sectionCardClass: string;
  insetPanelClass: string;
  getSeatBadgeColor: (section: string) => string;
  onOpenHostProfile: () => void;
  onOpenSeatViewGuide: () => void;
  onRequestReview: (target: { handle: string; name: string }) => void;
}

export default function MateDetailInfoSections({
  party,
  routePartyId,
  isHost,
  isApproved,
  currentUserId,
  currentUserHandle,
  sectionCardClass,
  insetPanelClass,
  getSeatBadgeColor,
  onOpenHostProfile,
  onOpenSeatViewGuide,
  onRequestReview,
}: MateDetailInfoSectionsProps) {
  const hostTags = extractHashtags(party.description);
  const mannerScore = getHostAverageRating(party);
  const mannerScoreLabel = formatHostAverageRating(party);
  const tradeLabel = party.status === 'SELLING' ? '티켓 양도' : '메이트 팟';

  return (
    <>
      <Card className={`p-6 ${sectionCardClass}`}>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
          <Info className="w-5 h-5 text-primary" /> 비용 안내
        </h3>
        <div className={`${insetPanelClass} p-5`}>
          {party.status === 'SELLING' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-600 dark:text-gray-300">티켓 판매가</span>
                <span className="text-xl font-bold text-orange-600">
                  {party.price?.toLocaleString()}원
                </span>
              </div>
              <div className="my-2 h-px w-full bg-gray-200 dark:bg-border" aria-hidden="true" />
              <p className="text-[16px] text-blue-700 dark:text-blue-300">
                직거래 안내: 승인 후 채팅에서 거래 시간과 장소를 조율하고 당사자 간 직접 거래합니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">티켓 가격</span>
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {(party.ticketPrice || 0).toLocaleString()}원
                </span>
              </div>
              <div className="my-2 h-px w-full bg-gray-200 dark:bg-border" aria-hidden="true" />
              <p className="text-[16px] text-blue-700 dark:text-blue-300">
                직거래 안내: 승인 후 채팅에서 거래 시간과 장소를 조율하고 당사자 간 직접 거래합니다.
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className={`${insetPanelClass} p-4`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">정책 안내</p>
            <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
              플랫폼 결제/환불 없이 승인 후 채팅으로 직거래를 조율합니다.
            </p>
          </div>
          <div className={`${insetPanelClass} p-4`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">다음 단계</p>
            <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
              {isHost
                ? '신청 관리에서 승인 여부를 결정하고, 이후 채팅이나 체크인으로 흐름을 이어갈 수 있습니다.'
                : '상태에 따라 승인 대기, 채팅 입장, 체크인 준비로 이어집니다.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className={`p-5 sm:p-6 ${sectionCardClass}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 sm:items-center">
            <ProfileAvatar
              src={party.hostProfileImageUrl ?? undefined}
              alt={party.hostName}
              fallbackName={party.hostName}
              width={80}
              height={80}
              showRing
              ringClassName="p-1 bg-white/95 dark:bg-secondary/90 border border-white/60 dark:border-white/10 shadow-lg"
            />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">Host Trust</p>
              <button
                type="button"
                className="mt-1 text-left text-xl font-black text-gray-900 dark:text-white"
                onClick={onOpenHostProfile}
              >
                {party.hostName}
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <InlineBadge className="dark:border-border dark:text-gray-200">
                  <Star className={`w-3 h-3 ${mannerScore === null ? 'text-gray-400' : 'text-yellow-500 fill-yellow-500'}`} />
                  {mannerScore === null ? mannerScoreLabel : `평점 ${mannerScoreLabel}`}
                </InlineBadge>
                <InlineBadge className={`${party.ticketVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200' : 'dark:border-border dark:text-gray-200'}`}>
                  <Shield className="w-3 h-3" />
                  {party.ticketVerified ? '티켓 인증' : '인증 확인 전'}
                </InlineBadge>
                <InlineBadge className="border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-900/50 dark:bg-purple-950/35 dark:text-purple-200">
                  {tradeLabel}
                </InlineBadge>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 sm:w-auto" onClick={onOpenHostProfile}>
            프로필 보기
          </Button>
        </div>
      </Card>

      <Card className={`p-6 ${sectionCardClass}`}>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
          <MessageSquare className="w-5 h-5 text-primary" /> 파티 소개
        </h3>
        <p className="mb-4 whitespace-pre-wrap text-[16px] leading-relaxed text-gray-600 dark:text-gray-300 md:text-base">
          {stripHashtags(party.description)}
        </p>
        {hostTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hostTags.map((tag, i) => (
              <InlineBadge key={i} className="border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                {tag}
              </InlineBadge>
            ))}
          </div>
        )}
      </Card>

      <Card className={`p-6 overflow-hidden ${sectionCardClass}`}>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
          <MapPin className="w-5 h-5 text-primary" /> 좌석 시야
        </h3>
        <div className={`${insetPanelClass} p-5`}>
          <p className="text-[16px] leading-relaxed text-gray-600 dark:text-gray-300">
            경기장 구역 설명과 실제 좌석 시야 사진은 보조 패널에서 확인할 수 있습니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <InlineBadge className={getSeatBadgeColor(party.section)}>
              {party.section.split(' ')[0]}
            </InlineBadge>
            <InlineBadge className="dark:border-border dark:text-gray-200">
              <MapPin className="h-3 w-3" />
              {party.stadium}
            </InlineBadge>
          </div>
          <Button
            variant="outline"
            className="mt-4 border-primary text-primary hover:bg-primary/10"
            onClick={onOpenSeatViewGuide}
          >
            좌석/구역 보기
          </Button>
        </div>
      </Card>

      {party.status === 'COMPLETED' && currentUserId && (isHost || isApproved) && (
        <ViewportDeferred
          rootMargin="0px 0px 240px 0px"
          fallback={<div className={`min-h-[112px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60`} />}
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
              sectionCardClass={sectionCardClass}
              insetPanelClass={insetPanelClass}
              onRequestReview={onRequestReview}
            />
          </Suspense>
        </ViewportDeferred>
      )}

      <AdSlot
        slotId="mate_detail_1"
        pageType="mate_detail"
        contentId={party.id ? String(party.id) : (routePartyId ?? null)}
        creativeType="sponsor_card"
        loggedIn={Boolean(currentUserId)}
        userId={currentUserId ? String(currentUserId) : null}
        wave="ads_wave2"
        minHeight={176}
        className="mt-4"
      />
    </>
  );
}
