import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';

const AppBrowserShell = lazy(() => import('./components/AppBrowserShell'));
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
      <Suspense fallback={null}>
        {ChaosRenderProbe && shouldRenderChaosProbe() ? <ChaosRenderProbe /> : null}
        <AppBrowserShell />
      </Suspense>
    </ErrorBoundary>
  );
}
