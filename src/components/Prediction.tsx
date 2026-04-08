import { lazy, Suspense } from 'react';
import { Card } from './ui/card';
import { PredictionLoaderIcon } from './prediction/PredictionShellIcons';

const PredictionRuntime = lazy(() => import('./prediction/PredictionRuntime'));

export default function Prediction() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-white font-sans dark:bg-background transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <Card className="p-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
            <div className="inline-flex items-center gap-2 text-[16px] font-semibold leading-relaxed text-slate-500 dark:text-gray-300">
                <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
                전력분석실을 준비하고 있습니다.
              </div>
            </Card>
          </div>
        </div>
      )}
    >
      <PredictionRuntime />
    </Suspense>
  );
}
