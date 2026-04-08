import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../hooks/useTheme';
import LoadingSpinner from './LoadingSpinner';

const AppShellRuntime = lazy(() => import('./AppShellRuntime'));

export default function AppBrowserShell() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="kbo-theme"
      disableTransitionOnChange
    >
      <BrowserRouter>
        <HelmetProvider>
          <Suspense
            fallback={
              <LoadingSpinner
                variant="app"
                message="화면을 준비하고 있습니다..."
                subMessage="잠시만 기다려주세요."
                minDurationMs={250}
              />
            }
          >
            <AppShellRuntime />
          </Suspense>
        </HelmetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
