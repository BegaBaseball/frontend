import { memo } from 'react';

import TeamLogo from './TeamLogo';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { StatusBadge } from './ui/status-badge';
import { MateHeartIcon, MateShieldIcon, MateStarIcon, MateUsersIcon } from './icons/MateFlowIcons';
import type { BadgeType, Party } from '../types/mate';
import { KBO_STADIUMS } from '../utils/stadiumData';
import { formatGameDate, getHostAverageRating } from '../utils/mate';
import { getMateDDayLabel } from '../utils/mateDateLabels';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { getMateStatusBadgeMeta, type StatusBadgeMeta } from '../utils/statusBadgeMeta';
import { cn } from '../lib/utils';

interface MatePartyCardProps {
  party: Party;
  className?: string;
  todayKey: string;
  onClick: (party: Party) => void;
  onFavoriteToggle?: (party: Party) => void;
  favoriteUpdating?: boolean;
}

const isLegacyHostAvatarUrl = (url?: string) => {
  if (!url) return true;
  const normalized = url.toLowerCase();
  return (
    url.startsWith('/assets/')
    || url.startsWith('/src/assets/')
    || url.startsWith('blob:')
    || normalized.includes('/storage/v1/object/')
  );
};

const getZoneName = (stadiumName: string, sectionName: string) => {
  const stadium = Object.values(KBO_STADIUMS).find((item) =>
    stadiumName.includes(item.name) || item.name.includes(stadiumName),
  );
  if (stadium) {
    const zone = stadium.zones.find((item) => item.keywords.some((keyword) => sectionName.includes(keyword)));
    if (zone) {
      return zone.name;
    }
  }
  return sectionName;
};

const getBadgeIcon = (badge: BadgeType) => {
  if (badge === 'VERIFIED') return <MateShieldIcon className="h-3.5 w-3.5 shrink-0 text-primary" />;
  if (badge === 'TRUSTED') return <MateStarIcon className="h-3.5 w-3.5 shrink-0 text-primary" />;
  return null;
};

const getDayOfWeek = (dateStr: string) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return Number.isNaN(d.getTime()) ? '' : days[d.getDay()];
};

const formatCompactDate = (dateStr: string) => {
  // "2025-11-25" → "11.25"
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
  return dateStr;
};

const formatTicketAmount = (party: Party) => {
  const amount = party.status === 'SELLING' && party.price != null
    ? party.price
    : party.ticketPrice;

  if (amount == null) return '협의';
  if (amount === 0) return '무료';
  return `${amount.toLocaleString()}원`;
};

interface FavoriteToggleButtonProps {
  favorited?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
}

function FavoriteToggleButton({
  favorited = false,
  disabled = false,
  onToggle,
  className,
}: FavoriteToggleButtonProps) {
  const label = favorited ? '찜 해제' : '찜하기';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white text-gray-500 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:pointer-events-none disabled:opacity-60 dark:border-white/15 dark:bg-[#111111] dark:text-white dark:hover:bg-rose-950/35 dark:hover:text-rose-200',
        favorited && 'border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-400/30 dark:bg-rose-950/40 dark:text-rose-200',
        className,
      )}
      title={label}
    >
      <MateHeartIcon className={cn('h-4 w-4', favorited && 'fill-current')} />
    </button>
  );
}

function MatePartyCard({
  party,
  className,
  todayKey,
  onClick,
  onFavoriteToggle,
  favoriteUpdating = false,
}: MatePartyCardProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const dDayLabel = getMateDDayLabel(party.gameDate, todayKey);
  const dow = getDayOfWeek(party.gameDate);
  const compactDate = formatCompactDate(party.gameDate);
  const zoneName = getZoneName(party.stadium, party.section);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const hostAverageRating = getHostAverageRating(party);
  const hostBadgeIcon = getBadgeIcon(party.hostBadge);
  const hostAvatarSrc = isLegacyHostAvatarUrl(party.hostProfileImageUrl) ? undefined : party.hostProfileImageUrl;
  const priceLabel = formatTicketAmount(party);
  const showPrice = party.status === 'SELLING'
    || party.ticketPrice != null
    || party.price != null;
  const description = party.description?.trim();
  const favorited = Boolean(party.favorited);

  return (
    <div
      className={cn(
        'status-badge-hover-scope group relative flex w-full cursor-pointer flex-col gap-[10px] rounded-18 border border-gray-200/90 bg-white p-[14px] text-left transition-[transform,border-color,box-shadow] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(15,23,42,0.08),0_0_0_3px_rgba(45,95,79,0.08)]',
        'dark:border-white/15 dark:bg-[#000000] dark:hover:border-primary',
        className,
      )}
    >
      <FavoriteToggleButton
        favorited={favorited}
        disabled={favoriteUpdating}
        onToggle={() => onFavoriteToggle?.(party)}
        className="absolute right-3 top-3 z-10"
      />
      <button
        type="button"
        aria-label={`${zoneName} ${stadiumDisplayName} ${formatGameDate(party.gameDate)} ${statusMeta.accessibleLabel} 파티 상세 보기`}
        onClick={() => onClick(party)}
        className="flex w-full flex-col gap-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#000000]"
      >
        {/* Row 1: D-day · date+time · status chip */}
        <div className="flex items-center gap-2 pr-10">
          <span className="shrink-0 text-15 font-black tracking-tight text-primary dark:text-primary-light">
            {dDayLabel || compactDate}
          </span>
          <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="min-w-0 flex-1 truncate text-13 font-bold text-gray-900 dark:text-white">
            {compactDate}({dow}) {party.gameTime}
          </span>
          <StatusBadge {...statusMeta} size="xs" />
        </div>

        {/* Row 2: away VS home · venue */}
        <div className="flex items-center gap-2.5">
          <TeamLogo teamId={party.awayTeam} size={32} className="shrink-0" />
          <span className="shrink-0 text-12 font-extrabold text-slate-400 dark:text-white">VS</span>
          <TeamLogo teamId={party.homeTeam} size={32} className="shrink-0" />
          <div className="ml-1 min-w-0 flex-1">
            <p className="flex items-center gap-1 text-13 font-bold text-gray-900 dark:text-white">
              {party.ticketVerified ? (
                <MateShieldIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : null}
              <span className="truncate">{stadiumDisplayName}</span>
            </p>
            <p className="truncate text-12 font-semibold text-gray-500 dark:text-white">
              {zoneName}
              {showPrice ? <span className="text-gray-400 dark:text-white"> · {priceLabel}</span> : null}
            </p>
          </div>
        </div>

        {/* Row 3: host · trust · participant count */}
        <div className="border-t border-gray-100 pt-2.5 dark:border-white/8">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200 dark:ring-white/10">
              <ProfileAvatar
                src={hostAvatarSrc}
                alt={party.hostName}
                fallbackName={party.hostName}
                width={24}
                height={24}
                className="h-full w-full"
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-13 font-bold text-gray-900 dark:text-white">
              {party.hostName}
            </span>
            {hostBadgeIcon}
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-12 font-extrabold text-primary [font-variant-numeric:tabular-nums] dark:bg-primary/15 dark:text-primary-light">
              <MateUsersIcon className="h-3.5 w-3.5" />
              {party.currentParticipants}/{party.maxParticipants}명
            </span>
          </div>
          <div className="mt-1 pl-8 text-12 font-semibold text-gray-500 dark:text-white">
            신뢰도 {hostAverageRating ?? '-'}
          </div>
        </div>

        {/* Hover-revealed party intro (desktop pointer only); uses existing party.description */}
        {description ? (
          <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out group-hover:mt-1 group-hover:grid-rows-[1fr] group-hover:opacity-100 [@media(hover:none)]:hidden">
            <div className="overflow-hidden">
              <div className="flex items-start gap-2 rounded-10 bg-primary/[0.06] px-3 py-2.5 text-12 font-semibold leading-relaxed text-gray-600 dark:bg-primary/10 dark:text-white">
                <MateStarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="line-clamp-2">
                  <strong className="font-extrabold text-gray-800 dark:text-white">파티 소개</strong> {description}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </button>
    </div>
  );
}

const areMatePartyCardPropsEqual = (prev: MatePartyCardProps, next: MatePartyCardProps) => (
  prev.className === next.className
  && prev.onClick === next.onClick
  && prev.onFavoriteToggle === next.onFavoriteToggle
  && prev.favoriteUpdating === next.favoriteUpdating
  && prev.todayKey === next.todayKey
  && prev.party.id === next.party.id
  && prev.party.status === next.party.status
  && prev.party.gameDate === next.party.gameDate
  && prev.party.gameTime === next.party.gameTime
  && prev.party.stadium === next.party.stadium
  && prev.party.homeTeam === next.party.homeTeam
  && prev.party.awayTeam === next.party.awayTeam
  && prev.party.section === next.party.section
  && prev.party.maxParticipants === next.party.maxParticipants
  && prev.party.currentParticipants === next.party.currentParticipants
  && prev.party.description === next.party.description
  && prev.party.ticketVerified === next.party.ticketVerified
  && prev.party.favorited === next.party.favorited
  && prev.party.price === next.party.price
  && prev.party.ticketPrice === next.party.ticketPrice
  && prev.party.hostName === next.party.hostName
  && prev.party.hostBadge === next.party.hostBadge
  && prev.party.hostProfileImageUrl === next.party.hostProfileImageUrl
  && prev.party.hostAverageRating === next.party.hostAverageRating
  && prev.party.hostReviewCount === next.party.hostReviewCount
);

export default memo(MatePartyCard, areMatePartyCardPropsEqual);

interface MatePartyRowProps {
  party: Party;
  todayKey: string;
  onClick: (party: Party) => void;
  onFavoriteToggle?: (party: Party) => void;
  favoriteUpdating?: boolean;
}

const buildPartyAriaLabel = (party: Party, statusMeta: StatusBadgeMeta) =>
  `${getZoneName(party.stadium, party.section)} ${formatStadiumDisplayName(party.stadium)} ${formatGameDate(party.gameDate)} ${statusMeta.accessibleLabel} 파티 상세 보기`;

const rowSurfaceClass =
  'status-badge-hover-scope group w-full cursor-pointer rounded-14 border border-gray-200/80 bg-white text-left transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 dark:border-white/15 dark:bg-[#000000]';

// List (row) view — table-density horizontal layout. Desktop-oriented.
function PartyRowBase({
  party,
  todayKey,
  onClick,
  onFavoriteToggle,
  favoriteUpdating = false,
}: MatePartyRowProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const dDayLabel = getMateDDayLabel(party.gameDate, todayKey);
  const dow = getDayOfWeek(party.gameDate);
  const compactDate = formatCompactDate(party.gameDate);
  const zoneName = getZoneName(party.stadium, party.section);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const hostAvatarSrc = isLegacyHostAvatarUrl(party.hostProfileImageUrl) ? undefined : party.hostProfileImageUrl;
  const priceLabel = formatTicketAmount(party);
  const showPrice = party.status === 'SELLING' || party.ticketPrice != null || party.price != null;
  const favorited = Boolean(party.favorited);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={buildPartyAriaLabel(party, statusMeta)}
        onClick={() => onClick(party)}
        className={cn(rowSurfaceClass, 'grid grid-cols-[68px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-3 p-3 pr-12')}
      >
        <div className="min-w-0">
          <div className="text-caption font-black tracking-tight text-primary dark:text-primary-light">{dDayLabel || compactDate}</div>
          <div className="truncate text-11 font-bold text-gray-500 dark:text-white">{compactDate} ({dow})</div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo teamId={party.awayTeam} size={24} className="shrink-0" />
          <span className="shrink-0 text-10 font-extrabold text-slate-400 dark:text-white">VS</span>
          <TeamLogo teamId={party.homeTeam} size={24} className="shrink-0" />
          <div className="ml-1 min-w-0">
            <div className="flex items-center gap-1 truncate text-13 font-bold text-gray-900 dark:text-white">
              {party.ticketVerified ? <MateShieldIcon className="h-3 w-3 shrink-0 text-primary" /> : null}
              <span className="truncate">{stadiumDisplayName}</span>
            </div>
            <div className="truncate text-11 font-semibold text-gray-500 dark:text-white">{party.gameTime}</div>
          </div>
        </div>
        <div className="min-w-0 truncate text-12 font-semibold text-gray-600 dark:text-white">
          {zoneName}
          {showPrice ? <span className="text-gray-400 dark:text-white"> · {priceLabel}</span> : null}
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200 dark:ring-white/10">
            <ProfileAvatar src={hostAvatarSrc} alt={party.hostName} fallbackName={party.hostName} width={24} height={24} className="h-full w-full" />
          </span>
          <span className="truncate text-12 font-bold text-gray-800 dark:text-white">{party.hostName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          <StatusBadge {...statusMeta} size="xs" />
          <span className="inline-flex items-center gap-1 text-12 font-extrabold text-primary [font-variant-numeric:tabular-nums] dark:text-primary-light">
            <MateUsersIcon className="h-3.5 w-3.5" />
            {party.currentParticipants}/{party.maxParticipants}
          </span>
        </div>
      </button>
      <FavoriteToggleButton
        favorited={favorited}
        disabled={favoriteUpdating}
        onToggle={() => onFavoriteToggle?.(party)}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

// Compact view — single-line dense row.
function PartyCompactBase({
  party,
  todayKey,
  onClick,
  onFavoriteToggle,
  favoriteUpdating = false,
}: MatePartyRowProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const dDayLabel = getMateDDayLabel(party.gameDate, todayKey);
  const compactDate = formatCompactDate(party.gameDate);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const favorited = Boolean(party.favorited);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={buildPartyAriaLabel(party, statusMeta)}
        onClick={() => onClick(party)}
        className={cn(rowSurfaceClass, 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 pr-12')}
      >
        <span className="w-[36px] shrink-0 text-12 font-black text-primary dark:text-primary-light">{dDayLabel || compactDate}</span>
        <TeamLogo teamId={party.awayTeam} size={20} className="shrink-0" />
        <span className="shrink-0 text-10 font-extrabold text-slate-400 dark:text-white">VS</span>
        <TeamLogo teamId={party.homeTeam} size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-12 font-bold text-gray-900 dark:text-white">{stadiumDisplayName}</span>
        <StatusBadge {...statusMeta} size="xs" />
        <span className="shrink-0 text-12 font-extrabold text-primary [font-variant-numeric:tabular-nums] dark:text-primary-light">
          {party.currentParticipants}/{party.maxParticipants}
        </span>
      </button>
      <FavoriteToggleButton
        favorited={favorited}
        disabled={favoriteUpdating}
        onToggle={() => onFavoriteToggle?.(party)}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

export const PartyRow = memo(PartyRowBase);
export const PartyCompact = memo(PartyCompactBase);
