import { lazy, Suspense } from 'react';

import PredictionLoadingView from './PredictionLoadingView';

const PredictionMatchScheduleDataContent = lazy(() => import('./PredictionMatchScheduleDataContent'));

export default function PredictionMatchScheduleDataRuntime() {
  return (
    <div className="font-sans">
      <Suspense fallback={<PredictionLoadingView topNotice={null} />}>
        <PredictionMatchScheduleDataContent />
      </Suspense>
    </div>
  );
}
