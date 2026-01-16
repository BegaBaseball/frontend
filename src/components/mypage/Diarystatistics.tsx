import { useMemo } from 'react';
import { Card } from '../ui/card';
import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import StatCard from './StatCard';
import EmojiStatsCard from './EmojiStatsCard';
import WinRateChart from './WinRateChart';
import MonthlyStatsChart from './MonthlyStatsChart';
import StadiumVisitList from './StadiumVisitList';
import { Trophy, TrendingUp, BarChart3, MapPin } from 'lucide-react';

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
    // Let's show active months sorted
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month: `${parseInt(month)}월`, count }));
  }, [diaryEntries]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: '#2d5f4f' }}
        ></div>
        <p className="text-gray-600">통계를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up">
      {/* 1. 상단 요약 카드 - 대시보드 스타일 */}
      <Card className="p-5 md:p-8 bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-emerald-900/20 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 md:w-7 md:h-7 text-[#2d5f4f] dark:text-emerald-400" />
          <h2 className="text-lg md:text-xl font-black text-[#2d5f4f] dark:text-emerald-400">
            나의 야구 기록 요약
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 pt-6 border-t border-gray-200 dark:border-gray-700 mt-4">
          <StatCard value={statistics.totalCount} label="총 직관 횟수" />
          <StatCard value={statistics.cheerPostCount || 0} label="작성한 응원글" />
          <StatCard value={`${statistics.winRate.toFixed(0)}%`} label="직관 승률" />
          <StatCard value={statistics.mateParticipationCount || 0} label="메이트 참여" />
        </div>
      </Card>

      {/* 2. 대시보드 스타일 그리드 - 승률, 구장, 월별 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 승률 차트 */}
        <div className="lg:col-span-1 h-[350px]">
          <WinRateChart
            wins={statistics.totalWins}
            draws={statistics.totalDraws}
            losses={statistics.totalLosses}
            winRate={statistics.winRate}
          />
        </div>

        {/* 구장 도장 깨기 */}
        <div className="lg:col-span-1 h-[350px]">
          <StadiumVisitList entries={diaryEntries} />
        </div>

        {/* 월별 추이 - 데스크탑에서 옆에 배치 */}
        <div className="lg:col-span-1 h-[350px]">
          <MonthlyStatsChart data={monthlyData} />
        </div>
      </div>

      {/* 3. 하단 정보 영역 - 기분 분석 + 상세 기록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기분 통계 */}
        <Card className="p-5 md:p-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-[#2d5f4f] dark:text-emerald-400" />
            <h2 className="text-lg md:text-xl font-black text-[#2d5f4f] dark:text-emerald-400">
              기분 분석
            </h2>
          </div>
          <EmojiStatsCard stats={emojiStats} />
        </Card>

        {/* 상세 기록 */}
        <Card className="p-5 md:p-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-[#2d5f4f] dark:text-emerald-400" />
            <h2 className="text-lg md:text-xl font-black text-[#2d5f4f] dark:text-emerald-400">
              상세 기록
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">가장 많이 방문한 구장</span>
              <span className="font-bold text-[#2d5f4f] dark:text-emerald-400">
                {statistics.mostVisitedStadium || '-'} ({statistics.mostVisitedCount}회)
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">가장 행복했던 달</span>
              <span className="font-bold text-[#2d5f4f] dark:text-emerald-400">
                {statistics.happiestMonth || '-'} ({statistics.happiestCount}회)
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">첫 직관 날짜</span>
              <span className="font-bold text-[#2d5f4f] dark:text-emerald-400">
                {statistics.firstDiaryDate || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">연간 승률</span>
              <span className="font-bold text-[#2d5f4f] dark:text-emerald-400">
                {statistics.yearlyWinRate?.toFixed(1) || 0}% ({statistics.yearlyWins}승 / {statistics.yearlyCount}경기)
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
