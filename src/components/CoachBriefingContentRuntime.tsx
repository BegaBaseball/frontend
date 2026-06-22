import { lazy, Suspense } from 'react';

import type { CoachBriefingContentRuntimeProps } from './CoachBriefingContentCardRuntime';

const CoachBriefingContentCardRuntime = lazy(() => import('./CoachBriefingContentCardRuntime'));

function CoachBriefingContentFallback() {
  return (
    <div
      data-testid="coach-briefing-card"
      className="relative mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl dark:border-border dark:bg-card dark:text-white"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-white/[0.06]" />
          <div className="h-4 w-11/12 rounded bg-gray-100 dark:bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

export default function CoachBriefingContentRuntime(props: CoachBriefingContentRuntimeProps) {
  return (
    <Suspense fallback={<CoachBriefingContentFallback />}>
      <CoachBriefingContentCardRuntime {...props} />
    </Suspense>
  );
}
