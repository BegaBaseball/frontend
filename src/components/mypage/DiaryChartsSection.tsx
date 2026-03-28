import type { DiaryStatistics } from '../../types/diary';
import WinRateChart from './WinRateChart';
import MonthlyStatsChart from './MonthlyStatsChart';
import DayOfWeekChart from './DayOfWeekChart';
import OpponentWinRateChart from './OpponentWinRateChart';

interface DiaryChartsSectionProps {
  statistics: DiaryStatistics;
  monthlyData: { month: string; count: number }[];
}

export default function DiaryChartsSection({
  statistics,
  monthlyData,
}: DiaryChartsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-[350px]">
          <WinRateChart
            wins={statistics.totalWins}
            draws={statistics.totalDraws}
            losses={statistics.totalLosses}
            winRate={statistics.winRate}
          />
        </div>

        <div className="lg:col-span-1 h-[350px]">
          <OpponentWinRateChart opponentStats={statistics.opponentWinRates || {}} />
        </div>

        <div className="lg:col-span-1 h-[350px]">
          <MonthlyStatsChart data={monthlyData} />
        </div>
      </div>

      {Object.keys(statistics.dayOfWeekStats || {}).length > 0 && (
        <div className="h-[350px]">
          <DayOfWeekChart dayOfWeekStats={statistics.dayOfWeekStats} />
        </div>
      )}
    </>
  );
}
