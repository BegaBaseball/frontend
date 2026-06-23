import { lazy, Suspense } from 'react';
import { useTodayKey } from '../../hooks/useTodayKey';
import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const RankingPrediction = lazy(() => import('../RankingPrediction'));
const PredictionStatsPanel = lazy(() => import('./PredictionStatsPanel'));

interface PredictionRankingTabProps {
  isLoggedIn: boolean;
}

export default function PredictionRankingTab({ isLoggedIn }: PredictionRankingTabProps) {
  const seasonYear = useTodayKey().slice(0, 4);

  return (
    <>
      <Card className="p-4 mb-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {seasonYear} 시즌 순위 예측
        </h3>
        <p className="text-slate-600 dark:text-white">
          나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!
        </p>
      </Card>
      <Suspense
        fallback={(
          <Card className="p-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
            <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-white">
              <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
              순위 예측 화면을 준비하고 있습니다.
            </div>
          </Card>
        )}
      >
        <RankingPrediction />
      </Suspense>
      {isLoggedIn ? (
        <Suspense fallback={null}>
          <PredictionStatsPanel />
        </Suspense>
      ) : null}
    </>
  );
}
