import { lazy, Suspense, type SVGProps } from 'react';

import { Card } from '../ui/card';

const PredictionMatchInteractiveDataRuntime = lazy(() => import('./PredictionMatchInteractiveDataRuntime'));

function InteractiveLoaderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  );
}

export default function PredictionMatchInteractiveRuntime() {
  return (
    <Suspense
      fallback={(
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
            <InteractiveLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchInteractiveDataRuntime />
    </Suspense>
  );
}
