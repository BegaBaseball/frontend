import { lazy, Suspense } from 'react';
import type { HomeProps } from '../types/home';

const HomeRuntime = lazy(() => import('./HomeRuntime'));

export default function Home({ onNavigate }: HomeProps) {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300 pb-20">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="rounded-2xl border border-gray-100 bg-white/70 p-6 text-center text-sm text-gray-500 shadow-sm dark:border-white/15 dark:bg-card/45 dark:text-gray-300">
              홈 화면을 준비하고 있습니다.
            </div>
          </main>
        </div>
      )}
    >
      <HomeRuntime onNavigate={onNavigate} />
    </Suspense>
  );
}
