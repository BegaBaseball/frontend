import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useAuthProfileActions,
  useAuthSession,
  useAuthStore,
} from '../store/authStore';
import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  resolveAuthBootstrapMode,
} from '../utils/authBootstrap';
import {
  describeAuthError,
  shouldSkipDeferredAuthBootstrapForCypress,
  traceAuthEvent,
} from '../utils/authTrace';

export default function AuthBootstrap() {
  const location = useLocation();
  const bootstrapPendingRef = useRef(true);
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const authBootstrapMode = resolveAuthBootstrapMode(location.pathname, {
    isLoggedIn,
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  });

  useEffect(() => {
    traceAuthEvent(
      `AuthBootstrap: pathname=${location.pathname}, mode=${authBootstrapMode}, isLoggedIn=${isLoggedIn}, isAuthLoading=${isAuthLoading}`,
    );

    if (authBootstrapMode === 'defer' && shouldSkipDeferredAuthBootstrapForCypress()) {
      traceAuthEvent(`AuthBootstrap: Cypress skip for ${location.pathname}`);
      if (isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }
      return;
    }

    if (authBootstrapMode === 'skip' || authBootstrapMode === 'public-home') {
      traceAuthEvent(`AuthBootstrap: path ${location.pathname} is ${authBootstrapMode}, skipping auto bootstrap`);
      if (!isLoggedIn && isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }
      return;
    }

    if (!bootstrapPendingRef.current) {
      return;
    }

    const runBootstrap = () => {
      if (!bootstrapPendingRef.current) {
        return;
      }
      bootstrapPendingRef.current = false;
      traceAuthEvent(`AuthBootstrap: fetching profile for ${location.pathname}`);
      void fetchProfileAndAuthenticate({
        mode: authBootstrapMode === 'defer' ? 'public-optional' : 'default',
      })
        .then((isAuthenticated) => {
          traceAuthEvent(`AuthBootstrap: fetchProfileAndAuthenticate resolved isAuthenticated=${isAuthenticated}`);
        })
        .catch((error) => {
          traceAuthEvent(`AuthBootstrap: fetchProfileAndAuthenticate failed: ${describeAuthError(error)}`);
        });
    };

    if (authBootstrapMode === 'defer') {
      traceAuthEvent(`AuthBootstrap: defer scheduling for ${location.pathname}`);
      if (!isLoggedIn && isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }

      let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
      let idleId: number | undefined;

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(runBootstrap, { timeout: 1500 });
      } else {
        timeoutId = globalThis.setTimeout(runBootstrap, 800);
      }

      return () => {
        traceAuthEvent(`AuthBootstrap: defer cleanup for ${location.pathname}`);
        if (idleId !== undefined && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleId);
        }
        if (timeoutId !== undefined) {
          globalThis.clearTimeout(timeoutId);
        }
      };
    }

    traceAuthEvent(`AuthBootstrap: immediate bootstrap for ${location.pathname}`);
    runBootstrap();
  }, [authBootstrapMode, fetchProfileAndAuthenticate, isAuthLoading, isLoggedIn, location.pathname]);

  return null;
}
