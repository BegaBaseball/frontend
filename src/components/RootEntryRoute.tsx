import { lazy, Suspense, useEffect } from 'react';

import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  shouldAttemptRootAuthBootstrap,
} from '../utils/authBootstrap';
import { requestLoadTrace } from '../utils/requestLoadTrace';

const landingModulePromise = import('./Landing');
const Landing = lazy(() => landingModulePromise);
const RootEntryRouteAuthAware = lazy(() => import('./RootEntryRouteAuthAware'));

const landingFallback = (
  <main className="min-h-screen bg-background text-foreground" aria-label="첫 화면 준비 중" />
);

export default function RootEntryRoute() {
  const shouldUseAuthAwareRoute = shouldAttemptRootAuthBootstrap({
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  });

  useEffect(() => {
    if (!shouldUseAuthAwareRoute) {
      requestLoadTrace('RootEntryRoute:anonymousLanding');
    }
  }, [shouldUseAuthAwareRoute]);

  if (shouldUseAuthAwareRoute) {
    return (
      <Suspense fallback={landingFallback}>
        <RootEntryRouteAuthAware />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={landingFallback}>
      <Landing />
    </Suspense>
  );
}
