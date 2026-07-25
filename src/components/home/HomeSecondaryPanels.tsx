import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';

import type { CheerPost } from '../../api/cheerApi';
import type { FeaturedMateCard } from '../../types/home';
import { parseLocalDate } from '../../utils/currentDate';
import { getMateDDayLabel } from '../../utils/mateDateLabels';
import { formatTimeAgo } from '../../utils/time';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { getMateStatusBadgeMeta } from '../../utils/statusBadgeMeta';
import { useAuthProfileSnapshot } from '../../store/authStore';
import TeamLogo from '../TeamLogo';
import AdSlot from '../ads/AdSlot';
import {
  HomeSecondaryChevronLeftIcon as ChevronLeftIcon,
  HomeSecondaryChevronRightIcon as ChevronRightIcon,
  HomeSecondaryFlameIcon as FlameIcon,
  HomeSecondaryMessageSquareIcon as MessageSquareIcon,
  HomeSecondaryRefreshIcon as RefreshIcon,
  HomeSecondaryTrophyIcon as TrophyIcon,
  HomeSecondaryUsersIcon as UsersIcon,
} from './HomeSecondaryIcons';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { StatusBadge } from '../ui/status-badge';
import TeamRankRow from './TeamRankRow';

const LazyWelcomeGuide = lazy(() => import('../WelcomeGuide'));
const LazyCalendarComponent = lazy(async () => {
  const module = await import('../ui/calendar');
  return { default: module.Calendar };
});

export interface HomeDisplayedRanking {
  rank: number;
  teamId: string;
  displayName: string;
  winRate: string;
  wins: number;
  draws: number;
  losses: number;
  gamesBehind?: number;
  recentForm?: ReadonlyArray<'W' | 'L' | 'D'>;
}

interface HomeSecondaryPanelsProps {
  selectedDate: Date;
  calendarMonth: Date;
  showCalendar: boolean;
  shouldMountWelcomeGuide: boolean;
  calendarDialogTitleId: string;
  loggedIn: boolean;
  userId: string | null;
  suppressRecoveryActions?: boolean;
  currentYear: number;
  todayKey: string;
  isHotCheerLoading: boolean;
  hotCheerError: string | null;
  hotCheerPosts: CheerPost[];
  isFeaturedMatesLoading: boolean;
  featuredMatesError: string | null;
  featuredMates: FeaturedMateCard[];
  rankingSeasonYear: number;
  isRankingsLoading: boolean;
  rankingsError: boolean;
  displayedRankings: HomeDisplayedRanking[];
  rankingDataVisibilityMessage: string;
  rankingStatusHintMessage: string;
  rankingPlaceholderRows: number;
  homeDashboardCardHeightClass: string;
  teamRankingCardHeightClass: string;
  homeDashboardRankingRowClass: string;
  onRetryWidgets: () => void;
  onRetryRanking: () => void;
  onLoadPreviousRankingSeason: () => void;
  onLoadNextRankingSeason: () => void;
  onNavigateToCheer: () => void;
  onNavigateToMate: () => void;
  onNavigateToCheerPost: (postId: number) => void;
  onSelectFeaturedMate: (mate: FeaturedMateCard) => void;
  onCloseCalendar: () => void;
  onCalendarMonthChange: (month: Date) => void;
  onSelectCalendarDate: (date: Date) => void;
}

interface PanelHeaderProps {
  title: string;
  icon: ReactNode;
  onMore?: () => void;
  moreLabel?: string;
  children?: ReactNode;
}

function PanelHeader({
  title,
  icon,
  onMore,
  moreLabel = '더보기',
  children,
}: PanelHeaderProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
        {icon}
        <span className="truncate">{title}</span>
      </h3>
      {children ?? (
        onMore ? (
          <Button
            variant="ghost"
            size="touch"
            onClick={onMore}
            className="rounded-full px-3 text-15 font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-white dark:hover:bg-zinc-800/40 dark:hover:text-zinc-100"
          >
            {moreLabel} <ChevronRightIcon className="h-4 w-4" />
          </Button>
        ) : null
      )}
    </div>
  );
}

function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800/50" />
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center px-4 text-center font-bold text-zinc-500 dark:text-white">
      {children}
    </div>
  );
}

function WidgetErrorState({
  message,
  suppressRecoveryActions,
  onRetry,
}: {
  message: string;
  suppressRecoveryActions: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center px-4 text-center text-zinc-500 dark:text-white">
      <p className="text-lg font-bold text-zinc-700 dark:text-white">{message}</p>
      {suppressRecoveryActions ? (
        <p className="mt-3 text-15 font-bold text-zinc-500 dark:text-white">
          상단 복구 버튼으로 다시 불러오세요.
        </p>
      ) : (
        <Button
          variant="outline"
          size="touch"
          onClick={onRetry}
          className="mt-4"
        >
          <RefreshIcon className="mr-1.5 h-4 w-4" />
          다시 시도
        </Button>
      )}
    </div>
  );
}

const getMateGameDateLabel = (gameDateValue: string) => {
  const gameDate = parseLocalDate(gameDateValue);
  return Number.isNaN(gameDate.getTime())
    ? gameDateValue
    : gameDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
};

const getTicketLabel = (ticketPrice?: number | null) => {
  if (ticketPrice == null) return '가격 협의';
  if (ticketPrice === 0) return '무료';
  return `${ticketPrice.toLocaleString()}원`;
};

export default function HomeSecondaryPanels({
  selectedDate,
  calendarMonth,
  showCalendar,
  shouldMountWelcomeGuide,
  calendarDialogTitleId,
  loggedIn,
  userId,
  suppressRecoveryActions = false,
  currentYear,
  todayKey,
  isHotCheerLoading,
  hotCheerError,
  hotCheerPosts,
  isFeaturedMatesLoading,
  featuredMatesError,
  featuredMates,
  rankingSeasonYear,
  isRankingsLoading,
  rankingsError,
  displayedRankings,
  rankingDataVisibilityMessage,
  rankingStatusHintMessage,
  rankingPlaceholderRows,
  homeDashboardCardHeightClass,
  teamRankingCardHeightClass,
  homeDashboardRankingRowClass,
  onRetryWidgets,
  onRetryRanking,
  onLoadPreviousRankingSeason,
  onLoadNextRankingSeason,
  onNavigateToCheer,
  onNavigateToMate,
  onNavigateToCheerPost,
  onSelectFeaturedMate,
  onCloseCalendar,
  onCalendarMonthChange,
  onSelectCalendarDate,
}: HomeSecondaryPanelsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState(0);
  const { userFavoriteTeam } = useAuthProfileSnapshot();
  const myTeamRanking = displayedRankings.find((team) => team.teamId === userFavoriteTeam);

  const handleCarouselScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const ratio = max > 0 ? el.scrollLeft / max : 0;
    setActivePanel(ratio > 0.5 ? 1 : 0);
  };

  const scrollToPanel = (index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const target = index === 0 ? 0 : el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const panelCardClassName = `rounded-2xl border border-zinc-200/80 bg-white/88 shadow-sm dark:border-zinc-800 dark:bg-card/82 ${homeDashboardCardHeightClass} max-h-[320px] overflow-y-auto p-3 lg:max-h-none lg:p-4`;
  const rankingCardClassName = `overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/88 dark:border-zinc-800 dark:bg-card/82 ${teamRankingCardHeightClass} lg:max-h-none lg:overflow-y-auto`;
  const compactRankingRows = [
    ...displayedRankings.map((team) => ({
      key: team.teamId,
      node: <TeamRankRow team={team} variant="compact" rowClassName="lg:h-[65px] lg:min-h-[65px] lg:px-4 lg:py-0 xl:h-auto xl:min-h-0" />,
    })),
    ...Array.from({ length: rankingPlaceholderRows }).map((_, index) => ({
      key: `team-rank-placeholder-${index}`,
      node: (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-200/80 px-3 py-3 opacity-45 last:border-b-0 dark:border-zinc-800/80 lg:h-[65px] lg:min-h-[65px] lg:px-4 lg:py-0 xl:h-auto xl:min-h-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 text-center text-15 font-black text-zinc-400 dark:text-white">
              {displayedRankings.length + index + 1}
            </span>
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
            <span className="block h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-700/80" />
          </div>
          <span className="block h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-700/70" />
        </div>
      ),
    })),
  ];
  const compactRankingSplitIndex = Math.ceil(compactRankingRows.length / 2);
  const compactRankingColumns = [
    compactRankingRows.slice(0, compactRankingSplitIndex),
    compactRankingRows.slice(compactRankingSplitIndex),
  ];

  const renderHotCheerPanel = () => (
    <section data-home-panel-priority="secondary" className="w-[86vw] shrink-0 snap-start space-y-3 sm:w-[420px] lg:order-1 lg:col-span-4 lg:w-auto">
      <PanelHeader
        title="실시간 인기 응원글"
        icon={<FlameIcon className="h-5 w-5 text-red-500" />}
        onMore={onNavigateToCheer}
        moreLabel="전체 보기"
      />
      <Card className={panelCardClassName}>
        {isHotCheerLoading ? (
          <LoadingRows />
        ) : hotCheerError ? (
          <WidgetErrorState
            message={hotCheerError}
            suppressRecoveryActions={suppressRecoveryActions}
            onRetry={onRetryWidgets}
          />
        ) : hotCheerPosts.length === 0 ? (
          <EmptyState>인기 응원글이 없습니다.</EmptyState>
        ) : (
          <>
            {/* Mobile: uniform compact list */}
            <div className="flex flex-col gap-2 lg:hidden">
              {hotCheerPosts.map((post) => {
                const thumbnailUrl = post.imageUrls?.[0];
                return (
                  <button
                    type="button"
                    key={post.id}
                    onClick={() => onNavigateToCheerPost(post.id)}
                    className="group w-full rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/45"
                  >
                    <div className="flex gap-3">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800/80 dark:ring-zinc-700">
                          <TeamLogo team={post.team} size={30} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate text-caption font-bold text-zinc-600 dark:text-white">
                            {post.author || '익명'}
                          </span>
                          <span className="shrink-0 text-13 font-bold text-zinc-500 dark:text-white">
                            {formatTimeAgo(post.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-15 font-black leading-snug text-gray-900 dark:text-white">
                          {post.content}
                        </p>
                        <div className="mt-2 flex gap-3">
                          <span className="flex items-center gap-1 text-13 font-bold text-rose-500">
                            <FlameIcon className="h-3.5 w-3.5" /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1 text-13 font-bold text-zinc-500 dark:text-white">
                            <MessageSquareIcon className="h-3.5 w-3.5" /> {post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop: hero first post + compact list for rest */}
            <div className="hidden flex-col gap-1 lg:flex">
              {(() => {
                const hero = hotCheerPosts[0];
                const heroThumb = hero.imageUrls?.[0];
                return (
                  <button
                    type="button"
                    onClick={() => onNavigateToCheerPost(hero.id)}
                    className="group w-full rounded-xl text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/45"
                  >
                    {heroThumb ? (
                      <img
                        src={heroThumb}
                        alt=""
                        className="mb-2.5 h-[120px] w-full rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                        loading="lazy"
                      />
                    ) : (
                      <div className="mb-2.5 flex h-[100px] w-full items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800/80 dark:ring-zinc-700">
                        <TeamLogo team={hero.team} size={44} />
                      </div>
                    )}
                    <div className="px-1">
                      <p className="line-clamp-2 text-15 font-black leading-snug text-gray-900 dark:text-white">
                        {hero.content}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-13 font-bold text-zinc-500 dark:text-white">
                          {hero.author || '익명'} · {formatTimeAgo(hero.createdAt)}
                        </span>
                        <div className="flex shrink-0 gap-3">
                          <span className="flex items-center gap-1 text-13 font-bold text-rose-500">
                            <FlameIcon className="h-3.5 w-3.5" /> {hero.likeCount}
                          </span>
                          <span className="flex items-center gap-1 text-13 font-bold text-zinc-500 dark:text-white">
                            <MessageSquareIcon className="h-3.5 w-3.5" /> {hero.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })()}

              {hotCheerPosts.length > 1 && (
                <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800/80">
                  {hotCheerPosts.slice(1).map((post) => {
                    const thumbnailUrl = post.imageUrls?.[0];
                    return (
                      <button
                        type="button"
                        key={post.id}
                        onClick={() => onNavigateToCheerPost(post.id)}
                        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/45"
                      >
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800/80 dark:ring-zinc-700">
                            <TeamLogo team={post.team} size={22} />
                          </div>
                        )}
                        <p className="min-w-0 flex-1 truncate text-caption font-bold text-gray-900 dark:text-white">
                          {post.content}
                        </p>
                        <div className="flex shrink-0 gap-2">
                          <span className="flex items-center gap-0.5 text-12 font-bold text-rose-500">
                            <FlameIcon className="h-3 w-3" /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-12 font-bold text-zinc-500 dark:text-white">
                            <MessageSquareIcon className="h-3 w-3" /> {post.commentCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </section>
  );

  const renderFeaturedMatePanel = () => (
    <section data-home-panel-priority="secondary" className="w-[86vw] shrink-0 snap-start space-y-3 sm:w-[420px] lg:order-2 lg:col-span-4 lg:w-auto">
      <PanelHeader
        title="직관 메이트 찾기"
        icon={<UsersIcon className="h-5 w-5 text-blue-500" />}
        onMore={onNavigateToMate}
        moreLabel="전체 보기"
      />
      <Card className={panelCardClassName}>
        {isFeaturedMatesLoading ? (
          <LoadingRows />
        ) : featuredMatesError ? (
          <WidgetErrorState
            message={featuredMatesError}
            suppressRecoveryActions={suppressRecoveryActions}
            onRetry={onRetryWidgets}
          />
        ) : featuredMates.length === 0 ? (
          <EmptyState>모집 중인 팟이 없습니다.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {featuredMates.map((mate) => {
              const dDayLabel = getMateDDayLabel(mate.gameDate, todayKey);
              const gameDateLabel = getMateGameDateLabel(mate.gameDate);
              const ticketLabel = getTicketLabel(mate.ticketPrice);
              const stadiumDisplayName = formatStadiumDisplayName(mate.stadium);
              const statusMeta = getMateStatusBadgeMeta(mate.status);
              const progressPercent = mate.maxParticipants > 0
                ? Math.min(100, Math.max(0, Math.round(((mate.currentParticipants || 0) / mate.maxParticipants) * 100)))
                : 0;

              return (
                <button
                  type="button"
                  key={mate.id}
                  onClick={() => onSelectFeaturedMate(mate)}
                  className="status-badge-hover-scope w-full rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/35"
                >
                  {/* Row 1: D-day · date·time · status chip */}
                  <div className="mb-2 flex items-center gap-2">
                    {dDayLabel ? (
                      <>
                        <span className="shrink-0 text-caption font-black tracking-tight text-primary dark:text-primary-light">
                          {dDayLabel}
                        </span>
                        <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      </>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-13 font-bold text-zinc-500 dark:text-white">
                      {gameDateLabel} {mate.gameTime}
                    </span>
                    <StatusBadge {...statusMeta} size="xs" />
                  </div>

                  {/* Row 2: away VS home · venue */}
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={mate.awayTeam} size={24} className="shrink-0" />
                    <span className="shrink-0 text-11 font-extrabold text-zinc-400 dark:text-white">VS</span>
                    <TeamLogo teamId={mate.homeTeam} size={24} className="shrink-0" />
                    <div className="ml-1 min-w-0 flex-1">
                      <p className="truncate text-13 font-bold text-zinc-900 dark:text-white">
                        {stadiumDisplayName}
                      </p>
                      <p className="truncate text-12 font-semibold text-zinc-500 dark:text-white">
                        {mate.section} · {ticketLabel}
                      </p>
                    </div>
                  </div>

                  {/* Row 2.5: host */}
                  {mate.hostHandle ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2d5f4f] text-9 font-black text-white"
                      >
                        {mate.hostHandle.replace(/^@/, '').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate text-12 font-semibold text-zinc-500 dark:text-white">
                        {mate.hostHandle}
                      </span>
                    </div>
                  ) : null}

                  {/* Row 3: recruitment progress */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-12 font-bold text-zinc-500 dark:text-white">모집 현황</span>
                    <span className="shrink-0 text-13 font-black text-primary">
                      {mate.currentParticipants || 0}/{mate.maxParticipants}명
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );

  const renderRankingPanel = () => (
    <section data-home-panel-priority="secondary" className="w-full space-y-3 lg:order-3 lg:col-span-4 lg:w-auto">
      <PanelHeader
        title="팀 순위"
        icon={<TrophyIcon className="h-5 w-5 text-[#2d5f4f] dark:text-emerald-200" />}
      >
        <div className="flex items-center rounded-full border border-zinc-200 bg-slate-100 p-0.5 shadow-sm dark:border-zinc-800 dark:bg-card">
          <Button
            aria-label={`${rankingSeasonYear - 1}시즌 팀 순위 보기`}
            variant="ghost"
            size="iconTouch"
            onClick={onLoadPreviousRankingSeason}
            className="rounded-md text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-white dark:hover:bg-zinc-800/60 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-15 font-bold text-zinc-900 dark:text-white">
            {rankingSeasonYear}
          </span>
          <Button
            aria-label={`${rankingSeasonYear + 1}시즌 팀 순위 보기`}
            variant="ghost"
            size="iconTouch"
            onClick={onLoadNextRankingSeason}
            disabled={rankingSeasonYear >= currentYear}
            className="rounded-md text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent dark:text-white dark:hover:bg-zinc-800/60 dark:hover:text-white"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </PanelHeader>

      <Card className={rankingCardClassName}>
        {isRankingsLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800/50" />
            <Skeleton className="h-14 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800/50" />
            <Skeleton className="h-14 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800/50" />
          </div>
        ) : rankingsError ? (
          <WidgetErrorState
            message="팀 순위를 불러오는 중 문제가 발생했습니다."
            suppressRecoveryActions={suppressRecoveryActions}
            onRetry={onRetryRanking}
          />
        ) : displayedRankings.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-4 py-16 text-center">
            <p className="mb-2 font-bold text-zinc-900 dark:text-white">
              {rankingDataVisibilityMessage}
            </p>
            <p className="text-15 font-bold text-zinc-500 dark:text-white">
              {rankingStatusHintMessage}
            </p>
          </div>
        ) : (
          <div>
            {myTeamRanking ? (
              <div className="flex items-center gap-2.5 border-b border-zinc-200/80 bg-[#2d5f4f]/[0.06] px-3 py-2.5 dark:border-zinc-800/80 dark:bg-emerald-950/20">
                <span className="w-6 shrink-0 text-center text-17 font-black text-[#2d5f4f] dark:text-emerald-200">
                  {myTeamRanking.rank}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 p-1 shadow-sm dark:bg-white">
                  <TeamLogo team={myTeamRanking.displayName} teamId={myTeamRanking.teamId} size={24} className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-15 font-black text-gray-900 dark:text-white">
                      {myTeamRanking.displayName}
                    </span>
                    <span className="shrink-0 rounded-md bg-[#2d5f4f] px-1.5 py-0.5 text-11 font-bold text-white dark:bg-emerald-800">
                      내 팀
                    </span>
                  </div>
                  <p className="truncate text-12 font-bold text-zinc-500 dark:text-white">
                    {myTeamRanking.winRate} · {myTeamRanking.wins}승 {myTeamRanking.draws}무 {myTeamRanking.losses}패
                  </p>
                </div>
              </div>
            ) : null}
            <div className="md:hidden lg:block xl:hidden">
              {compactRankingRows.map((row) => (
                <div key={row.key}>{row.node}</div>
              ))}
            </div>

            <div className="hidden gap-x-4 md:grid md:grid-cols-2 lg:hidden">
              {compactRankingColumns.map((column, columnIndex) => (
                <div key={`ranking-column-${columnIndex}`} className="min-w-0">
                  {column.map((row) => (
                    <div key={row.key}>{row.node}</div>
                  ))}
                </div>
              ))}
            </div>

            <div className="hidden xl:flex xl:flex-col">
              {displayedRankings.map((team) => (
                <TeamRankRow
                  key={team.teamId}
                  team={team}
                  variant="rich"
                  rowClassName={homeDashboardRankingRowClass}
                  sparkline={team.recentForm as ('W' | 'D' | 'L')[] | undefined}
                />
              ))}
              {Array.from({ length: rankingPlaceholderRows }).map((_, index) => (
                <div
                  key={`team-rank-placeholder-${index}`}
                  className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-200/80 px-3 py-3 opacity-45 last:border-b-0 dark:border-zinc-800/80 ${homeDashboardRankingRowClass}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-15 font-black text-zinc-400 dark:text-white">
                      {displayedRankings.length + index + 1}
                    </span>
                    <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
                    <span className="block h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-700/80" />
                  </div>
                  <span className="block h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );

  return (
    <>
      {shouldMountWelcomeGuide ? (
        <Suspense fallback={null}>
          <LazyWelcomeGuide />
        </Suspense>
      ) : null}

      <div
        aria-label="홈 보조 패널"
        className="space-y-4 rounded-3xl border border-zinc-200/70 bg-white/55 p-3 shadow-sm dark:border-zinc-800 dark:bg-card/35 sm:p-4"
        data-priority="secondary"
        data-testid="home-secondary-panels"
      >
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-12 font-black uppercase tracking-[0.14em] text-zinc-400 dark:text-white">
              Support Panels
            </p>
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
              순위 · 인기글 · 메이트
            </h2>
          </div>
          <p className="text-13 font-bold text-zinc-500 dark:text-white">
            오늘 경기 확인 후 이어보는 보조 정보
          </p>
        </div>
        <AdSlot
          slotId="home_mid_1"
          pageType="home_mid"
          creativeType="native_card"
          loggedIn={loggedIn}
          userId={userId}
          minHeight={156}
        />

        <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
          {renderRankingPanel()}
          <div
            ref={scrollContainerRef}
            onScroll={handleCarouselScroll}
            className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide lg:contents lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            <div className="flex snap-x snap-mandatory gap-4 lg:contents">
              {renderHotCheerPanel()}
              {renderFeaturedMatePanel()}
            </div>
          </div>
          {/* Mobile-only dot indicators */}
          <div className="flex items-center justify-center gap-2 pt-2 lg:hidden">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPanel(i)}
                aria-label={i === 0 ? '응원글 패널로 이동' : '메이트 패널로 이동'}
                className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className={`block rounded-full transition-all duration-200 ${activePanel === i ? 'h-2 w-2.5 bg-primary dark:bg-primary-light' : 'h-1.5 w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCalendar && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 px-4"
          onClick={onCloseCalendar}
        >
          <div className="flex min-h-full items-center justify-center py-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={calendarDialogTitleId}
              className="grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl border border-zinc-200/90 bg-white p-6 text-foreground shadow-dialog ring-1 ring-black/5 dark:border-zinc-700/70 dark:bg-zinc-900 dark:ring-white/10 sm:max-w-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id={calendarDialogTitleId} className="text-lg font-bold leading-none">
                  날짜 선택
                </h2>
                <button
                  type="button"
                  className="min-h-11 rounded-md px-3 py-1 text-body text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-white dark:hover:bg-zinc-800 dark:hover:text-white"
                  onClick={onCloseCalendar}
                >
                  닫기
                </button>
              </div>
              <Suspense
                fallback={(
                  <div className="mx-auto flex w-full max-w-[320px] flex-col gap-3 rounded-md border p-3">
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }, (_, index) => (
                        <Skeleton key={`calendar-header-${index}`} className="h-4 w-full rounded" />
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 35 }, (_, index) => (
                        <Skeleton key={`calendar-cell-${index}`} className="h-8 w-full rounded-md" />
                      ))}
                    </div>
                  </div>
                )}
              >
                <LazyCalendarComponent
                  selected={selectedDate}
                  month={calendarMonth}
                  onMonthChange={onCalendarMonthChange}
                  onSelect={(date) => {
                    if (!date) {
                      return;
                    }
                    const nextDate = new Date(date);
                    nextDate.setHours(12, 0, 0, 0);
                    onSelectCalendarDate(nextDate);
                  }}
                  className="mx-auto rounded-md border"
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
