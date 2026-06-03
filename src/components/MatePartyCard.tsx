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
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
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

const STATUS_DOT: Record<string, { dotColor: string; isLive: boolean; label: string; accessibleLabel: string }> = {
  PENDING:    { dotColor: '#22a36a', isLive: true,  label: '모집 중',    accessibleLabel: '신청 가능' },
  SELLING:    { dotColor: '#e08317', isLive: true,  label: '티켓 판매',  accessibleLabel: '판매 가능' },
  MATCHED:    { dotColor: '#0f7a4d', isLive: false, label: '매칭 완료',  accessibleLabel: '매칭된'    },
  FAILED:     { dotColor: '#dc3a5b', isLive: false, label: '매칭 실패',  accessibleLabel: '마감'      },
  CHECKED_IN: { dotColor: '#7b3ef0', isLive: false, label: '체크인',     accessibleLabel: '체크인'    },
  COMPLETED:  { dotColor: '#94a3b8', isLive: false, label: '관람 완료',  accessibleLabel: '완료'      },
  SOLD:       { dotColor: '#94a3b8', isLive: false, label: '판매 완료',  accessibleLabel: '마감'      },
};

const getStatusConfig = (party: Party) => {
  return STATUS_DOT[party.status] ?? { dotColor: '#94a3b8', isLive: false, label: '마감', accessibleLabel: '마감' };
};

// v4: layered gradient surface with embossed inset shadow
const MONO_MINT_BASE =
  'inline-flex items-center gap-2 rounded-full border border-[rgba(45,95,79,.16)] px-[11px] py-[6px] text-[13px] font-bold text-[#1f3d35] whitespace-nowrap [font-variant-numeric:tabular-nums] dark:text-[#a3d4c4] dark:border-white/10';
const MONO_MINT_BASE_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f1f8f4 0%, #e6f0eb 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75), inset 0 -1px 0 rgba(45,95,79,.06), 0 1px 1.5px rgba(15,40,33,.04)',
} as const;

const MONO_MINT_XS =
  'inline-flex items-center gap-1.5 rounded-full border border-[rgba(45,95,79,.16)] px-[9px] py-[4px] text-[11px] font-bold text-[#1f3d35] whitespace-nowrap [font-variant-numeric:tabular-nums] dark:text-[#a3d4c4] dark:border-white/10';

// compact: table-density size, 5px radius
export const MONO_MINT_COMPACT =
  'inline-flex items-center gap-[5px] rounded-[5px] border border-[rgba(45,95,79,.16)] px-2 py-[2px] text-[11px] font-bold text-[#1f3d35] whitespace-nowrap [font-variant-numeric:tabular-nums] dark:text-[#a3d4c4] dark:border-white/10';
export const MONO_MINT_COMPACT_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f1f8f4 0%, #e6f0eb 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75)',
} as const;

// ghost: outline only, for inactive/filter-unselected states
export const MONO_MINT_GHOST =
  'inline-flex items-center gap-2 rounded-full border border-[rgba(45,95,79,.18)] bg-transparent shadow-none px-[11px] py-[6px] text-[13px] font-bold text-[#536471] whitespace-nowrap dark:text-zinc-400 dark:border-white/[.12]';

// v4: layered radial-gradient dot with specular highlight + ring pulse animation
const StatusDot = ({
  color,
  isLive,
  size = 8,
  ghost = false,
}: {
  color: string;
  isLive: boolean;
  size?: number;
  ghost?: boolean;
}) => (
  <span
    className="relative shrink-0 rounded-full"
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      background: ghost
        ? 'transparent'
        : `radial-gradient(circle at 35% 30%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 50% 60%, ${color} 0%, color-mix(in oklab, ${color} 78%, #000) 100%)`,
      border: ghost ? `1.5px solid ${color}` : 'none',
      boxShadow: ghost
        ? 'none'
        : `0 0 0 ${size * 0.33}px color-mix(in oklab, ${color} 16%, transparent), inset 0 -1px 0 color-mix(in oklab, ${color} 60%, #000), inset 0 1px 0 rgba(255,255,255,.55)`,
    }}
  >
    {isLive && !ghost && (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -1,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          opacity: 0.6,
          animation: 'livering 2s cubic-bezier(.16,1,.3,1) infinite',
        }}
      />
    )}
  </span>
);

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
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);

  // Zero-pad D-day number: "D-3" → "D-03", keep "D-DAY" as-is
  const formattedDDay = dDayLabel && dDayLabel !== 'D-Day' && /^D[+-]\d+$/.test(dDayLabel)
    ? dDayLabel.replace(/(\d+)$/, (n) => n.padStart(2, '0'))
    : dDayLabel;
  const dDayColor = dDayLabel === 'D-Day' ? '#c11d3d' : dDayLabel?.startsWith('D-') ? '#1f6f47' : '#64748b';

  const statusBadge = dDayLabel ? (
    /* D-day combined badge: left pill (retro font) + hairline + right section (status dot + label) */
    <div
      className="inline-flex items-stretch rounded-full border border-[rgba(45,95,79,.16)] text-[13px] font-bold whitespace-nowrap overflow-hidden shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f1f8f4 0%, #e6f0eb 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75), 0 1px 1.5px rgba(15,40,33,.04)',
      }}
    >
      {/* D-day pill — retro display font */}
      <span
        className="flex items-center gap-1.5 px-[13px] py-[6px] text-white text-[11px] font-bold tracking-[.04em] [font-variant-numeric:tabular-nums]"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          background: `linear-gradient(180deg, color-mix(in oklab, ${dDayColor} 100%, white 8%) 0%, ${dDayColor} 100%)`,
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.25)',
          textShadow: '0 1px 0 rgba(0,0,0,.12)',
        }}
      >
        {dDayLabel === 'D-Day' && (
          <span
            className="inline-block animate-pulse rounded-full"
            style={{ width: 5, height: 5, background: 'rgba(255,255,255,.95)', boxShadow: '0 0 6px rgba(255,255,255,.7)' }}
          />
        )}
        {dDayLabel === 'D-Day' ? 'D-DAY' : formattedDDay}
      </span>
      {/* Status section — hairline divider */}
      <span
        className="flex items-center gap-2 px-[11px] py-[6px] text-[#1f3d35] dark:text-[#a3d4c4]"
        style={{ borderLeft: '1px solid rgba(45,95,79,.14)' }}
      >
        <StatusDot color={statusConfig.dotColor} isLive={statusConfig.isLive} />
        {statusConfig.label}
      </span>
    </div>
  ) : (
    <div className={`${MONO_MINT_BASE} shrink-0`} style={MONO_MINT_BASE_STYLE}>
      <StatusDot color={statusConfig.dotColor} isLive={statusConfig.isLive} />
      {statusConfig.label}
    </div>
  );

  if (variant === 'compact') {
    const dow = getDayOfWeek(party.gameDate);
    const compactDate = formatCompactDate(party.gameDate);

    return (
      <button
        type="button"
        aria-label={`${zoneName} ${stadiumDisplayName} ${formatGameDate(party.gameDate)} ${statusConfig.accessibleLabel} 파티 상세 보기`}
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
            <span
              className={cn(MONO_MINT_XS)}
              style={MONO_MINT_BASE_STYLE}
            >
              <StatusDot color={statusConfig.dotColor} isLive={statusConfig.isLive} size={6} />
              {statusConfig.label}
            </span>
          </div>

          {/* Row 2: Teams + venue */}
          <div className="mb-2.5 flex items-center gap-2.5">
            <TeamLogo teamId={party.homeTeam} size={30} className="shrink-0" />
            <span className="text-[12px] font-black text-slate-400 dark:text-slate-500">VS</span>
            <TeamLogo teamId={party.awayTeam} size={30} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-gray-900 dark:text-zinc-200">{stadiumDisplayName}</p>
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
      aria-label={`${zoneName} ${stadiumDisplayName} ${formatGameDate(party.gameDate)} ${statusConfig.accessibleLabel} 파티 상세 보기`}
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
              <span className="truncate">{stadiumDisplayName}</span>
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
