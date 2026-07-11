import type { ReactNode } from 'react';

import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { Button } from './ui/plain-button';
import { ProfileAvatar } from './ui/ProfileAvatar';
import {
  MateBoxIcon,
  MateBulbIcon,
  MateCameraIcon,
  MateCheckCircleIcon,
  MateClockIcon,
  MateHeartIcon,
  MateInfoIcon,
  MateMapIcon,
  MateMapPinIcon,
  MateMessageSquareIcon,
  MatePulseIcon,
  MateQrCodeIcon,
  MateQuoteIcon,
  MateShieldIcon,
  MateStarIcon,
  MateThumbsUpIcon,
  MateUsersIcon,
  MateZapIcon,
} from './MateIcons';
import type { HostReviewSnippet, Party, ReviewKeywordSummary } from '../types/mate';
import { getTeamColorByAnyKey } from '../constants/teams';
import { extractHashtags, formatGameDate, formatHostAverageRating, getHostAverageRating, stripHashtags } from '../utils/mate';
import { getMateDDayLabel } from '../utils/mateDateLabels';
import { MATE_STATUS_BADGE_META } from '../utils/statusBadgeMeta';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { useSeatViewPhotos } from '../hooks/useSeatViewPhotos';

const joinClassNames = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const referenceCardClass = 'rounded-xl border border-gray-200/90 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card dark:shadow-[0_12px_32px_rgba(0,0,0,0.28)] sm:p-5';

const badgeToneClasses = {
  neutral: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-white',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-200',
  red: 'border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-950/35 dark:text-red-200',
  amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/35 dark:text-amber-200',
  blue: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-950/35 dark:text-blue-200',
  indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-950/35 dark:text-indigo-200',
};

const statusToneBadgeClass: Record<string, string> = {
  success: badgeToneClasses.emerald,
  danger: badgeToneClasses.red,
  warning: badgeToneClasses.amber,
  neutral: badgeToneClasses.neutral,
  violet: badgeToneClasses.indigo,
  info: badgeToneClasses.blue,
};

const formatAmount = (value: number) => `${value.toLocaleString()}원`;

const formatRelativeActivity = (lastActiveAt?: string | null) => {
  if (!lastActiveAt) return '최근 활동 확인 중';

  const lastActive = new Date(lastActiveAt);
  if (Number.isNaN(lastActive.getTime())) return '최근 활동 확인 중';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - lastActive.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes || 1}분 전 활동`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전 활동`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '어제 활동';
  if (diffDays < 30) return `${diffDays}일 전 활동`;
  return '최근 활동 있음';
};

const formatResponseTime = (minutes?: number | null) => {
  if (minutes == null) return '응답 데이터 수집 중';
  if (minutes < 60) return `평균 ${minutes}분 내 응답`;
  return `평균 ${Math.max(1, Math.round(minutes / 60))}시간 내 응답`;
};

const formatReviewDate = (createdAt?: string | null) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

export interface MateDetailReferenceViewModel {
  homeColor: string;
  gameDateLabel: string;
  gameDayLabel: string;
  gameDdayLabel: string;
  gameTimeLabel: string;
  stadiumLabel: string;
  homeTeamLabel: string;
  awayTeamLabel: string;
  sectionBadge: string;
  sectionLabel: string;
  seatDetailLabel: string;
  seatDescription: string;
  hostInitial: string;
  hostRatingLabel: string;
  hostReviewCount: number;
  hostCompletedCount: number;
  hostResponseLabel: string;
  hostActivityLabel: string;
  hostNoShowLabel: string;
  hostMannerLabel: string;
  hostPartiesLabel: string;
  goodFor: string[];
  prepared: string[];
  knowBefore: string[];
  vibeTags: string[];
  reviewSummary: ReviewKeywordSummary[];
  recentReviews: HostReviewSnippet[];
  remainingSeats: number;
  participationPercent: number;
  reservationDepositAmount: number;
  ticketAmount: number;
}

export const buildMateDetailViewModel = (
  party: Party,
  summaryPolicyText = '승인 후 채팅에서 장소 조율',
): MateDetailReferenceViewModel => {
  const hostTags = extractHashtags(party.description).map((tag) => tag.replace(/^#/, '')).filter(Boolean);
  const trustMetrics = party.hostTrustMetrics;
  const homeTeamLabel = resolveTeamDisplayName(party.homeTeam) || party.homeTeam;
  const awayTeamLabel = resolveTeamDisplayName(party.awayTeam) || party.awayTeam;
  const gameDate = new Date(party.gameDate);
  const gameDayLabel = Number.isNaN(gameDate.getTime())
    ? ''
    : gameDate.toLocaleDateString('ko-KR', { weekday: 'short' }).replace('요일', '');
  const remainingSeats = Math.max(0, party.maxParticipants - party.currentParticipants);
  const reservationDepositAmount = party.reservationDepositAmount || 0;
  const ticketAmount = party.status === 'SELLING' ? (party.price || 0) : (party.ticketPrice || 0);

  return {
    homeColor: getTeamColorByAnyKey(party.homeTeam),
    gameDateLabel: formatGameDate(party.gameDate),
    gameDayLabel,
    gameDdayLabel: getMateDDayLabel(party.gameDate),
    gameTimeLabel: party.gameTime.substring(0, 5),
    stadiumLabel: formatStadiumDisplayName(party.stadium),
    homeTeamLabel: homeTeamLabel.split(' ')[0],
    awayTeamLabel: awayTeamLabel.split(' ')[0],
    sectionBadge: party.section.split(' ')[0] || party.section,
    sectionLabel: party.section,
    seatDetailLabel: party.seatDetail?.trim() || formatStadiumDisplayName(party.stadium),
    seatDescription: '응원 분위기와 시야를 미리 확인하고 신청할 수 있는 좌석이에요.',
    hostInitial: party.hostName.trim().charAt(0) || 'H',
    hostRatingLabel: formatHostAverageRating(party),
    hostReviewCount: party.hostReviewCount || 0,
    hostCompletedCount: trustMetrics?.completedMateCount || 0,
    hostResponseLabel: formatResponseTime(trustMetrics?.averageResponseMinutes),
    hostActivityLabel: formatRelativeActivity(trustMetrics?.lastActiveAt),
    hostNoShowLabel: `최근 노쇼 ${trustMetrics?.recentNoShowCount || 0}건`,
    hostMannerLabel: getHostAverageRating(party) === null ? '매너 신규' : `매너 ${formatHostAverageRating(party)}`,
    hostPartiesLabel: `직관 ${trustMetrics?.completedMateCount || 0}회`,
    goodFor: hostTags.length > 0 ? hostTags.slice(0, 3) : ['응원 스타일이 맞는 분', '경기 전후 일정 조율 가능'],
    prepared: [party.ticketVerified ? '호스트 티켓 인증 완료' : '티켓 확인 필요', `${party.currentParticipants}/${party.maxParticipants}명 참여 현황 공개`],
    knowBefore: ['승인 후 채팅에서 장소 조율', summaryPolicyText],
    vibeTags: hostTags,
    reviewSummary: trustMetrics?.reviewKeywordSummary || [],
    recentReviews: trustMetrics?.recentHostReviews || [],
    remainingSeats,
    participationPercent: Math.min(100, Math.round((party.currentParticipants / party.maxParticipants) * 100)),
    reservationDepositAmount,
    ticketAmount,
  };
};

export function MateDetailReferenceCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={joinClassNames(referenceCardClass, className)}>
      {children}
    </div>
  );
}

function ReferenceBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={joinClassNames('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-12 font-bold', className)}>
      {children}
    </span>
  );
}

function SectionTitle({ icon, extra, children }: { icon: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3 sm:mb-4">
      <h3 className="flex items-center gap-2 text-body font-black text-gray-900 dark:text-white sm:text-17">
        <span className="text-primary">{icon}</span>
        {children}
      </h3>
      {extra}
    </div>
  );
}

export function MateDetailHeroBlock({ party, compact = false, favorited = false, onToggleFavorite }: { party: Party; compact?: boolean; favorited?: boolean; onToggleFavorite?: () => void }) {
  const view = buildMateDetailViewModel(party);
  const logoSize = compact ? 44 : 50;

  return (
    <div className="overflow-hidden rounded-18 border border-gray-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-white/10 dark:shadow-[0_12px_32px_rgba(0,0,0,0.30)]">
      <div
        className={joinClassNames('relative text-white', compact ? 'p-[18px]' : 'px-5 py-5 sm:px-6 sm:py-[22px]')}
        style={{ background: `linear-gradient(120deg, ${view.homeColor} 0%, ${view.homeColor}d9 50%, #1f2937 100%)` }}
      >
        <button
          type="button"
          aria-label={favorited ? '찜 해제' : '찜하기'}
          aria-pressed={favorited}
          onClick={onToggleFavorite}
          className="absolute right-3.5 top-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md transition-colors"
        >
          <MateHeartIcon className={joinClassNames('h-[17px] w-[17px]', favorited && 'fill-current text-rose-400')} />
        </button>
        <div className={joinClassNames('mb-4 flex flex-wrap items-center gap-2 sm:gap-2.5', compact && 'pr-10')}>
          <ReferenceBadge className="border-white/25 bg-black/30 text-white backdrop-blur-md">
            <MateClockIcon className="h-3 w-3" /> {view.gameDdayLabel || '경기 예정'}
          </ReferenceBadge>
          <span className="font-mono text-12 font-bold tracking-[0.03em] text-white/90 sm:text-13">
            {view.gameDateLabel}{view.gameDayLabel ? ` (${view.gameDayLabel})` : ''} · {view.gameTimeLabel}
          </span>
          <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-white/50" />
          <span className="inline-flex items-center gap-1 text-12 font-bold text-white/90 sm:text-13">
            <MateMapPinIcon className="h-3 w-3" /> {view.stadiumLabel}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3.5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-white p-[9px] shadow-[0_6px_14px_rgba(0,0,0,0.18)] dark:bg-white">
              <TeamLogo teamId={party.homeTeam} size={logoSize} />
            </div>
            <span className="text-caption font-black drop-shadow sm:text-body">{view.homeTeamLabel}</span>
          </div>
          <span className="text-18 font-black italic text-white/85 sm:text-22">VS</span>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-white p-[9px] shadow-[0_6px_14px_rgba(0,0,0,0.18)] dark:bg-white">
              <TeamLogo teamId={party.awayTeam} size={logoSize} />
            </div>
            <span className="text-caption font-black drop-shadow sm:text-body">{view.awayTeamLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MateDetailSeatViewBlock({ party, onOpenSeatViewGuide }: { party: Party; onOpenSeatViewGuide: () => void }) {
  const view = buildMateDetailViewModel(party);
  const seatDetail = party.seatDetail?.trim();
  const { photos } = useSeatViewPhotos(party.stadium, party.section, seatDetail ? [seatDetail] : []);

  return (
    <MateDetailReferenceCard>
      <SectionTitle
        icon={<MateMapPinIcon className="h-4 w-4" />}
        extra={<ReferenceBadge className={badgeToneClasses.red}>{view.sectionBadge}</ReferenceBadge>}
      >
        좌석 · 시야
      </SectionTitle>
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch">
        <div className="relative flex min-h-[104px] w-full shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-blue-900/30 dark:text-blue-200 sm:w-[104px]">
          <MateMapIcon className="h-12 w-12" aria-hidden="true" />
          <span className="text-11 font-bold">구장 배치도</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-15 font-black text-gray-900 dark:text-white">{view.sectionLabel}</p>
          <p className="mb-2.5 text-13 text-gray-500 dark:text-white/60">{view.seatDetailLabel}</p>
          <p className="mb-3 text-13 leading-[1.55] text-gray-600 dark:text-white/70">{view.seatDescription}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button data-testid="mate-open-seat-panel" className="inline-flex h-auto items-center gap-1.5 rounded-9 bg-primary px-[13px] py-2 text-13 font-bold text-white hover:bg-primary-hover" onClick={onOpenSeatViewGuide}>
              <MateCameraIcon className="h-3.5 w-3.5" />
              {photos.length > 0 ? `실제 시야 사진 ${photos.length}장` : '실제 시야 사진 보기'}
            </Button>
            <Button variant="outline" className="h-auto rounded-9 border-gray-300 px-[13px] py-2 text-13 font-bold text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" onClick={onOpenSeatViewGuide}>
              공식 배치도
            </Button>
          </div>
        </div>
      </div>
    </MateDetailReferenceCard>
  );
}

export function MateDetailHostBlock({ party, onOpenHostProfile, onOpenChat }: { party: Party; onOpenHostProfile: () => void; onOpenChat: () => void }) {
  const view = buildMateDetailViewModel(party);
  const rating = getHostAverageRating(party);

  return (
    <MateDetailReferenceCard>
      <div className="mb-3.5 flex items-start gap-3.5">
        <div className="relative shrink-0">
          <ProfileAvatar
            src={party.hostProfileImageUrl ?? undefined}
            alt={party.hostName}
            fallbackName={view.hostInitial}
            width={56}
            height={56}
            showRing
            ringClassName="p-0.5 bg-white border border-white shadow-[0_4px_12px_rgba(0,0,0,0.10)] dark:border-white/15 dark:bg-[#000000]"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-[21px] w-[21px] items-center justify-center rounded-full border-[2.5px] border-white bg-green-600 text-white dark:border-[#000000]">
            <MateCheckCircleIcon className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-17 font-black text-gray-900 dark:text-white">{party.hostName}</span>
            <span className="inline-flex items-center gap-1 text-caption font-black text-gray-900 dark:text-white">
              <MateStarIcon className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> {rating === null ? '신규' : view.hostRatingLabel}
            </span>
            <span className="text-13 font-semibold text-gray-400 dark:text-white/55">· 후기 {view.hostReviewCount} · 성사 {view.hostCompletedCount}회</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ReferenceBadge className={badgeToneClasses.emerald}><MateShieldIcon className="h-3 w-3" /> {party.ticketVerified ? '티켓 인증' : '인증 확인 전'}</ReferenceBadge>
            <ReferenceBadge className={badgeToneClasses.neutral}>{view.hostMannerLabel}</ReferenceBadge>
            <ReferenceBadge className={badgeToneClasses.neutral}>{view.hostPartiesLabel}</ReferenceBadge>
          </div>
        </div>
      </div>
      <div className="mb-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-col items-start gap-1 rounded-11 border border-amber-100 bg-amber-50 p-2.5 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/35 dark:text-amber-200"><MateZapIcon className="h-3.5 w-3.5" /><p className="text-[11.5px] font-bold leading-[1.3]">{view.hostResponseLabel}</p></div>
        <div className="flex flex-col items-start gap-1 rounded-11 border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-200"><MatePulseIcon className="h-3.5 w-3.5" /><p className="text-[11.5px] font-bold leading-[1.3]">{view.hostActivityLabel}</p></div>
        <div className="flex flex-col items-start gap-1 rounded-11 border border-blue-100 bg-blue-50 p-2.5 text-blue-700 dark:border-blue-400/20 dark:bg-blue-950/35 dark:text-blue-200"><MateShieldIcon className="h-3.5 w-3.5" /><p className="text-[11.5px] font-bold leading-[1.3]">{view.hostNoShowLabel}</p></div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="h-auto flex-1 rounded-9 border border-[#cce8dd] bg-[#f0f9f6] px-3 py-2.5 text-13 font-bold text-primary hover:bg-[#e7f5ef] dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/40" onClick={onOpenChat}>
          <MateMessageSquareIcon className="h-3.5 w-3.5" /> 호스트에게 문의
        </Button>
        <Button variant="outline" className="h-auto rounded-9 border-gray-200 px-4 py-2.5 text-13 font-bold text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" onClick={onOpenHostProfile}>
          프로필
        </Button>
      </div>
    </MateDetailReferenceCard>
  );
}

export function MateDetailIntroBlock({ party, summaryPolicyText }: { party: Party; summaryPolicyText: string }) {
  const view = buildMateDetailViewModel(party, summaryPolicyText);
  const introText = stripHashtags(party.description).trim();
  const groups = [
    { title: '이런 분이면 좋아요', items: view.goodFor, icon: <MateThumbsUpIcon className="h-3.5 w-3.5" />, tone: 'text-primary dark:text-emerald-200', iconTone: 'text-primary dark:text-emerald-300', bg: 'bg-[#f0f9f6] dark:bg-emerald-950/35' },
    { title: '준비된 것', items: view.prepared, icon: <MateBoxIcon className="h-3.5 w-3.5" />, tone: 'text-blue-700 dark:text-blue-200', iconTone: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/35' },
    { title: '알고 오면 좋아요', items: view.knowBefore, icon: <MateBulbIcon className="h-3.5 w-3.5" />, tone: 'text-amber-700 dark:text-amber-200', iconTone: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/35' },
  ];

  return (
    <MateDetailReferenceCard>
      <SectionTitle icon={<MateInfoIcon className="h-4 w-4" />}>파티 소개</SectionTitle>
      {introText ? <p className="mb-4 text-caption leading-[1.65] text-gray-600 dark:text-white/70">{introText}</p> : null}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="mb-2 flex items-center gap-1.5">
              <span className={joinClassNames('flex h-[22px] w-[22px] items-center justify-center rounded-7', group.bg, group.tone)}>
                {group.icon}
              </span>
              <span className="text-[13.5px] font-black text-gray-900 dark:text-white">{group.title}</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
              {group.items.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-13 font-semibold text-gray-700 dark:text-white/80">
                  <MateCheckCircleIcon className={joinClassNames('h-3.5 w-3.5', group.iconTone)} /> {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {view.vibeTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
          {view.vibeTags.map((tag) => (
            <ReferenceBadge key={tag} className={badgeToneClasses.indigo}>#{tag}</ReferenceBadge>
          ))}
        </div>
      ) : null}
    </MateDetailReferenceCard>
  );
}

export function MateDetailReviewBlock({ party, onOpenHostReviews }: { party: Party; onOpenHostReviews?: () => void }) {
  const view = buildMateDetailViewModel(party);

  return (
    <MateDetailReferenceCard>
      <SectionTitle
        icon={<MateQuoteIcon className="h-4 w-4" />}
        extra={onOpenHostReviews ? (
          <button type="button" className="text-13 font-bold text-primary" onClick={onOpenHostReviews}>
            전체 {view.hostReviewCount} →
          </button>
        ) : null}
      >
        호스트 후기
      </SectionTitle>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {view.reviewSummary.length > 0 ? view.reviewSummary.map((summary) => (
          <span key={summary.label} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-13 font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
            {summary.label} <b className="font-black text-primary">{summary.count}</b>
          </span>
        )) : (
          <span className="text-13 font-semibold text-gray-400 dark:text-white/55">후기 키워드가 쌓이면 먼저 보여줍니다.</span>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {view.recentReviews.length > 0 ? view.recentReviews.map((review) => (
          <div key={`${review.reviewerHandle ?? 'review'}-${review.createdAt}`} className="rounded-13 border border-gray-200/80 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-caption font-bold text-gray-900 dark:text-white">{review.reviewerHandle ? `@${review.reviewerHandle}` : '익명 메이트'}</span>
              <span className="inline-flex items-center gap-0.5 text-yellow-500" aria-label={`별점 ${Math.max(1, Math.min(5, review.rating || 0))}점`}>
                {Array.from({ length: Math.max(1, Math.min(5, review.rating || 0)) }).map((_, starIndex) => (
                  <MateStarIcon key={starIndex} className="h-3 w-3 fill-yellow-500" />
                ))}
              </span>
              <span className="ml-auto text-12 text-gray-400 dark:text-white/55">{formatReviewDate(review.createdAt)}</span>
            </div>
            {review.comment ? <p className="m-0 text-caption leading-[1.6] text-gray-600 dark:text-white/70">{review.comment}</p> : null}
          </div>
        )) : (
          <div className="rounded-13 border border-gray-200/80 bg-gray-50 px-4 py-3 text-caption text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white">
            대표 후기가 쌓이면 이곳에 노출됩니다.
          </div>
        )}
      </div>
    </MateDetailReferenceCard>
  );
}

export function MateDetailParticipationBlock({ party }: { party: Party }) {
  const view = buildMateDetailViewModel(party);
  const statusMeta = MATE_STATUS_BADGE_META[party.status];
  const statusBadgeClass = statusToneBadgeClass[statusMeta.tone] ?? badgeToneClasses.neutral;
  const roster = party.members ?? [];
  const filledCount = roster.length > 0 ? roster.length : party.currentParticipants;
  const members = Array.from({ length: party.maxParticipants }).map((_, index) => {
    const member = roster[index];
    return {
      filled: index < filledCount,
      initial: member?.initial ?? (index === 0 ? view.hostInitial : 'M'),
      role: member?.role ?? (index === 0 ? '호스트' : index < party.currentParticipants ? '메이트' : '빈자리'),
      profileImageUrl: member?.profileImageUrl ?? null,
    };
  });

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-black text-gray-900 dark:text-white"><MateUsersIcon className="h-4 w-4 text-primary" /> 참여 현황</span>
        <ReferenceBadge className={statusBadgeClass}>{statusMeta.tone === 'success' ? <MateCheckCircleIcon className="h-3 w-3" /> : null}{statusMeta.label}</ReferenceBadge>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {members.map((member, index) => (
          <div key={index} className={joinClassNames('flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-3', member.filled ? 'border border-gray-200/90 bg-white dark:border-white/10 dark:bg-white/5' : 'border border-dashed border-gray-300 bg-gray-50 dark:border-white/15 dark:bg-white/[0.03]')}>
            <div className={joinClassNames('flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-full text-15 font-black', member.filled ? 'bg-[#e8f5f0] text-primary shadow-sm dark:bg-emerald-950/45 dark:text-emerald-200' : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white')}>
              {member.filled
                ? (member.profileImageUrl
                    ? <ProfileAvatar src={member.profileImageUrl} alt={member.role} fallbackName={member.initial} width={40} height={40} />
                    : member.initial)
                : '+'}
            </div>
            <span className={joinClassNames('max-w-full truncate text-11 font-bold', member.filled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/55')}>{member.role}</span>
          </div>
        ))}
      </div>
      <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#3d7d68]" style={{ width: `${view.participationPercent}%` }} />
      </div>
      <p className="m-0 text-center text-12 text-gray-500 dark:text-white/60"><b className="text-red-600 dark:text-red-400">{view.remainingSeats}자리</b> 남았어요 · {party.currentParticipants}/{party.maxParticipants}명</p>
    </div>
  );
}

export function MateDetailPriceBox({ party }: { party: Party }) {
  const view = buildMateDetailViewModel(party);

  return (
    <div className="min-w-0 overflow-hidden rounded-13 border border-gray-200 dark:border-white/10">
      {view.reservationDepositAmount > 0 ? (
        <div className="flex items-center justify-between gap-2.5 bg-[#f0f9f6] px-3.5 py-3 dark:bg-emerald-950/35">
          <div className="min-w-0">
            <p className="m-0 truncate whitespace-nowrap text-[11.5px] font-bold tracking-[0.02em] text-primary dark:text-emerald-200">지금 필요한 금액 · 예약금</p>
            <p className="m-0 mt-0.5 truncate whitespace-nowrap text-11 text-[#5e8378] dark:text-emerald-300/80">승인 후 결제 · 노쇼 방지용</p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-18 font-black text-primary dark:text-emerald-200">{formatAmount(view.reservationDepositAmount)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2.5 bg-white px-3.5 py-3 dark:bg-white/5">
        <div className="min-w-0">
          <p className="m-0 truncate whitespace-nowrap text-[11.5px] font-bold text-gray-500 dark:text-white/60">{party.status === 'SELLING' ? '티켓 판매가' : '현장 정산 예정 · 티켓'}</p>
          <p className="m-0 mt-0.5 truncate whitespace-nowrap text-11 text-gray-400 dark:text-white/55">거래 완료 후 정산</p>
        </div>
        <span className="shrink-0 whitespace-nowrap text-body font-black text-gray-700 dark:text-white/80">{formatAmount(view.ticketAmount)}</span>
      </div>
    </div>
  );
}

export function MateDetailQrHint({ canAccessCheckIn, onOpenQrPanel }: { canAccessCheckIn: boolean; onOpenQrPanel: () => void }) {
  return (
    <button
      type="button"
      onClick={canAccessCheckIn ? onOpenQrPanel : undefined}
      data-testid="mate-open-qr-panel"
      className="flex w-full items-center gap-3 rounded-14 border border-dashed border-purple-200 bg-purple-50 px-3.5 py-3 text-left dark:border-purple-900/50 dark:bg-purple-950/20"
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-10 bg-white text-purple-700 shadow-sm dark:bg-card dark:text-purple-200">
        <MateQrCodeIcon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[12.5px] font-black text-purple-800 dark:text-purple-200">체크인 QR</span>
        <span className="block text-[11.5px] leading-[1.4] text-purple-700 dark:text-purple-300">
          {canAccessCheckIn ? '참여 확정 후 바로 열 수 있어요' : '참여 확정 후 채팅·예약 상세에서 열려요'}
        </span>
      </span>
    </button>
  );
}
