import { useLocation, useNavigate } from 'react-router-dom';

import { usePasswordReset } from '../hooks/usePasswordReset';
import { buildLoginPath, getStoredLoginRedirect } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import { ArrowLeftIcon, CheckIcon, MailIcon } from './icons/PublicShellIcons';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function PasswordReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get('redirect') || getStoredLoginRedirect();

  const {
    email,
    emailError,
    isSubmitted,
    isLoading,
    error,
    successMessage,
    handleEmailChange,
    handleEmailBlur,
    handleSubmit,
  } = usePasswordReset(redirectPath);

  const loginPath = buildLoginPath(redirectPath);

  return (
    <AuthLayout>
      {!isSubmitted ? (
        <>
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="auth-back-link"
            data-testid="password-reset-back-link"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>로그인으로 돌아가기</span>
          </button>

          <AuthHeader
            title="비밀번호 재설정"
            description="가입하신 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다."
            data-testid="password-reset-header"
          />

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="password-reset-form">
            {error ? (
              <AuthStatusPanel tone="error" data-testid="password-reset-status-panel" role="alert">
                <p className="text-body font-semibold">{error}</p>
              </AuthStatusPanel>
            ) : null}

            <AuthFieldGroup>
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <MailIcon className="h-4 w-4 text-primary" />
                  E-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(event) => handleEmailChange(event.target.value)}
                  onBlur={handleEmailBlur}
                  className={`auth-input auth-autofill-input ${emailError ? 'auth-input-error' : ''}`}
                  placeholder="이메일을 입력하세요"
                  disabled={isLoading}
                  data-testid="password-reset-email"
                />
                {emailError ? <p className="auth-error-text">* {emailError}</p> : null}
              </div>
            </AuthFieldGroup>

            <AuthActionGroup>
              <Button
                type="submit"
                variant="brand"
                size="touchLg"
                className="w-full"
                disabled={isLoading}
                data-testid="password-reset-submit"
              >
                {isLoading ? '전송 중...' : '재설정 링크 보내기'}
              </Button>
            </AuthActionGroup>
          </form>
        </>
      ) : (
        <>
          <AuthHeader
            title="이메일을 확인해주세요"
            description={`${successMessage} 메일을 받지 못했다면 잠시 후 다시 시도해주세요.`}
            data-testid="password-reset-header"
          />

          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
              <CheckIcon className="h-10 w-10" />
            </div>

            <AuthActionGroup>
              <Button
                type="button"
                variant="brandOutline"
                size="touchLg"
                className="w-full"
                onClick={() => navigate(loginPath)}
                data-testid="password-reset-return-login"
              >
                로그인으로 돌아가기
              </Button>
            </AuthActionGroup>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
