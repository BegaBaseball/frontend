import { lazy, Suspense } from 'react';

const MyPageRuntime = lazy(() => import('./MyPageRuntime'));

export default function MyPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
          <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-gray-300 dark:shadow-md">
              마이페이지를 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      <MyPageRuntime />
    </Suspense>
  );
}
