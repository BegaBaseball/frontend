import { lazy, Suspense } from 'react';

const MyPageRuntime = lazy(() => import('./MyPageRuntime'));

export default function MyPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
          <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-body text-muted-foreground font-bold leading-relaxed shadow-sm">
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
