import { lazy, Suspense, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import { queryClient } from '../lib/queryClient';
import GlobalErrorDialog from './GlobalErrorDialog';
import {
  useAuthAccessActions,
  useAuthDialogState,
  useAuthProfileSnapshot,
  useAuthRedirectState,
  useAuthSession,
} from '../store/authStore';
import PredictionQueryGuard from './PredictionQueryGuard';

const LoginRequiredDialog = lazy(() =>
  import('./LoginRequiredDialog').then((module) => ({
    default: module.LoginRequiredDialog,
  }))
);

export default function AppQueryProvider() {
  const { userId } = useAuthProfileSnapshot();
  const { isLoggedIn } = useAuthSession();
  const { logout, requireLogin } = useAuthAccessActions();
  const { showLoginRequiredDialog, setShowLoginRequiredDialog } = useAuthDialogState();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();

  useEffect(() => {
    let cancelled = false;

    void import('../utils/clientErrorReporter').then(({ setClientErrorReporterUserContext }) => {
      if (!cancelled) {
        setClientErrorReporterUserContext({ userId });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('../utils/clientErrorReporter').then(({ installGlobalErrorListeners }) => {
      if (cancelled) {
        return;
      }
      cleanup = installGlobalErrorListeners();
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown> | undefined>).detail;
      if (detail) {
        console.warn('[auth] session expired', detail);
      }
      logout(true);
      requireLogin();
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, [logout, requireLogin]);

  useEffect(() => {
    const handleInvalidAuthor = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail as { responseCode?: string } | undefined;
      if (detail?.responseCode === 'INVALID_AUTHOR') {
        requireLogin();
      }
    };

    window.addEventListener('global-api-error', handleInvalidAuthor);
    return () => window.removeEventListener('global-api-error', handleInvalidAuthor);
  }, [requireLogin]);

  useEffect(() => {
    if (
      isLoggedIn
      && 'Notification' in window
      && Notification.permission === 'default'
      && typeof Notification.requestPermission === 'function'
    ) {
      void Promise.resolve(Notification.requestPermission()).catch(() => undefined);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!showLoginRequiredDialog || typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, [showLoginRequiredDialog]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <PredictionQueryGuard />
        <Outlet />
        <GlobalErrorDialog />
        {showLoginRequiredDialog && (
          <Suspense fallback={null}>
            <LoginRequiredDialog
              open={showLoginRequiredDialog}
              onOpenChange={(open) => {
                if (!open) {
                  clearPendingLoginRedirect();
                }
                setShowLoginRequiredDialog(open);
              }}
              onCancel={clearPendingLoginRedirect}
              redirectPath={pendingLoginRedirect}
            />
          </Suspense>
        )}
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
