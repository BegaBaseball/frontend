import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getHomeWidgetsQueryOptions } from '../../api/home';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import type { FeaturedMateCard } from '../../types/home';
import { buildDisplayableRankings } from '../../utils/homeDashboard';
import { getRankingDisplayName } from '../../utils/homeTeamNameResolution';
import HomeSecondaryPanels from './HomeSecondaryPanels';

const HOME_DASHBOARD_TEAM_COUNT = 10;
const HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS = 'h-[260px]';
const HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS = 'lg:h-[529px]';
const HOME_DASHBOARD_RANKING_ROW_CLASS = 'lg:h-[52px] lg:min-h-[52px]';
const HOME_DASHBOARD_CARD_HEIGHT_CLASS = `${HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS} ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;
const TEAM_RANKING_CARD_HEIGHT_CLASS = HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS;

interface HomeSecondaryPanelsContainerProps {
  selectedDate: Date;
  selectedDateKey: string;
  showCalendar: boolean;
  shouldMountWelcomeGuide: boolean;
  calendarDialogTitleId: string;
  loggedIn: boolean;
  userId: string | null;
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
  onNavigateToCheer,
  onNavigateToMate,
  onNavigateToCheerPost,
  onSelectFeaturedMate,
  onCloseCalendar,
  onSelectCalendarDate,
}: HomeSecondaryPanelsContainerProps) {
  const queryClient = useQueryClient();
  const [rankingSeasonOverride, setRankingSeasonOverride] = useState<number | null>(null);

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
    <HomeSecondaryPanels
      selectedDate={selectedDate}
      selectedDateKey={selectedDateKey}
      showCalendar={showCalendar}
      shouldMountWelcomeGuide={shouldMountWelcomeGuide}
      calendarDialogTitleId={calendarDialogTitleId}
      loggedIn={loggedIn}
      userId={userId}
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
  );
}
