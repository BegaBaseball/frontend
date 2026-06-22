import { Suspense } from 'react';

import ScrollToTop from './ScrollToTop';
import AuthBootstrapGate from './AuthBootstrapGate';
import SeoHead from '../seo/SeoHead';
import AppRoutes from './AppRoutes';
import DeferredPretendardFont from './DeferredPretendardFont';

const appRoutesFallback = (
  <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
      <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center text-base text-muted-foreground shadow-sm">
        페이지를 준비하고 있습니다.
      </div>
    </div>
  </main>
);

export default function AppShellRuntime() {
  return (
    <>
      <ScrollToTop />
      <AuthBootstrapGate />
      <SeoHead />
      <DeferredPretendardFont />
      <Suspense fallback={appRoutesFallback}>
        <AppRoutes />
      </Suspense>
    </>
  );
}
