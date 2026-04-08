import { lazy, Suspense } from 'react';

const MateDetailRuntime = lazy(() => import('./MateDetailRuntime'));

export default function MateDetail() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-background dark:text-foreground">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-gray-300 dark:shadow-md">
              메이트 상세를 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      <MateDetailRuntime />
    </Suspense>
  );
}
