import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flame, Hash, Target } from 'lucide-react';
import { Card } from '../ui/card';
import { fetchMyPredictionStats } from '../../api/prediction';

const ACCURACY_GAUGE_CIRCUMFERENCE = 2 * Math.PI * 56;

export default function PredictionStatsPanel() {
  const { data: predictionStats } = useQuery({
    queryKey: ['prediction-stats-me'],
    queryFn: fetchMyPredictionStats,
    staleTime: 5 * 60 * 1000,
  });

  const accuracyPercent = useMemo(() => {
    if (!predictionStats || !Number.isFinite(predictionStats.accuracy)) {
      return 0;
    }

    return Math.max(0, Math.min(100, predictionStats.accuracy));
  }, [predictionStats]);
  const [animatedAccuracyPercent, setAnimatedAccuracyPercent] = useState(0);

  useEffect(() => {
    setAnimatedAccuracyPercent(accuracyPercent);
  }, [accuracyPercent]);

  if (!predictionStats) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <div className="bg-slate-50/50 dark:bg-slate-950/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">나의 예측 퍼포먼스</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 p-4 sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-12 sm:p-6">
          <div className="col-span-2 flex flex-col items-center justify-center pb-1 sm:col-span-1 sm:shrink-0 sm:pb-0">
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-1.5">
              <svg
                className="w-full h-full transform -rotate-90 absolute top-0 left-0"
                viewBox="0 0 128 128"
                preserveAspectRatio="xMidYMid meet"
              >
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="14"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray={ACCURACY_GAUGE_CIRCUMFERENCE}
                  strokeDashoffset={
                    ACCURACY_GAUGE_CIRCUMFERENCE
                    - (animatedAccuracyPercent / 100) * ACCURACY_GAUGE_CIRCUMFERENCE
                  }
                  strokeLinecap="round"
                  className="text-indigo-500 dark:text-indigo-400 transition-all duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                />
              </svg>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] flex items-baseline gap-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none">
                  {animatedAccuracyPercent.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none">%</span>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 leading-none">전체 적중률</p>
          </div>

          <div className="hidden sm:block w-px h-16 bg-slate-200 dark:bg-slate-700/50 shrink-0" />

          <div className="col-span-2 grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-10 sm:shrink-0">
            <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-center dark:border-slate-800 dark:bg-slate-950/40 sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-left">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Hash className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs font-semibold">총 예측</span>
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-0.5 sm:justify-start">
                <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                  {predictionStats.totalPredictions}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-slate-400">회</span>
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-center dark:border-slate-800 dark:bg-slate-950/40 sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-left">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs font-semibold">적중</span>
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-0.5 sm:justify-start">
                <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                  {predictionStats.correctPredictions}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-slate-400">회</span>
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-center dark:border-slate-800 dark:bg-slate-950/40 sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-left">
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-500">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs font-semibold">연속 적중</span>
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-0.5 sm:justify-start">
                <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums leading-none">
                  {predictionStats.streak}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-orange-500/70">연</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
