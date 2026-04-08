import { lazy, Suspense } from 'react';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchScheduleDataRuntime = lazy(() => import('./PredictionMatchScheduleDataRuntime'));

export default function PredictionMatchScheduleRuntime() {
  return (
    <div className="font-sans">
      <Suspense
        fallback={(
          <Suspense fallback={null}>
            <PredictionLoadingView topNotice={null} />
          </Suspense>
        )}
      >
        <PredictionMatchScheduleDataRuntime />
      </Suspense>
    </div>
  );
}
