import { lazy, Suspense } from 'react';

const LeaderboardPageRuntime = lazy(() => import('./LeaderboardPageRuntime'));

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#fdf6e3] px-4 py-8 text-[#2f2a20]">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-[#d4b98f] bg-[#f4e3b5] px-6 py-10 text-center text-sm shadow-[0_6px_0_#b08b57]">
              리더보드를 준비하고 있습니다.
            </div>
          </div>
        </div>
      )}
    >
      <LeaderboardPageRuntime />
    </Suspense>
  );
}
