import { lazy, Suspense } from 'react';
import AppBrowserShell from './components/AppBrowserShell';
import ErrorBoundary from './components/common/ErrorBoundary';

const ChaosRenderProbe = import.meta.env.DEV
  ? lazy(() => import('./components/debug/ChaosRenderProbe'))
  : null;

const shouldRenderChaosProbe = () => (
  import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('chaos') === 'render-error'
);

export default function App() {
  return (
    <ErrorBoundary>
      {ChaosRenderProbe && shouldRenderChaosProbe() ? (
        <Suspense fallback={null}>
          <ChaosRenderProbe />
        </Suspense>
      ) : null}
      <AppBrowserShell />
    </ErrorBoundary>
  );
}
