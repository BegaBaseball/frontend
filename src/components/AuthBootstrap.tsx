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
  normalizeAuthBootstrapPathname,
  resolveAuthBootstrapMode,
} from '../utils/authBootstrap';
import {
  describeAuthError,
  shouldSkipDeferredAuthBootstrapForCypress,
  traceAuthEvent,
} from '../utils/authTrace';

const DEFERRED_PUBLIC_AUTH_BOOTSTRAP_DELAY_MS = 80;

export default function AuthBootstrap() {
  const location = useLocation();
  const bootstrapPendingRef = useRef(true);
  const deferredBootstrapAttemptKeyRef = useRef<string | null>(null);
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const normalizedPathname = normalizeAuthBootstrapPathname(location.pathname);
  const deferredBootstrapAttemptKey = `${normalizedPathname}:${isLoggedIn ? 'auth' : 'guest'}`;
  const authBootstrapMode = resolveAuthBootstrapMode(location.pathname, {
    isLoggedIn,
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  });
  const shouldSkipPublicBootstrapForCypress =
    !isLoggedIn
    && authBootstrapMode === 'defer'
    && shouldSkipDeferredAuthBootstrapForCypress();

  const setPublicAuthBootstrapPhase = (phase: 'idle' | 'scheduled' | 'running') => {
    const currentPhase = useAuthStore.getState().publicAuthBootstrapPhase;
    if (currentPhase === phase) {
      return;
    }
    useAuthStore.setState({ publicAuthBootstrapPhase: phase });
  };

  useEffect(() => {
    traceAuthEvent(
      `AuthBootstrap: pathname=${location.pathname}, mode=${authBootstrapMode}, isLoggedIn=${isLoggedIn}, isAuthLoading=${isAuthLoading}`,
    );

    if (shouldSkipPublicBootstrapForCypress) {
      traceAuthEvent(`AuthBootstrap: Cypress public skip for ${location.pathname}`);
      setPublicAuthBootstrapPhase('idle');
      if (isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }
      return;
    }

    if (authBootstrapMode === 'skip' || authBootstrapMode === 'public-home') {
      traceAuthEvent(`AuthBootstrap: path ${location.pathname} is ${authBootstrapMode}, skipping auto bootstrap`);
      setPublicAuthBootstrapPhase('idle');
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
      setPublicAuthBootstrapPhase(authBootstrapMode === 'defer' ? 'running' : 'idle');
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

      if (deferredBootstrapAttemptKeyRef.current === deferredBootstrapAttemptKey) {
        traceAuthEvent(`AuthBootstrap: defer already attempted for ${deferredBootstrapAttemptKey}, skipping`);
        return;
      }

      deferredBootstrapAttemptKeyRef.current = deferredBootstrapAttemptKey;
      setPublicAuthBootstrapPhase('scheduled');

      const timeoutId = globalThis.setTimeout(runBootstrap, DEFERRED_PUBLIC_AUTH_BOOTSTRAP_DELAY_MS);

      return () => {
        traceAuthEvent(`AuthBootstrap: defer cleanup for ${location.pathname}`);
        if (bootstrapPendingRef.current && useAuthStore.getState().publicAuthBootstrapPhase === 'scheduled') {
          deferredBootstrapAttemptKeyRef.current = null;
          setPublicAuthBootstrapPhase('idle');
        }
        globalThis.clearTimeout(timeoutId);
      };
    }

    traceAuthEvent(`AuthBootstrap: immediate bootstrap for ${location.pathname}`);
    setPublicAuthBootstrapPhase('idle');
    runBootstrap();
  }, [
    authBootstrapMode,
    deferredBootstrapAttemptKey,
    fetchProfileAndAuthenticate,
    isLoggedIn,
    location.pathname,
    shouldSkipPublicBootstrapForCypress,
  ]);

  return null;
}
