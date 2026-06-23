import { lazy, Suspense } from 'react';
import './StadiumGuide.css';

const StadiumGuideRuntime = lazy(() => import('./StadiumGuideRuntime'));

export default function StadiumGuide() {
  return (
    <Suspense
      fallback={(
        <div className="stadium-guide-page min-h-screen bg-white dark:bg-background transition-colors duration-200">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="stadium-guide-panel rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-[16px] text-slate-500 shadow-sm dark:text-white dark:shadow-md">
              구장 가이드를 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      <StadiumGuideRuntime />
    </Suspense>
  );
}
