// src/components/OAuthCallback.tsx
import { AxiosError } from 'axios';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthProfileActions } from '../store/authStore';
import { useAuthRedirectState } from '../store/authStore';
import { consumeOAuth2State } from '../api/auth';
import LoadingSpinner from './LoadingSpinner';
import { Button } from './ui/button';
import {
  AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE,
  buildAuthSessionFailureLoginPath,
  resolveOAuthCompletionPath,
  resolveOAuthErrorCode,
} from '../utils/authFlow';
import { buildLoginPathWithError, getStoredLoginRedirect } from '../utils/loginRedirect';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const hasCalled = useRef(false);

  useEffect(() => {
    let redirectTimer: number | null = null;
    const state = searchParams.get('state');
    const status = searchParams.get('status');
    const getRetryLoginPath = (nextErrorCode?: string | null) =>
      buildLoginPathWithError(nextErrorCode, pendingLoginRedirect || getStoredLoginRedirect());
    const scheduleRetryRedirect = (nextErrorCode: string) => {
      setErrorCode(nextErrorCode);
      redirectTimer = window.setTimeout(() => {
        navigate(getRetryLoginPath(nextErrorCode), { replace: true });
      }, 2000);
    };

    if (!state) {
      navigate(getRetryLoginPath('invalid_oauth2_request'), { replace: true });
      return undefined;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    (async () => {
      try {
        const data = await consumeOAuth2State(state);
        const { email, name, handle } = data;

        if (email && name) {
          const didAuthenticate = await fetchProfileAndAuthenticate();
          const redirectPath = resolveOAuthCompletionPath({
            didAuthenticate,
            status,
            pendingRedirect: pendingLoginRedirect,
            handle,
          });
          if (!didAuthenticate) {
            scheduleRetryRedirect(AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE);
            return;
          }
          clearPendingLoginRedirect();
          navigate(redirectPath, { replace: true });
        } else {
          scheduleRetryRedirect('oauth2_provider_payload_invalid');
        }
      } catch (error) {
        const responseCode = error instanceof AxiosError
          ? (error.response?.data as { code?: string } | undefined)?.code
          : undefined;
        scheduleRetryRedirect(resolveOAuthErrorCode(responseCode));
      }
    })();

    return () => {
      if (redirectTimer !== null) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [clearPendingLoginRedirect, fetchProfileAndAuthenticate, navigate, pendingLoginRedirect, searchParams]);

  if (errorCode) {
    const retryLoginPath = errorCode === AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE
      ? buildAuthSessionFailureLoginPath(pendingLoginRedirect || getStoredLoginRedirect())
      : buildLoginPathWithError(errorCode, pendingLoginRedirect || getStoredLoginRedirect());

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-200">
        <div className="text-center px-6">
          <p className="font-semibold mb-2 text-red-600 dark:text-red-400">
            로그인 처리에 실패했습니다.
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            로그인 페이지로 돌아가 다시 시도해주세요.
          </p>
          <Button onClick={() => navigate(retryLoginPath, { replace: true })} variant="outline">
            로그인으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LoadingSpinner text="로그인 처리 중..." />
  );
}
