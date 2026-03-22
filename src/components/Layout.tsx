import { lazy, Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
const AuthenticatedLayoutChrome = lazy(() => import('./AuthenticatedLayoutChrome'));

const isLoadTraceEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('traceLoad') === '1';
};

const traceLoadEvent = (label: string) => {
  if (!isLoadTraceEnabled()) {
    return;
  }

  const now = performance.now().toFixed(2);
  performance.mark(`load-order:${label}`);
  console.info(`[load-order][${now}ms] ${label}`);
};

type LayoutProps = {
  authenticated?: boolean;
};

export default function Layout({ authenticated = true }: LayoutProps) {
  useEffect(() => {
    traceLoadEvent(`Layout mount authenticated=${authenticated}`);

    return () => {
      traceLoadEvent(`Layout unmount authenticated=${authenticated}`);
    };
  }, [authenticated]);

  return (
    <>
      <Navbar authenticatedShell={authenticated} />
      <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Outlet /> {/* 자식 라우트 컴포넌트가 렌더링될 위치 */}
      </main>
      <Footer />
      {authenticated && (
        <Suspense fallback={null}>
          <AuthenticatedLayoutChrome />
        </Suspense>
      )}
    </>
  );
}
