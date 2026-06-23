import { lazy, Suspense } from 'react';

const MateChatRuntime = lazy(() => import('./MateChat'));

const MateChatFallback = () => (
  <div className="min-h-screen bg-white transition-colors duration-200 dark:bg-background">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-6 py-10 text-center text-base text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-white dark:shadow-md">
        메이트 채팅을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function MateChatPage() {
  return (
    <Suspense fallback={<MateChatFallback />}>
      <MateChatRuntime />
    </Suspense>
  );
}
