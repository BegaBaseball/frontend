import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  shouldMountAuthBootstrapRuntime,
} from '../utils/authBootstrap';

const LazyAuthBootstrap = lazy(() => import('./AuthBootstrap'));

const hasInjectedAuthProfileForTests = (): boolean => (
  typeof window !== 'undefined'
  && Boolean((window as Window & { __BEGA_TEST_AUTH_PROFILE__?: unknown }).__BEGA_TEST_AUTH_PROFILE__)
);

const shouldSkipAuthBootstrap = (pathname: string): boolean => !shouldMountAuthBootstrapRuntime(pathname, {
  isLoggedIn: false,
  hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
  authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  hasInjectedAuthProfile: hasInjectedAuthProfileForTests(),
});

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
