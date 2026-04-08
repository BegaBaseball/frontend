import { lazy, Suspense } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  MessageSquare,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';

import type { CheerPost } from '../../api/cheerApi';
import type { FeaturedMateCard } from '../../types/home';
import { formatTimeAgo } from '../../utils/time';
import { getMateTeamDisplayName } from '../../utils/homeTeamNameResolution';
import TeamLogo from '../TeamLogo';
import AdSlot from '../ads/AdSlot';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

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
}

interface HomeSecondaryPanelsProps {
  selectedDate: Date;
  selectedDateKey: string;
  showCalendar: boolean;
  shouldMountWelcomeGuide: boolean;
  calendarDialogTitleId: string;
  loggedIn: boolean;
  userId: string | null;
  currentYear: number;
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
  onSelectCalendarDate: (date: Date) => void;
}

export default function HomeSecondaryPanels({
  selectedDate,
  selectedDateKey,
  showCalendar,
  shouldMountWelcomeGuide,
  calendarDialogTitleId,
  loggedIn,
  userId,
  currentYear,
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
  onSelectCalendarDate,
}: HomeSecondaryPanelsProps) {
  return (
    <>
      {shouldMountWelcomeGuide ? (
        <Suspense fallback={null}>
          <LazyWelcomeGuide />
        </Suspense>
      ) : null}

      <div className="space-y-5" data-testid="home-secondary-panels">
        <AdSlot
          slotId="home_mid_1"
          pageType="home_mid"
          creativeType="native_card"
          loggedIn={loggedIn}
          userId={userId}
          minHeight={156}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-0">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                    <Flame className="w-5 h-5 text-red-500" />
                    실시간 인기 응원글
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNavigateToCheer}
                  className="text-[16px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                  >
                    더보기 <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Card className={`p-4 bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 shadow-sm ${homeDashboardCardHeightClass} overflow-y-auto relative`}>
                  {isHotCheerLoading ? (
                    <div className="space-y-4 flex flex-col justify-center h-full">
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                    </div>
                  ) : hotCheerError ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-200">{hotCheerError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetryWidgets}
                        className="mt-4"
                      >
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        다시 시도
                      </Button>
                    </div>
                  ) : hotCheerPosts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 font-semibold">
                      인기 응원글이 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/60">
                      {hotCheerPosts.map((post) => (
                        <button
                          type="button"
                          key={post.id}
                          onClick={() => onNavigateToCheerPost(post.id)}
                          className="text-left w-full px-2.5 py-2.5 rounded-md transition-colors group hover:bg-zinc-100 dark:hover:bg-zinc-800/45"
                        >
                          <div className="flex gap-3">
                            <TeamLogo team={post.team} size={26} />
                            <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col min-w-0">
                              <span className="text-[16px] text-zinc-700 dark:text-zinc-500 font-semibold">{post.author || '익명'}</span>
                                  <p className="text-[16px] text-gray-900 dark:text-zinc-100 font-semibold leading-snug mt-0.5 line-clamp-2">
                                    {post.content}
                                  </p>
                                </div>
                                <span className="text-[16px] text-zinc-500 dark:text-zinc-400 shrink-0 font-semibold">{formatTimeAgo(post.createdAt)}</span>
                              </div>
                              <div className="flex gap-2.5 mt-1.5">
                                <span className="text-[16px] font-semibold text-rose-300 flex items-center gap-1.5"><Flame className="w-3 h-3 text-rose-400" /> {post.likeCount}</span>
                                <span className="text-[16px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-semibold"><MessageSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> {post.commentCount}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                    <Users className="w-5 h-5 text-blue-500" />
                    직관 메이트 찾기
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNavigateToMate}
                    className="text-[16px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                  >
                    더보기 <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Card className={`p-4 bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 shadow-sm ${homeDashboardCardHeightClass} overflow-y-auto relative`}>
                  {isFeaturedMatesLoading ? (
                    <div className="space-y-4 flex flex-col justify-center h-full">
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                      <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                    </div>
                  ) : featuredMatesError ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-200">{featuredMatesError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetryWidgets}
                        className="mt-4"
                      >
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        다시 시도
                      </Button>
                    </div>
                  ) : featuredMates.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 font-semibold">
                      모집 중인 팟이 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/60">
                      {featuredMates.map((mate) => {
                        const gameDate = new Date(`${mate.gameDate}T12:00:00`);
                        const gameDateLabel = Number.isNaN(gameDate.getTime())
                          ? mate.gameDate
                          : gameDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
                        const ticketLabel = mate.ticketPrice == null
                          ? '가격 협의'
                          : mate.ticketPrice === 0
                            ? '무료'
                            : `${mate.ticketPrice.toLocaleString()}원`;
                        const homeTeamLabel = getMateTeamDisplayName(mate.homeTeam);
                        const awayTeamLabel = getMateTeamDisplayName(mate.awayTeam);

                        return (
                          <button
                            type="button"
                            key={mate.id}
                            onClick={() => onSelectFeaturedMate(mate)}
                            className="text-left w-full px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/35 last:pb-0 overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-[16px] font-semibold text-zinc-500 dark:text-zinc-500">
                                {gameDateLabel} {mate.gameTime}
                              </p>
                              <p className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[16px] leading-none text-zinc-500 dark:text-zinc-400">
                                모집 <span className="ml-1 font-bold text-zinc-900 dark:text-zinc-100">{mate.currentParticipants || 0}/{mate.maxParticipants}명</span>
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[16px] sm:text-[16px] font-black text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                                {homeTeamLabel} vs {awayTeamLabel}
                              </p>
                              <p className={`inline-flex w-fit items-baseline rounded-full px-1.5 py-0.75 text-[16px] sm:text-[16px] font-black ring-1 ${mate.ticketPrice == null
                                ? 'text-zinc-700 dark:text-zinc-200 ring-zinc-200 dark:ring-zinc-600 bg-zinc-100/90 dark:bg-zinc-800/90'
                                : mate.ticketPrice === 0
                                  ? 'text-emerald-700 dark:text-emerald-200 bg-gradient-to-r from-emerald-100/70 to-emerald-100/45 dark:from-emerald-500/15 dark:to-emerald-500/20 ring-emerald-300/70 dark:ring-emerald-400/35'
                                  : 'text-amber-800 dark:text-amber-100 bg-gradient-to-r from-amber-100/80 to-amber-100/55 dark:from-amber-500/20 dark:to-amber-500/15 ring-amber-300/70 dark:ring-amber-400/35'
                              }`}>
                                {mate.ticketPrice == null ? '협의' : ticketLabel}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </section>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-[#2ecc71]" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">팀 순위</h2>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-card border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 shadow-sm">
                  <Button
                    aria-label={`${rankingSeasonYear - 1}시즌 팀 순위 보기`}
                    variant="ghost"
                    size="icon"
                    onClick={onLoadPreviousRankingSeason}
                    className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[16px] font-bold w-12 text-center text-zinc-900 dark:text-zinc-200">
                    {rankingSeasonYear}
                  </span>
                  <Button
                    aria-label={`${rankingSeasonYear + 1}시즌 팀 순위 보기`}
                    variant="ghost"
                    size="icon"
                    onClick={onLoadNextRankingSeason}
                    disabled={rankingSeasonYear >= currentYear}
                    className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Card className={`overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-card rounded-2xl ${teamRankingCardHeightClass} lg:overflow-y-auto`}>
                {isRankingsLoading ? (
                  <div className="p-8 space-y-4">
                    <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                    <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                    <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                  </div>
                ) : rankingsError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-zinc-700 dark:text-zinc-300 font-bold mb-4">
                      팀 순위를 불러오는 중 문제가 발생했습니다.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetryRanking}
                      className="border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white bg-transparent font-semibold"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      다시 시도
                    </Button>
                  </div>
                ) : displayedRankings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <p className="text-zinc-900 dark:text-zinc-200 font-semibold mb-2">
                      {rankingDataVisibilityMessage}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-500 text-[16px] font-semibold">
                      {rankingStatusHintMessage}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {displayedRankings.map((team) => {
                      const isTopThree = team.rank <= 3;
                      return (
                        <div
                          key={team.teamId}
                          className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 hover:bg-slate-100 dark:hover:bg-zinc-800/40 transition-colors ${homeDashboardRankingRowClass} ${isTopThree ? 'border-l border-l-[#2ecc71]/40' : ''}`}
                        >
                          <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                            <span className={`w-5 text-center text-[16px] font-black flex-shrink-0 ${isTopThree ? 'text-[#2ecc71]' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                {team.rank}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-white rounded-full p-1.25 shadow-sm flex-shrink-0">
                                <TeamLogo team={team.displayName} teamId={team.teamId} size={28} className="object-contain" />
                              </div>
                              <span className="font-bold text-[16px] sm:text-[16px] leading-tight min-w-0 truncate text-gray-900 dark:text-zinc-100">
                                {team.displayName}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2 sm:gap-3 whitespace-nowrap text-right">
                            <span className="font-bold text-gray-900 dark:text-white text-[16px] sm:text-[16px] leading-none tracking-tight tabular-nums">
                              {team.winRate}
                            </span>
                            {team.gamesBehind != null && (
                              <span className="text-[16px] text-zinc-500 dark:text-zinc-400 tabular-nums w-7 text-center font-semibold">
                                {team.rank === 1 ? '-' : team.gamesBehind % 1 === 0 ? team.gamesBehind.toFixed(0) : team.gamesBehind.toFixed(1)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-[16px] font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap tabular-nums">
                                <span className="text-zinc-900 dark:text-zinc-200 font-bold">{team.wins}승</span>
                                <span className="text-zinc-500 dark:text-zinc-300 font-semibold">·</span>
                                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{team.draws}무</span>
                                <span className="text-zinc-500 dark:text-zinc-300 font-semibold">·</span>
                                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{team.losses}패</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {Array.from({ length: rankingPlaceholderRows }).map((_, index) => (
                      <div
                        key={`team-rank-placeholder-${index}`}
                        className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 ${homeDashboardRankingRowClass} opacity-45`}
                      >
                        <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                          <span className="w-5 text-center text-[16px] font-black flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                            {displayedRankings.length + index + 1}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 rounded-full p-1.25 shadow-sm flex-shrink-0">
                              <span className="block h-2 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            </div>
                            <span className="block h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-700/80" />
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 sm:gap-3 whitespace-nowrap text-right">
                          <span className="block h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                          <span className="flex items-center gap-1.5 text-[16px] font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap tabular-nums">
                            <span className="block h-4 w-8 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                            <span className="block h-4 w-3 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                            <span className="block h-4 w-8 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
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
              className="grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl border border-zinc-200/90 bg-white p-6 text-foreground shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 dark:border-zinc-700/70 dark:bg-zinc-900 dark:ring-white/10 sm:max-w-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id={calendarDialogTitleId} className="text-lg leading-none font-semibold">
                  날짜 선택
                </h2>
                  <button
                  type="button"
                  className="rounded-md px-2 py-1 text-[16px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
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
                  onSelect={(date) => {
                    if (!date) {
                      return;
                    }
                    const nextDate = new Date(date);
                    nextDate.setHours(12, 0, 0, 0);
                    onSelectCalendarDate(nextDate);
                  }}
                  className="rounded-md border mx-auto"
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
