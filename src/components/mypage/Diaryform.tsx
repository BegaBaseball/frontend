import { lazy, Suspense } from 'react';

const DiaryformRuntime = lazy(() => import('./DiaryformRuntime'));

const diaryViewFallback = (
  <div className="rounded-2xl bg-primary p-6 text-center text-[16px] text-primary-foreground md:rounded-3xl md:p-8">
    직관 기록을 불러오는 중입니다.
  </div>
);

export default function DiaryViewSection() {
  return (
    <Suspense fallback={diaryViewFallback}>
      <DiaryformRuntime />
    </Suspense>
  );
}
