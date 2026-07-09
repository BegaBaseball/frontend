import { lazy, Suspense } from 'react';
import { AdminShieldIcon } from './AdminIcons';

const AdminPageRuntimeContent = lazy(() => import('./AdminPageRuntimeContent'));

const AdminPageRuntimeFallback = () => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-12 text-center text-caption text-slate-300 shadow-sm">
    관리자 패널을 준비하고 있습니다.
  </div>
);

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-15 admin-page">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="rounded-xl border border-amber-500/30 bg-slate-900 p-3 text-amber-300 shadow-sm">
              <AdminShieldIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                BEGA 관리자 콘솔
              </h1>
              <p className="text-slate-400 text-caption font-semibold mt-1">
                운영 데이터와 관리 작업을 확인합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-caption font-semibold text-emerald-400">
              실시간 모니터링
            </span>
          </div>
        </header>

        <Suspense fallback={<AdminPageRuntimeFallback />}>
          <AdminPageRuntimeContent />
        </Suspense>
      </div>
    </div>
  );
}
