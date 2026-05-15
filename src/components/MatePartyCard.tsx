import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { ProfileAvatar } from './ui/ProfileAvatar';
import {
  MateCloudIcon,
  MateCloudRainIcon,
  MateShieldIcon,
  MateStarIcon,
  MateSunIcon,
  MateUsersIcon,
} from './MateIcons';
import type { BadgeType, Party } from '../types/mate';
import { KBO_STADIUMS } from '../utils/stadiumData';
import {
  formatGameDate,
  formatHostAverageRating,
  getHostAverageRating,
} from '../utils/mate';
import { cn } from '../lib/utils';

type MatePartyCardVariant = 'compact' | 'rich';

interface MatePartyCardProps {
  party: Party;
  variant: MatePartyCardVariant;
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

const getWeatherIcon = (dateStr: string) => {
  const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const weatherTypes = [
    <MateSunIcon className="h-3.5 w-3.5 text-amber-400" />,
    <MateCloudIcon className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-400" />,
    <MateSunIcon className="h-3.5 w-3.5 text-amber-400" />,
    <MateCloudRainIcon className="h-3.5 w-3.5 text-blue-400" />,
  ];
  return weatherTypes[hash % 4];
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
  if (badge === 'VERIFIED') return <MateShieldIcon className="h-3.5 w-3.5 text-primary" />;
  if (badge === 'TRUSTED') return <MateStarIcon className="h-3.5 w-3.5 text-primary" />;
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

const getStatusConfig = (party: Party) => {
  if (party.status === 'PENDING') {
    return {
      label: '모집 중',
      bg: 'bg-primary/15',
      text: 'text-primary',
      border: 'border-primary/30',
      accessibleLabel: '신청 가능',
    };
  }

  if (party.status === 'SELLING') {
    return {
      label: '티켓 판매',
      bg: 'bg-primary/15',
      text: 'text-primary',
      border: 'border-primary/30',
      accessibleLabel: '판매 가능',
    };
  }

  if (party.status === 'MATCHED') {
    return {
      label: '매칭 완료',
      bg: 'bg-primary/12',
      text: 'text-primary',
      border: 'border-primary/30',
      accessibleLabel: '매칭된',
    };
  }

  return {
    label: '마감',
    bg: 'bg-primary/8',
    text: 'text-primary/80',
    border: 'border-primary/20',
    accessibleLabel: '마감',
  };
};

const getCompactStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
    case 'SELLING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
    case 'MATCHED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50';
  }
};

const getDayOfWeek = (dateStr: string) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return Number.isNaN(d.getTime()) ? '' : days[d.getDay()];
};

const formatCompactDate = (dateStr: string) => {
  // "2025-11-25" → "11/25"
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
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

export default function MatePartyCard({
  party,
  variant,
  className,
  onClick,
}: MatePartyCardProps) {
  const rawProgressPercent = party.maxParticipants > 0
    ? (party.currentParticipants / party.maxParticipants) * 100
    : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawProgressPercent)));
  const hostAvatarSrc = isLegacyHostAvatarUrl(party.hostProfileImageUrl) ? undefined : party.hostProfileImageUrl;
  const zoneName = getZoneName(party.stadium, party.section);
  const flowLabel = party.status === 'SELLING' ? '판매 티켓' : '직거래 베타';
  const ticketTrustLabel = party.ticketVerified ? '티켓 인증' : '인증 전';
  const hostBadgeIcon = getBadgeIcon(party.hostBadge);
  const hostAverageRating = getHostAverageRating(party);
  const hostReviewLabel = formatHostAverageRating(party);
  const statusConfig = getStatusConfig(party);
  const dDayLabel = getGameDayLabel(party.gameDate);
  const priceLabel = formatTicketAmount(party);

  const statusBadge = (
    <div className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-md border ${statusConfig.border} ${statusConfig.bg} px-2.5 py-1`}>
      {dDayLabel ? (
        <span className={`mr-1.5 shrink-0 whitespace-nowrap border-r border-current/30 pr-1.5 text-[15px] font-bold ${statusConfig.text}`}>
          {dDayLabel}
        </span>
      ) : null}
      <span className={`shrink-0 whitespace-nowrap text-[15px] font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
    </div>
  );

  if (variant === 'compact') {
    const compactBadgeClass = getCompactStatusBadgeClass(party.status);
    const dow = getDayOfWeek(party.gameDate);
    const compactDate = formatCompactDate(party.gameDate);

    return (
      <button
        type="button"
        aria-label={`${zoneName} ${party.stadium} ${formatGameDate(party.gameDate)} ${statusConfig.accessibleLabel} 파티 상세 보기`}
        className={cn(
          'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-[18px] border border-gray-200/80 bg-white text-left transition-all duration-300 hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:border-white/15 dark:bg-[#16181c] dark:hover:border-white/25 dark:focus-visible:ring-offset-[#0a0a0a]',
          className,
        )}
        onClick={() => onClick(party)}
      >
        <div className="flex flex-1 flex-col p-[14px]">
          {/* Row 1: D-day · date+time | status */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className="shrink-0 text-[15px] font-black text-primary dark:text-primary-light">
              {dDayLabel || formatCompactDate(party.gameDate)}
            </span>
            <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">
              {compactDate}({dow}) {party.gameTime}
            </span>
            <span className={cn(
              'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
              compactBadgeClass,
            )}>
              {statusConfig.label}
            </span>
          </div>

          {/* Row 2: Teams + venue */}
          <div className="mb-2.5 flex items-center gap-2.5">
            <TeamLogo teamId={party.homeTeam} size={30} className="shrink-0" />
            <span className="text-[12px] font-black text-slate-400 dark:text-slate-500">VS</span>
            <TeamLogo teamId={party.awayTeam} size={30} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">{party.stadium}</p>
              <p className="truncate text-[12px] font-semibold text-gray-500 dark:text-zinc-400">{zoneName}</p>
            </div>
          </div>

          {/* Row 3: Host + participant count */}
          <div className="flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-white/5">
            <ProfileAvatar
              src={hostAvatarSrc}
              alt={party.hostName}
              fallbackName={party.hostName}
              width={24}
              height={24}
              className="shrink-0 ring-1 ring-gray-200 dark:ring-white/10"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">
              {party.hostName}
            </span>
            {hostBadgeIcon}
            <span className="text-[12px] text-gray-300 dark:text-gray-600">·</span>
            <span className="shrink-0 text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
              신뢰도 {hostAverageRating ?? '-'}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] font-black text-primary dark:text-primary-light ml-auto shrink-0">
              <MateUsersIcon className="h-3.5 w-3.5" />
              {party.currentParticipants}/{party.maxParticipants}
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${zoneName} ${party.stadium} ${formatGameDate(party.gameDate)} ${statusConfig.accessibleLabel} 파티 상세 보기`}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-[22px] border border-gray-200/80 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:border-white/15 dark:bg-[#16181c] dark:hover:border-white/25 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] dark:focus-visible:ring-offset-[#0a0a0a]',
        className,
      )}
      onClick={() => onClick(party)}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex max-w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 max-w-full flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200/80 bg-primary/5 px-2.5 py-1 text-gray-700 dark:border-white/10 dark:text-zinc-300">
              <span className="font-mono text-[15px]">{formatGameDate(party.gameDate)}</span>
              {getWeatherIcon(party.gameDate)}
            </span>
            <span className="inline-flex max-w-full min-w-0 rounded-md border border-gray-200/80 bg-primary/5 px-2.5 py-1 text-[15px] font-semibold text-gray-700 dark:border-white/10 dark:text-zinc-300">
              <span className="truncate">{party.stadium}</span>
            </span>
          </div>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-[21px] font-black tracking-tight text-gray-900 dark:text-white">
              {zoneName}
            </h3>
            <p className="mt-1 line-clamp-1 text-[15px] font-bold text-gray-500 dark:text-zinc-400">
              {party.section}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-gray-200/80 bg-gray-50 px-3 py-2 text-right dark:border-white/10 dark:bg-black/20">
            <span className="block text-[12px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-500">
              {party.status === 'SELLING' ? '판매가' : '참여비'}
            </span>
            <span className="block text-xl font-black leading-tight text-gray-900 dark:text-white">
              {priceLabel}
            </span>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-gray-200 bg-gray-100 p-3 dark:border-white/5 dark:bg-black/30">
          <div className="flex min-w-0 flex-col items-center gap-2">
            <TeamLogo teamId={party.homeTeam} size={38} className="drop-shadow-md" />
            <span className="w-full truncate text-center text-[15px] font-bold text-gray-700 dark:text-zinc-300">
              {resolveTeamDisplayName(party.homeTeam)}
            </span>
          </div>
          <div className="rounded bg-primary/5 px-2 py-1 text-[15px] font-black italic text-primary">VS</div>
          <div className="flex min-w-0 flex-col items-center gap-2">
            <TeamLogo teamId={party.awayTeam} size={38} className="drop-shadow-md" />
            <span className="w-full truncate text-center text-[15px] font-bold text-gray-700 dark:text-zinc-300">
              {resolveTeamDisplayName(party.awayTeam)}
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 px-1">
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-100/70 px-2.5 py-2 text-[15px] font-semibold dark:bg-black/20">
            <MateShieldIcon className={`h-4 w-4 ${party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'}`} />
            <span className={`${party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'} min-w-0 truncate font-bold`}>
              {ticketTrustLabel}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-100/70 px-2.5 py-2 text-[15px] font-semibold dark:bg-black/20">
            <MateStarIcon className={`h-4 w-4 ${hostAverageRating === null ? 'text-gray-400 dark:text-zinc-500' : 'text-primary'}`} />
            <span className={`${hostAverageRating === null ? 'text-gray-500 dark:text-zinc-500' : 'text-gray-700 dark:text-zinc-300'} min-w-0 truncate font-bold`}>
              {hostReviewLabel}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-100/70 px-2.5 py-2 text-[15px] font-semibold dark:bg-black/20">
            <MateUsersIcon className="h-4 w-4 text-primary" />
            <span className="min-w-0 truncate font-bold text-gray-700 dark:text-zinc-300">
              {party.currentParticipants}
              <span className="mx-0.5 text-gray-500 dark:text-zinc-500">/</span>
              {party.maxParticipants}명
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-100/70 px-2.5 py-2 text-[15px] font-semibold dark:bg-black/20">
            <span className="inline-flex min-w-0 max-w-full items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[15px] font-bold text-primary">
              <span className="truncate">
                {flowLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-gray-200 pt-3 dark:border-white/5 min-[1440px]:flex-row min-[1440px]:items-center min-[1440px]:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ProfileAvatar
              src={hostAvatarSrc}
              alt={party.hostName}
              fallbackName={party.hostName}
              width={32}
              height={32}
              className="ring-1 ring-gray-200 dark:ring-white/10"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-bold text-gray-900 dark:text-zinc-200">
                <span className="truncate">{party.hostName}</span>
                {hostBadgeIcon}
              </span>
              <span className="truncate text-[14px] font-bold text-gray-500 dark:text-zinc-400">
                상세 정보 확인
              </span>
            </div>
          </div>

          <div className="w-full shrink-0 min-[1440px]:w-20">
            <div className="mb-1.5 flex items-center justify-between text-[15px] font-bold text-primary min-[1440px]:justify-end">
              <span className="text-gray-500 dark:text-zinc-400 min-[1440px]:hidden">모집 진행</span>
              {progressPercent}%
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-black/50">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
