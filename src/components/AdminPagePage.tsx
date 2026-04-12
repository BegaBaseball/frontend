import { lazy, Suspense } from 'react';

const AdminPageRuntime = lazy(() => import('./AdminPage'));

const AdminPageFallback = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-10 text-center text-[14px] text-slate-300 shadow-xl">
        관리자 화면을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

export default function AdminPagePage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminPageRuntime />
    </Suspense>
  );
}
