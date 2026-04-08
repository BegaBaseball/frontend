import { lazy, Suspense } from 'react';

const CheerDetailRuntime = lazy(() => import('./CheerDetail'));

const CheerDetailFallback = () => (
  <div className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-gray-300 dark:shadow-md">
        게시글 상세를 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function CheerDetailPage() {
  return (
    <Suspense fallback={<CheerDetailFallback />}>
      <CheerDetailRuntime />
    </Suspense>
  );
}
