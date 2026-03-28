import { lazy, Suspense, useMemo } from 'react';
import { Card } from '../ui/card';
import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import StatCard from './StatCard';
import EmojiStatsCard from './EmojiStatsCard';
import StadiumVisitList from './StadiumVisitList';
import BadgeShowcase from './BadgeShowcase';
import LoadingSpinner from '../LoadingSpinner';
import { Trophy, TrendingUp, BarChart3, Star, Flame } from 'lucide-react';
import ViewportDeferred from '../ViewportDeferred';

const DiaryChartsSection = lazy(() => import('./DiaryChartsSection'));

export default function DiaryStatistics() {
  const { statistics, emojiStats, isLoading, diaryEntries } = useDiaryStatistics();

  // Derived data for Monthly Chart
  const monthlyData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    diaryEntries.forEach(entry => {
      const month = entry.date.substring(5, 7); // '2023-05-12' -> '05'
      counts[month] = (counts[month] || 0) + 1;
    });

    // Create array for chart (01~12 or just active months)
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month: `${parseInt(month)}월`, count }));
  }, [diaryEntries]);

  if (isLoading) {
    return (
      <LoadingSpinner size="lg" text="통계를 불러오는 중..." fullScreen={false} />
    );
  }

  const chartSkeleton = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-[350px] bg-card animate-pulse" />
        ))}
      </div>
      <Card className="h-[350px] bg-card animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up">
      {/* 1. 상단 요약 배지 & 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BadgeShowcase earnedBadges={statistics.earnedBadges || []} />
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full bg-gradient-to-br from-primary/10 to-muted/40 border-none shadow-md p-6 flex flex-col justify-center items-center text-center">
            <Flame className="w-10 h-10 text-orange-500 mb-2 animate-pulse" />
            <h3 className="text-sm font-medium text-muted-foreground">현재 연승/연패</h3>
            <div className="text-3xl font-black mt-1">
              {statistics.currentWinStreak > 0 ? (
                <span className="text-red-500">{statistics.currentWinStreak}연승 중! 🔥</span>
              ) : statistics.currentLossStreak > 0 ? (
                <span className="text-blue-500">{statistics.currentLossStreak}연패.. ☔</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">최장 연승: {statistics.longestWinStreak || 0}연승</p>
          </Card>
        </div>
      </div>

      {/* 2. 대시보드 요약 카드 */}
      <Card className="p-5 md:p-8 bg-card">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          <h2 className="text-lg md:text-xl font-black text-primary">
            나의 야구 기록 요약
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 pt-6 border-t border-border mt-4">
          <StatCard value={statistics.totalCount} label="총 직관 횟수" />
          <StatCard value={statistics.cheerPostCount || 0} label="작성한 응원글" />
          <StatCard value={`${statistics.winRate.toFixed(0)}%`} label="직관 승률" />
          <StatCard value={statistics.luckyDay || '-'} label="승리 요일" />
        </div>
      </Card>

      <ViewportDeferred fallback={chartSkeleton}>
        <Suspense fallback={chartSkeleton}>
          <DiaryChartsSection statistics={statistics} monthlyData={monthlyData} />
        </Suspense>
      </ViewportDeferred>

      {/* 4. 구장 & 상세 기록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px]">
          <StadiumVisitList entries={diaryEntries} />
        </div>

        <div className="space-y-6">
          <Card className="p-5 md:p-8 bg-card">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              <h2 className="text-lg md:text-xl font-black text-primary">
                기분 분석
              </h2>
            </div>
            <EmojiStatsCard stats={emojiStats} />
          </Card>

          <Card className="p-5 md:p-8 bg-card">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              <h2 className="text-lg md:text-xl font-black text-primary">
                상세 기록
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="text-muted-foreground font-medium">최다 방문 구장</span>
                <span className="font-bold text-primary">
                  {statistics.mostVisitedStadium || '-'} ({statistics.mostVisitedCount}회)
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="text-muted-foreground font-medium">가장 행복했던 달</span>
                <span className="font-bold text-primary">
                  {statistics.happiestMonth || '-'} ({statistics.happiestCount}회)
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="text-muted-foreground font-medium">상대하기 쉬운 팀</span>
                <span className="font-bold text-primary">
                  {statistics.bestOpponent || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="text-muted-foreground font-medium">상대하기 어려운 팀</span>
                <span className="font-bold text-primary">
                  {statistics.worstOpponent || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="text-muted-foreground font-medium">연간 승률</span>
                <span className="font-bold text-primary">
                  {statistics.yearlyWinRate?.toFixed(1) || 0}% ({statistics.yearlyWins}승 / {statistics.yearlyCount}경기)
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
