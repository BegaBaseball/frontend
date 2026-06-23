import { lazy, Suspense } from 'react';

const DmInboxRuntime = lazy(() => import('./dm/DmInboxRuntime'));

const DmInboxFallback = () => (
  <div className="min-h-screen bg-background px-4 py-10 transition-colors duration-200 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-7 w-32 rounded bg-gray-200 dark:bg-secondary" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200 dark:bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-secondary" />
            <div className="h-3 w-40 rounded bg-gray-100 dark:bg-secondary/60" />
          </div>
          <div className="h-3 w-10 rounded bg-gray-100 dark:bg-secondary/60" />
        </div>
      ))}
    </div>
  </div>
);

export default function DmInboxPage() {
  return (
    <Suspense fallback={<DmInboxFallback />}>
      <DmInboxRuntime />
    </Suspense>
  );
}
