import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import PublicNavbar from './PublicNavbar';
const Navbar = lazy(() => import('./Navbar'));
const AuthenticatedLayoutChrome = lazy(() => import('./AuthenticatedLayoutChrome'));
const Footer = lazy(() => import('./Footer'));

type LayoutProps = {
  authenticated?: boolean;
};

export default function Layout({ authenticated = true }: LayoutProps) {
  const [isFooterRequested, setIsFooterRequested] = useState(false);
  const location = useLocation();

  const shouldShowChatLauncher = authenticated || /^\/home\/?$/.test(location.pathname);

  useEffect(() => {
    requestLoadTrace(`Layout mount authenticated=${authenticated}`);

    return () => {
      requestLoadTrace(`Layout unmount authenticated=${authenticated}`);
    };
  }, [authenticated]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let idleId: number | undefined;

    const requestFooter = () => {
      setIsFooterRequested(true);
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(requestFooter, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(requestFooter, 450);
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <>
      {authenticated ? (
        <Suspense fallback={<div className="h-16 border-b border-gray-200 dark:border-border bg-background/80 backdrop-blur-md" />}>
          <Navbar authenticatedShell />
        </Suspense>
      ) : (
        <PublicNavbar />
      )}
      <main className="min-h-screen bg-background text-base font-sans leading-relaxed text-foreground antialiased transition-colors duration-200">
        <Outlet /> {/* 자식 라우트 컴포넌트가 렌더링될 위치 */}
      </main>
      {isFooterRequested ? (
        <Suspense fallback={<div className="border-t border-zinc-200 dark:border-gray-800" />}>
          <Footer />
        </Suspense>
      ) : null}
      {shouldShowChatLauncher && (
        <Suspense fallback={null}>
          <AuthenticatedLayoutChrome />
        </Suspense>
      )}
    </>
  );
}
