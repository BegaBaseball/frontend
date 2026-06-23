import { lazy, Suspense } from 'react';

const OffSeasonHomeRuntime = lazy(() => import('./OffSeasonHome'));

const OffSeasonHomeFallback = () => (
  <div className="min-h-screen bg-gray-50 px-4 py-6 transition-colors dark:bg-background sm:px-6 md:px-6 md:py-8">
    <div className="space-y-8 md:space-y-12">
      <div className="h-11 w-44 rounded-full border-2 border-primary/20 bg-white dark:bg-card" />
      <div className="rounded-3xl bg-primary px-6 py-10 shadow-xl">
        <div className="h-5 w-36 rounded-full bg-white/20" />
        <div className="mt-4 h-12 max-w-md rounded-2xl bg-white/15" />
        <div className="mt-3 h-6 max-w-sm rounded-xl bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-3xl border border-gray-200 bg-white dark:border-border dark:bg-card"
          />
        ))}
      </div>
    </div>
  </div>
);

export default function OffSeasonHomePage() {
  return (
    <Suspense fallback={<OffSeasonHomeFallback />}>
      <OffSeasonHomeRuntime />
    </Suspense>
  );
}
