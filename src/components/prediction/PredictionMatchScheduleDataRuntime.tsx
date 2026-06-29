import { lazy, Suspense } from 'react';

import PredictionLoadingView from './PredictionLoadingView';

const predictionMatchScheduleDataContentModule = import('./PredictionMatchScheduleDataContent');
const PredictionMatchScheduleDataContent = lazy(() => predictionMatchScheduleDataContentModule);

export default function PredictionMatchScheduleDataRuntime() {
  return (
    <div className="font-sans">
      <Suspense fallback={<PredictionLoadingView topNotice={null} />}>
        <PredictionMatchScheduleDataContent />
      </Suspense>
    </div>
  );
}
