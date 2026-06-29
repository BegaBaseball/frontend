import { lazy, Suspense } from 'react';

const OffSeasonListRuntime = lazy(() => import('./OffSeasonList'));

const OffSeasonListFallback = () => (
  <div className="min-h-screen bg-[#f4f7f5] pb-24 transition-colors dark:bg-[#000000]">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:gap-8 md:py-10">
      <div className="h-11 w-40 rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="rounded-32 bg-[#173b34] px-6 py-8 shadow-[0_24px_80px_-32px_rgba(16,37,32,0.9)]">
        <div className="h-5 w-32 rounded-full bg-white/15" />
        <div className="mt-4 h-14 max-w-md rounded-2xl bg-white/10" />
        <div className="mt-3 h-6 max-w-lg rounded-xl bg-white/10" />
      </div>
      <div className="h-48 animate-pulse rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="h-[420px] animate-pulse rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  </div>
);

export default function OffSeasonListPage() {
  return (
    <Suspense fallback={<OffSeasonListFallback />}>
      <OffSeasonListRuntime />
    </Suspense>
  );
}
