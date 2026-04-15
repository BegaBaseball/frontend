import AdSlot from './ads/AdSlot';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  MateAlertCircleIcon,
  MateChevronLeftIcon,
  MateChevronRightIcon,
  MateCloudIcon,
  MateCloudRainIcon,
  MatePlusIcon,
  MateRefreshIcon,
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

type MateResultsTabKey = 'all' | 'recruiting' | 'matched' | 'selling';

interface MateResultsRuntimeProps {
  parties: Party[];
  totalPages: number;
  queryPage: number;
  activeTab: MateResultsTabKey;
  authUserId?: number | null;
  isLoading: boolean;
  fetchError: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onCreateParty: () => void;
  onPartyClick: (party: Party) => void;
  onPageChange: (nextPage: number) => void;
}

const EMPTY_MESSAGES_BY_TAB: Record<MateResultsTabKey, { withFilter: string; withoutFilter: string }> = {
  all: { withFilter: '검색 조건에 맞는 파티가 없습니다', withoutFilter: '아직 개설된 파티가 없습니다' },
  recruiting: { withFilter: '검색 조건에 맞는 모집 중 파티가 없습니다', withoutFilter: '현재 모집 중인 파티가 없습니다' },
  matched: { withFilter: '검색 조건에 맞는 매칭 완료 파티가 없습니다', withoutFilter: '매칭 완료된 파티가 없습니다' },
  selling: { withFilter: '검색 조건에 맞는 티켓 판매 파티가 없습니다', withoutFilter: '티켓 판매 중인 파티가 없습니다' },
};

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

export default function MateResultsRuntime({
  parties,
  totalPages,
  queryPage,
  activeTab,
  authUserId,
  isLoading,
  fetchError,
  hasActiveFilters,
  onRetry,
  onResetFilters,
  onCreateParty,
  onPartyClick,
  onPageChange,
}: MateResultsRuntimeProps) {
  const renderEmptyState = (tabKey: MateResultsTabKey) => {
    const messages = EMPTY_MESSAGES_BY_TAB[tabKey];

    return (
      <div className="rounded-2xl border border-gray-200/70 bg-white py-20 text-center dark:border-white/5 dark:bg-[#16181c]">
        <MateUsersIcon className="mx-auto mb-4 h-12 w-12 text-gray-500 dark:text-zinc-600" />
        <p className="mb-2 font-bold text-gray-900 dark:text-zinc-200">
          {hasActiveFilters ? messages.withFilter : messages.withoutFilter}
        </p>
        {hasActiveFilters ? (
          <>
            <p className="mb-6 text-[16px] font-bold text-gray-500 dark:text-zinc-500">
              검색어나 날짜 필터를 변경해보세요
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
              onClick={onResetFilters}
            >
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <p className="mb-6 text-[16px] font-bold text-gray-500 dark:text-zinc-500">
              첫 번째 파티를 만들어보세요!
            </p>
            <Button
              size="sm"
              className="bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
              onClick={onCreateParty}
            >
              <MatePlusIcon className="mr-1 h-4 w-4" />
              파티 만들기
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderPartyCard = (party: Party) => {
    const progressPercent = Math.min(100, (party.currentParticipants / party.maxParticipants) * 100);
    const hostAvatarSrc = isLegacyHostAvatarUrl(party.hostProfileImageUrl) ? undefined : party.hostProfileImageUrl;
    const zoneName = getZoneName(party.stadium, party.section);
    const amount = party.status === 'SELLING' && party.price ? party.price : (party.ticketPrice || 0);
    const flowLabel = party.status === 'SELLING' ? '판매 티켓' : '직거래 베타';
    const ticketTrustLabel = party.ticketVerified ? '티켓 인증' : '인증 전';
    const hostBadgeIcon = getBadgeIcon(party.hostBadge);
    const hostAverageRating = getHostAverageRating(party);
    const hostReviewLabel = formatHostAverageRating(party);

    const getCombinedStatusBadge = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(party.gameDate);
      target.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const dDayStr = diff === 0 ? 'D-Day' : diff < 0 ? '' : `D-${diff}`;

      let statusConfig = {
        label: '마감',
        bg: 'bg-primary/8',
        text: 'text-primary/80',
        border: 'border-primary/20',
      };

      if (party.status === 'PENDING') {
        statusConfig = {
          label: '모집 중',
          bg: 'bg-primary/15',
          text: 'text-primary',
          border: 'border-primary/30',
        };
      } else if (party.status === 'SELLING') {
        statusConfig = {
          label: '티켓 판매',
          bg: 'bg-primary/15',
          text: 'text-primary',
          border: 'border-primary/30',
        };
      } else if (party.status === 'MATCHED') {
        statusConfig = {
          label: '매칭 완료',
          bg: 'bg-primary/12',
          text: 'text-primary',
          border: 'border-primary/30',
        };
      }

      return (
        <div className={`flex items-center rounded-md border ${statusConfig.border} ${statusConfig.bg} px-2.5 py-1`}>
          {dDayStr ? (
            <span className={`mr-1.5 border-r border-current/30 pr-1.5 text-[16px] font-bold ${statusConfig.text}`}>
              {dDayStr}
            </span>
          ) : null}
          <span className={`text-[16px] font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      );
    };

    return (
      <Card
        key={party.id}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] border border-gray-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#16181c] dark:hover:border-white/20 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        onClick={() => onPartyClick(party)}
      >
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200/80 bg-primary/5 px-2.5 py-1 text-gray-700 dark:border-white/10 dark:text-zinc-300">
                <span className="font-mono text-[16px]">{formatGameDate(party.gameDate)}</span>
                {getWeatherIcon(party.gameDate)}
              </span>
              <span className="inline-flex rounded-md border border-gray-200/80 bg-primary/5 px-2.5 py-1 text-[16px] font-semibold text-gray-700 dark:border-white/10 dark:text-zinc-300">
                {party.stadium}
              </span>
            </div>
            {getCombinedStatusBadge()}
          </div>

          <div className="mb-5">
            <div className="mb-1 flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <h3 className="line-clamp-2 text-[20px] font-black tracking-tight text-gray-900 dark:text-white sm:line-clamp-1 sm:text-[22px]">
                {zoneName}
              </h3>
              <span className="shrink-0 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                {amount.toLocaleString()}
                <span className="ml-0.5 text-[16px] font-bold text-gray-500 dark:text-zinc-500">원</span>
              </span>
            </div>
            <p className="line-clamp-1 text-[16px] font-bold text-gray-500 dark:text-zinc-400">
              {party.section}
            </p>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-white/5 dark:bg-black/30 sm:rounded-2xl sm:p-3.5">
            <div className="flex w-[40%] flex-col items-center gap-1.5 sm:gap-2">
              <TeamLogo teamId={party.homeTeam} size={40} className="drop-shadow-md" />
              <span className="w-full truncate text-center text-[16px] font-bold text-gray-700 dark:text-zinc-300">
                {resolveTeamDisplayName(party.homeTeam)}
              </span>
            </div>
            <div className="rounded bg-primary/5 px-2 py-1 text-[16px] font-black italic text-primary">VS</div>
            <div className="flex w-[40%] flex-col items-center gap-1.5 sm:gap-2">
              <TeamLogo teamId={party.awayTeam} size={40} className="drop-shadow-md" />
              <span className="w-full truncate text-center text-[16px] font-bold text-gray-700 dark:text-zinc-300">
                {resolveTeamDisplayName(party.awayTeam)}
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-x-2 gap-y-2.5 px-1 min-[360px]:grid-cols-2">
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <MateShieldIcon className={`h-4 w-4 ${party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'}`} />
              <span className={`${party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'} font-bold`}>
                {ticketTrustLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <MateStarIcon className={`h-4 w-4 ${hostAverageRating === null ? 'text-gray-400 dark:text-zinc-500' : 'text-primary'}`} />
              <span className={`${hostAverageRating === null ? 'text-gray-500 dark:text-zinc-500' : 'text-gray-700 dark:text-zinc-300'} font-bold`}>
                {hostReviewLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <MateUsersIcon className="h-4 w-4 text-primary" />
              <span className="font-bold text-gray-700 dark:text-zinc-300">
                {party.currentParticipants}
                <span className="mx-0.5 text-gray-500 dark:text-zinc-500">/</span>
                {party.maxParticipants}명
              </span>
            </div>
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <span className="inline-flex h-5 items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 text-[16px] font-bold text-primary">
                {flowLabel}
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-gray-200 pt-3 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <ProfileAvatar
                src={hostAvatarSrc}
                alt={party.hostName}
                fallbackName={party.hostName}
                width={32}
                height={32}
                className="ring-1 ring-gray-200 dark:ring-white/10"
              />
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 text-[16px] font-bold text-gray-900 dark:text-zinc-200">
                  {party.hostName}
                  {hostBadgeIcon}
                </span>
                <span className="text-[16px] font-bold text-gray-500 dark:text-zinc-500">
                  상세 정보 확인
                </span>
              </div>
            </div>

            <div className="w-full sm:w-20">
              <div className="mb-1.5 flex items-center justify-between text-[16px] font-bold text-primary sm:justify-end">
                <span className="text-gray-500 dark:text-zinc-500 sm:hidden">모집 진행</span>
                {progressPercent}%
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-black/50">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderPartyGrid = (items: Party[]) => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.flatMap((party, index) => [
        renderPartyCard(party),
        index === 3 && items.length > 4 ? (
          <AdSlot
            key="mate-list-1"
            slotId="mate_list_1"
            pageType="mate_list"
            listIndex={4}
            creativeType="native_card"
            loggedIn={Boolean(authUserId)}
            userId={authUserId ? String(authUserId) : null}
            minHeight={156}
          />
        ) : null,
      ])}
    </div>
  );

  const renderPagination = () => (
    <div className="mb-8 mt-10 flex items-center justify-center gap-2 sm:gap-4">
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/15 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-300"
        onClick={() => onPageChange(Math.max(0, queryPage - 1))}
        disabled={queryPage === 0}
        size="sm"
      >
        <MateChevronLeftIcon className="mr-1 h-4 w-4" />
        이전
      </Button>
      <span className="text-[16px] font-bold text-gray-500 dark:text-zinc-400">
        {`${queryPage + 1} / ${totalPages}`}
      </span>
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/15 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-300"
        onClick={() => onPageChange(Math.min(totalPages - 1, queryPage + 1))}
        disabled={queryPage >= totalPages - 1}
        size="sm"
      >
        다음
        <MateChevronRightIcon className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="md" fullScreen={false} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/30 bg-white py-16 text-center dark:bg-[#16181c]">
        <MateAlertCircleIcon className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p className="font-bold text-gray-900 dark:text-zinc-200">파티 목록을 불러오지 못했습니다</p>
        <p className="mt-1 text-[16px] font-bold text-gray-500 dark:text-zinc-500">
          네트워크 연결을 확인하고 다시 시도해주세요
        </p>
        <Button
          variant="outline"
          className="mt-5 border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
          onClick={onRetry}
        >
          <MateRefreshIcon className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="m-0 space-y-4">
      <div className="transition-opacity duration-200">
        {parties.length === 0 ? (
          renderEmptyState(activeTab)
        ) : (
          <>
            {renderPartyGrid(parties)}
            {totalPages > 1 ? renderPagination() : null}
          </>
        )}
      </div>
    </div>
  );
}
