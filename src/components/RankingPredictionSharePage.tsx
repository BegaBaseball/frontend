import { lazy, Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

const RankingPredictionShareRuntime = lazy(() => import('./RankingPredictionShare'));

export default function RankingPredictionSharePage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="공유 예측을 준비하고 있습니다..." fullScreen={false} />}>
      <RankingPredictionShareRuntime />
    </Suspense>
  );
}
