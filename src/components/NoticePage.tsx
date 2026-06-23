import { lazy, Suspense } from 'react';

const NoticePageRuntime = lazy(() => import('./NoticePageRuntime'));

export default function NoticePage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-white transition-colors duration-200 dark:bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-[16px] text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md">
              공지사항을 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      <NoticePageRuntime />
    </Suspense>
  );
}
