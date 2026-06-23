import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  normalizeAuthBootstrapPathname,
  shouldAttemptRootAuthBootstrap,
} from '../utils/authBootstrap';

const LazyAuthBootstrap = lazy(() => import('./AuthBootstrap'));

const shouldSkipAuthBootstrap = (pathname: string): boolean => (
  normalizeAuthBootstrapPathname(pathname) === '/'
  && !shouldAttemptRootAuthBootstrap({
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  })
);

export default function AuthBootstrapGate() {
  const { pathname } = useLocation();

  if (shouldSkipAuthBootstrap(pathname)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyAuthBootstrap />
    </Suspense>
  );
}
