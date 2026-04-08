import { lazy, Suspense } from 'react';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchScheduleDataContent = lazy(() => import('./PredictionMatchScheduleDataContent'));

export default function PredictionMatchScheduleDataRuntime() {
  return (
    <div className="font-sans">
      <Suspense
        fallback={(
          <Suspense fallback={null}>
            <PredictionLoadingView topNotice={null} />
          </Suspense>
        )}
      >
        <PredictionMatchScheduleDataContent />
      </Suspense>
    </div>
  );
}
