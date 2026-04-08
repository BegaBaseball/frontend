import { lazy, Suspense } from 'react';

import { Shield } from 'lucide-react';

const AdminPageRuntimeContent = lazy(() => import('./AdminPageRuntimeContent'));

const AdminPageRuntimeFallback = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-12 text-center text-sm text-slate-300 shadow-2xl">
    관리자 패널을 준비하고 있습니다.
  </div>
);

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-[15px] admin-page">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-emerald-900/10 via-transparent to-transparent" />

        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <defs>
            <pattern id="diamond-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0L100 50L50 100L0 50Z" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamond-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                ADMIN <span className="text-amber-400">CONTROL</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                BEGA Platform Management Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm text-emerald-400 font-semibold uppercase tracking-wider">
              Live Monitoring
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
