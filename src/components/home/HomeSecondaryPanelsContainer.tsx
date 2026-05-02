import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getHomeWidgetsQueryOptions } from '../../api/home';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import type { FeaturedMateCard } from '../../types/home';
import { buildDisplayableRankings } from '../../utils/homeDashboard';
import { getRankingDisplayName } from '../../utils/homeTeamNameResolution';
const HomeSecondaryPanels = lazy(() => import('./HomeSecondaryPanels'));

const HOME_DASHBOARD_TEAM_COUNT = 10;
const HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS = 'min-h-[238px]';
const HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS = 'lg:h-[650px]';
const HOME_DASHBOARD_RANKING_ROW_CLASS = 'xl:h-[65px] xl:min-h-[65px]';
const HOME_DASHBOARD_CARD_HEIGHT_CLASS = `${HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS} ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;
const TEAM_RANKING_CARD_HEIGHT_CLASS = `min-h-[320px] ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;

interface HomeSecondaryPanelsContainerProps {
  selectedDate: Date;
  selectedDateKey: string;
  showCalendar: boolean;
  shouldMountWelcomeGuide: boolean;
  calendarDialogTitleId: string;
  loggedIn: boolean;
  userId: string | null;
  suppressRecoveryActions?: boolean;
  onNavigateToCheer: () => void;
  onNavigateToMate: () => void;
  onNavigateToCheerPost: (postId: number) => void;
  onSelectFeaturedMate: (mate: FeaturedMateCard) => void;
  onCloseCalendar: () => void;
  onSelectCalendarDate: (date: Date) => void;
}

export default function HomeSecondaryPanelsContainer({
  selectedDate,
  selectedDateKey,
  showCalendar,
  shouldMountWelcomeGuide,
  calendarDialogTitleId,
  loggedIn,
  userId,
  suppressRecoveryActions = false,
  onNavigateToCheer,
  onNavigateToMate,
  onNavigateToCheerPost,
  onSelectFeaturedMate,
  onCloseCalendar,
  onSelectCalendarDate,
}: HomeSecondaryPanelsContainerProps) {
  const queryClient = useQueryClient();
  const [rankingSeasonOverride, setRankingSeasonOverride] = useState<number | null>(null);
  const homeSecondaryPanelsFallback = (
    <div className="space-y-5" data-testid="home-secondary-panels">
      <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">실시간 인기 응원글</h3>
              <div className={`min-h-[238px] rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-card/70 ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`} />
            </section>
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">직관 메이트 찾기</h3>
              <div className={`min-h-[238px] rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-card/70 ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`} />
            </section>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">팀 순위</h2>
            <div className={`min-h-[320px] rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-card/70 ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`} />
          </section>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setRankingSeasonOverride(null);
  }, [selectedDateKey]);

  const widgetsQuery = useQuery({
    ...getHomeWidgetsQueryOptions(selectedDate),
    refetchOnWindowFocus: false,
  });

  const rankingOverrideQuery = useQuery({
    ...getHomeWidgetsQueryOptions(selectedDate, rankingSeasonOverride ?? undefined),
    enabled: rankingSeasonOverride != null,
    refetchOnWindowFocus: false,
  });

  const widgetsData = widgetsQuery.data;
  const rankingSnapshot = rankingSeasonOverride == null
    ? widgetsData?.rankingSnapshot ?? null
    : rankingOverrideQuery.data?.rankingSnapshot ?? null;
  const rankingSeasonYear = rankingSnapshot?.rankingSeasonYear
    ?? rankingSeasonOverride
    ?? selectedDate.getFullYear();
  const currentYear = new Date().getFullYear();

  const displayableRankings = useMemo(
    () => buildDisplayableRankings(rankingSnapshot?.rankings ?? [], getRankingDisplayName),
    [rankingSnapshot?.rankings],
  );
  const displayedRankings = displayableRankings.slice(0, HOME_DASHBOARD_TEAM_COUNT);
  const rankingPlaceholderRows = Math.max(0, HOME_DASHBOARD_TEAM_COUNT - displayedRankings.length);

  const widgetsFailedWithoutData = widgetsQuery.isError && !widgetsData;
  const rankingFailedWithoutData = rankingSeasonOverride == null
    ? widgetsFailedWithoutData
    : rankingOverrideQuery.isError && !rankingOverrideQuery.data;
  const isHotCheerLoading = widgetsQuery.isLoading && !widgetsData;
  const isFeaturedMatesLoading = widgetsQuery.isLoading && !widgetsData;
  const isRankingsLoading = rankingSeasonOverride == null
    ? widgetsQuery.isLoading && !widgetsData
    : rankingOverrideQuery.isLoading && !rankingOverrideQuery.data;
  const hotCheerPosts = widgetsData?.hotCheerPosts ?? [];
  const featuredMates = widgetsData?.featuredMates ?? [];
  const hotCheerError = widgetsFailedWithoutData ? '인기 응원글을 불러오지 못했습니다.' : null;
  const featuredMatesError = widgetsFailedWithoutData ? '직관 메이트 목록을 불러오지 못했습니다.' : null;
  const rankingSourceMessage = rankingSnapshot?.rankingSourceMessage ?? '';
  const rankingDataVisibilityMessage = displayableRankings.length === 0 && (rankingSnapshot?.rankings.length ?? 0) > 0
    ? '순위 데이터에서 정규 팀이 아닌 항목이 감지되어 표시 가능한 팀 순위가 없습니다.'
    : (rankingSourceMessage || '현재 시즌의 팀 순위 집계 데이터가 없습니다.');
  const rankingStatusHintMessage = rankingSnapshot?.isOffSeason
    ? '현재는 비시즌이므로 이전 시즌 순위를 표시하고 있습니다.'
    : '현재 시즌이 시작된 상태입니다. 시즌 순위는 경기 결과 집계 후 표시됩니다.';

  const handleRetryWidgets = () => {
    void widgetsQuery.refetch();
  };

  const handleRetryRanking = () => {
    if (rankingSeasonOverride == null) {
      void widgetsQuery.refetch();
      return;
    }
    void rankingOverrideQuery.refetch();
  };

  const handleSelectFeaturedMate = (mate: FeaturedMateCard) => {
    seedMatePartyQueryData(queryClient, mate);
    onSelectFeaturedMate(mate);
  };

  return (
    <Suspense fallback={homeSecondaryPanelsFallback}>
      <HomeSecondaryPanels
        selectedDate={selectedDate}
        showCalendar={showCalendar}
        shouldMountWelcomeGuide={shouldMountWelcomeGuide}
        calendarDialogTitleId={calendarDialogTitleId}
        loggedIn={loggedIn}
        userId={userId}
        suppressRecoveryActions={suppressRecoveryActions}
        currentYear={currentYear}
        isHotCheerLoading={isHotCheerLoading}
        hotCheerError={hotCheerError}
        hotCheerPosts={hotCheerPosts}
        isFeaturedMatesLoading={isFeaturedMatesLoading}
        featuredMatesError={featuredMatesError}
        featuredMates={featuredMates}
        rankingSeasonYear={rankingSeasonYear}
        isRankingsLoading={isRankingsLoading}
        rankingsError={rankingFailedWithoutData}
        displayedRankings={displayedRankings}
        rankingDataVisibilityMessage={rankingDataVisibilityMessage}
        rankingStatusHintMessage={rankingStatusHintMessage}
        rankingPlaceholderRows={rankingPlaceholderRows}
        homeDashboardCardHeightClass={HOME_DASHBOARD_CARD_HEIGHT_CLASS}
        teamRankingCardHeightClass={TEAM_RANKING_CARD_HEIGHT_CLASS}
        homeDashboardRankingRowClass={HOME_DASHBOARD_RANKING_ROW_CLASS}
        onRetryWidgets={handleRetryWidgets}
        onRetryRanking={handleRetryRanking}
        onLoadPreviousRankingSeason={() => {
          setRankingSeasonOverride(rankingSeasonYear - 1);
        }}
        onLoadNextRankingSeason={() => {
          if (rankingSeasonYear >= currentYear) {
            return;
          }
          setRankingSeasonOverride(rankingSeasonYear + 1);
        }}
        onNavigateToCheer={onNavigateToCheer}
        onNavigateToMate={onNavigateToMate}
        onNavigateToCheerPost={onNavigateToCheerPost}
        onSelectFeaturedMate={handleSelectFeaturedMate}
        onCloseCalendar={onCloseCalendar}
        onSelectCalendarDate={onSelectCalendarDate}
      />
    </Suspense>
  );
}
