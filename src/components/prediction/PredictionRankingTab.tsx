import { lazy, Suspense } from 'react';
import { useTodayKey } from '../../hooks/useTodayKey';
import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';
import {
  PREDICTION_BRAND_GRADIENT_CLASS,
  PREDICTION_SURFACE_CARD_CLASS,
} from './predictionUiTokens';

const RankingPrediction = lazy(() => import('../RankingPrediction'));
const PredictionStatsPanel = lazy(() => import('./PredictionStatsPanel'));

interface PredictionRankingTabProps {
  isLoggedIn: boolean;
}

export default function PredictionRankingTab({ isLoggedIn }: PredictionRankingTabProps) {
  const seasonYear = useTodayKey().slice(0, 4);

  return (
    <>
      <Card className={`${PREDICTION_SURFACE_CARD_CLASS} mb-4 overflow-hidden rounded-2xl text-center`}>
        <div className={`${PREDICTION_BRAND_GRADIENT_CLASS} px-5 py-5 text-white`}>
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-13 font-semibold text-emerald-100">
            Season Ranking
          </span>
          <h3 className="mt-3 text-xl font-extrabold tracking-normal sm:text-2xl">
            {seasonYear} 시즌 최종 순위 예측
          </h3>
          <p className="mx-auto mt-2 max-w-md text-13 font-semibold leading-relaxed text-white/75 sm:text-body">
            나만의 순위를 완성하고 저장한 뒤 친구들과 공유해보세요.
          </p>
        </div>
      </Card>
      <Suspense
        fallback={(
          <Card className={`${PREDICTION_SURFACE_CARD_CLASS} rounded-2xl p-6 text-center`}>
            <div className="inline-flex items-center gap-2 text-body font-bold text-slate-500 dark:text-white">
              <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
              순위 예측 화면을 준비하고 있습니다.
            </div>
            <div aria-hidden="true" className="mx-auto mt-3 h-2 w-36 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none dark:bg-secondary" />
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
