import TeamLogo from './TeamLogo';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { MateShieldIcon, MateStarIcon, MateUsersIcon } from './MateIcons';
import type { BadgeType, Party } from '../types/mate';
import { KBO_STADIUMS } from '../utils/stadiumData';
import { formatGameDate, getHostAverageRating } from '../utils/mate';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { cn } from '../lib/utils';

interface MatePartyCardProps {
  party: Party;
  className?: string;
  onClick: (party: Party) => void;
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

const getGameDayLabel = (gameDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(gameDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'D-Day';
  if (diff < 0) return '';
  if (diff > 999) return '예정';
  return `D-${diff}`;
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

type StatusMeta = { label: string; accessibleLabel: string; chip: string };

const STATUS_META: Record<string, StatusMeta> = {
  PENDING: {
    label: '모집 중',
    accessibleLabel: '신청 가능',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  },
  MATCHED: {
    label: '매칭 완료',
    accessibleLabel: '매칭된',
    chip: 'bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950/55 dark:text-emerald-200 dark:border-emerald-900/60',
  },
  SELLING: {
    label: '티켓 판매',
    accessibleLabel: '판매 가능',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  },
  FAILED: {
    label: '매칭 실패',
    accessibleLabel: '마감',
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
  },
  CHECKED_IN: {
    label: '체크인',
    accessibleLabel: '체크인',
    chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50',
  },
  COMPLETED: {
    label: '관람 완료',
    accessibleLabel: '완료',
    chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  },
  SOLD: {
    label: '판매 완료',
    accessibleLabel: '마감',
    chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  },
};

const DEFAULT_STATUS_META: StatusMeta = {
  label: '마감',
  accessibleLabel: '마감',
  chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
};

export default function MatePartyCard({ party, className, onClick }: MatePartyCardProps) {
  const statusMeta = STATUS_META[party.status] ?? DEFAULT_STATUS_META;
  const dDayLabel = getGameDayLabel(party.gameDate);
  const dow = getDayOfWeek(party.gameDate);
  const compactDate = formatCompactDate(party.gameDate);
  const zoneName = getZoneName(party.stadium, party.section);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const hostAverageRating = getHostAverageRating(party);
  const hostBadgeIcon = getBadgeIcon(party.hostBadge);
  const hostAvatarSrc = isLegacyHostAvatarUrl(party.hostProfileImageUrl) ? undefined : party.hostProfileImageUrl;
  const priceLabel = formatTicketAmount(party);
  const showPrice = party.status === 'SELLING'
    || (party.ticketPrice != null && party.ticketPrice > 0)
    || party.price != null;
  const description = party.description?.trim();

  return (
    <button
      type="button"
      aria-label={`${zoneName} ${stadiumDisplayName} ${formatGameDate(party.gameDate)} ${statusMeta.accessibleLabel} 파티 상세 보기`}
      onClick={() => onClick(party)}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col gap-[10px] rounded-[18px] border border-gray-200/90 bg-white p-[14px] text-left transition-[transform,border-color,box-shadow] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(15,23,42,0.08),0_0_0_3px_rgba(45,95,79,0.08)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50',
        'dark:border-white/15 dark:bg-[#16181c] dark:hover:border-primary dark:focus-visible:ring-offset-[#0a0a0a]',
        className,
      )}
    >
      {/* Row 1: D-day · date+time · status chip */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[15px] font-black tracking-tight text-primary dark:text-primary-light">
          {dDayLabel || compactDate}
        </span>
        <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">
          {compactDate}({dow}) {party.gameTime}
        </span>
        <span className={cn('inline-flex shrink-0 items-center rounded-md border px-2 py-[2px] text-[11px] font-bold leading-5', statusMeta.chip)}>
          {statusMeta.label}
        </span>
      </div>

      {/* Row 2: away VS home · venue */}
      <div className="flex items-center gap-2.5">
        <TeamLogo teamId={party.awayTeam} size={32} className="shrink-0" />
        <span className="shrink-0 text-[12px] font-extrabold text-slate-400 dark:text-slate-500">VS</span>
        <TeamLogo teamId={party.homeTeam} size={32} className="shrink-0" />
        <div className="ml-1 min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[13px] font-bold text-gray-900 dark:text-zinc-100">
            {party.ticketVerified ? (
              <MateShieldIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : null}
            <span className="truncate">{stadiumDisplayName}</span>
          </p>
          <p className="truncate text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
            {zoneName}
            {showPrice ? <span className="text-gray-400 dark:text-zinc-500"> · {priceLabel}</span> : null}
          </p>
        </div>
      </div>

      {/* Row 3: host · trust · participant count */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-white/8">
        <ProfileAvatar
          src={hostAvatarSrc}
          alt={party.hostName}
          fallbackName={party.hostName}
          width={24}
          height={24}
          className="shrink-0 ring-1 ring-gray-200 dark:ring-white/10"
        />
        <span className="min-w-0 truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">
          {party.hostName}
        </span>
        {hostBadgeIcon}
        <span className="shrink-0 text-[12px] text-gray-300 dark:text-gray-600">·</span>
        <span className="shrink-0 text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
          신뢰도 {hostAverageRating ?? '-'}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[12px] font-extrabold text-primary [font-variant-numeric:tabular-nums] dark:bg-primary/15 dark:text-primary-light">
          <MateUsersIcon className="h-3.5 w-3.5" />
          {party.currentParticipants}/{party.maxParticipants}명
        </span>
      </div>

      {/* Hover-revealed party intro (desktop pointer only); uses existing party.description */}
      {description ? (
        <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out group-hover:mt-1 group-hover:grid-rows-[1fr] group-hover:opacity-100 [@media(hover:none)]:hidden">
          <div className="overflow-hidden">
            <div className="flex items-start gap-2 rounded-[10px] bg-primary/[0.06] px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-gray-600 dark:bg-primary/10 dark:text-zinc-300">
              <MateStarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">
                <strong className="font-extrabold text-gray-800 dark:text-zinc-100">파티 소개</strong> {description}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </button>
  );
}
