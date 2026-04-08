import { lazy, Suspense } from 'react';

import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionMatchInteractiveDataRuntime = lazy(() => import('./PredictionMatchInteractiveDataRuntime'));

export default function PredictionMatchInteractiveRuntime() {
  return (
    <Suspense
      fallback={(
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchInteractiveDataRuntime />
    </Suspense>
  );
}
