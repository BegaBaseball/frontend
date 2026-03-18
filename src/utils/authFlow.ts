import { buildLoginPathWithError, resolvePostLoginRedirect } from './loginRedirect';

export const ACCOUNT_SETTINGS_REDIRECT_PATH = '/mypage?view=accountSettings';
export const AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE = 'auth_session_not_established';
export const OAUTH2_INVALID_REQUEST_ERROR_CODE = 'invalid_oauth2_request';
export const OAUTH2_AUTH_FAILED_ERROR_CODE = 'oauth2_auth_failed';

type RedirectResolutionInput = {
  queryRedirect?: string | null;
  pendingRedirect?: string | null;
};

export const buildAuthSessionFailureLoginPath = (redirectPath?: string | null): string =>
  buildLoginPathWithError(AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE, redirectPath);

export const resolveLoginSuccessPath = (
  queryRedirect?: string | null,
  pendingRedirect?: string | null,
): string => (
  resolvePostLoginRedirect(queryRedirect, pendingRedirect)
);

export const resolveLoginCompletionPath = ({
  didAuthenticate,
  queryRedirect,
  pendingRedirect,
}: RedirectResolutionInput & { didAuthenticate: boolean }): string => (
  didAuthenticate
    ? resolveLoginSuccessPath(queryRedirect, pendingRedirect)
    : buildAuthSessionFailureLoginPath(queryRedirect || pendingRedirect)
);

export const resolveOAuthSuccessPath = ({
  status,
  pendingRedirect,
  handle,
}: {
  status?: string | null;
  pendingRedirect?: string | null;
  handle?: string | null;
}): string => {
  if (status === 'linked') {
    return ACCOUNT_SETTINGS_REDIRECT_PATH;
  }

  const normalizedHandle = (handle || '').trim();
  const fallbackPath = normalizedHandle
    ? `/mypage/${normalizedHandle.startsWith('@') ? normalizedHandle : `@${normalizedHandle}`}`
    : '/mypage';

  return resolvePostLoginRedirect(null, pendingRedirect, fallbackPath);
};

export const resolveOAuthCompletionPath = ({
  didAuthenticate,
  status,
  pendingRedirect,
  handle,
}: {
  didAuthenticate: boolean;
  status?: string | null;
  pendingRedirect?: string | null;
  handle?: string | null;
}): string => (
  didAuthenticate
    ? resolveOAuthSuccessPath({ status, pendingRedirect, handle })
    : buildAuthSessionFailureLoginPath(pendingRedirect)
);

export const resolveOAuthErrorCode = (responseCode?: string | null): string => (
  responseCode === 'OAUTH2_STATE_NOT_FOUND'
    ? OAUTH2_INVALID_REQUEST_ERROR_CODE
    : OAUTH2_AUTH_FAILED_ERROR_CODE
);
