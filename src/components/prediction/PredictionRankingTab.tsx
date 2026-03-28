import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/card';

const RankingPrediction = lazy(() => import('../RankingPrediction'));
const PredictionStatsPanel = lazy(() => import('./PredictionStatsPanel'));

interface PredictionRankingTabProps {
  isLoggedIn: boolean;
}

export default function PredictionRankingTab({ isLoggedIn }: PredictionRankingTabProps) {
  return (
    <>
      <Card className="p-4 mb-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-gray-100 mb-2">
          {new Date().getFullYear()} 시즌 순위 예측
        </h3>
        <p className="text-slate-600 dark:text-gray-300">
          나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!
        </p>
      </Card>
      <Suspense
        fallback={(
          <Card className="p-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
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
