import { useLocation, useNavigate } from 'react-router-dom';

import { usePasswordResetConfirm } from '../hooks/usePasswordResetConfirm';
import { buildLoginPath, getStoredLoginRedirect } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from './icons/PublicShellIcons';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function PasswordResetConfirm() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token,
    formData,
    fieldErrors,
    showNewPassword,
    showConfirmPassword,
    isCompleted,
    isLoading,
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    toggleNewPasswordVisibility,
    toggleConfirmPasswordVisibility,
  } = usePasswordResetConfirm();

  const redirectPath = new URLSearchParams(location.search).get('redirect') || getStoredLoginRedirect();
  const loginPath = buildLoginPath(redirectPath);

  return (
    <AuthLayout>
      {!isCompleted ? (
        <>
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="auth-back-link"
            data-testid="password-reset-confirm-back-link"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>로그인으로 돌아가기</span>
          </button>

          <AuthHeader
            eyebrow="Reset Password"
            title="새 비밀번호 설정"
            description="새로운 비밀번호를 입력하고 확인해 주세요."
            data-testid="password-reset-confirm-header"
          />

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="password-reset-confirm-form">
            {error ? (
              <AuthStatusPanel tone="error" data-testid="password-reset-confirm-status-panel" role="alert">
                <p className="text-[16px] font-semibold">{error}</p>
              </AuthStatusPanel>
            ) : null}

            <AuthFieldGroup>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="flex items-center gap-2 text-foreground">
                  <LockIcon className="h-4 w-4 text-primary" />
                  새 비밀번호
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.newPassword}
                    onChange={(event) => handleFieldChange('newPassword', event.target.value)}
                    onBlur={() => handleFieldBlur('newPassword')}
                    className={`auth-input auth-autofill-input pr-12 ${fieldErrors.newPassword ? 'auth-input-error' : ''}`}
                    placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                    disabled={isLoading || !token}
                    data-testid="password-reset-confirm-new-password"
                  />
                  <button
                    type="button"
                    onClick={toggleNewPasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading || !token}
                    aria-label={showNewPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'}
                    data-testid="password-reset-confirm-new-password-visibility"
                  >
                    {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.newPassword ? (
                  <p className="auth-error-text">* {fieldErrors.newPassword}</p>
                ) : (
                  <p className="auth-helper-text">
                    • 8자 이상
                    <br />
                    • 대문자, 소문자, 숫자, 특수문자(@$!%*?&#) 각 1개 이상 포함
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="flex items-center gap-2 text-foreground">
                  <LockIcon className="h-4 w-4 text-primary" />
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(event) => handleFieldChange('confirmPassword', event.target.value)}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    className={`auth-input auth-autofill-input pr-12 ${fieldErrors.confirmPassword ? 'auth-input-error' : ''}`}
                    placeholder="비밀번호를 다시 입력하세요"
                    disabled={isLoading || !token}
                    data-testid="password-reset-confirm-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading || !token}
                    aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                    data-testid="password-reset-confirm-confirm-password-visibility"
                  >
                    {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? <p className="auth-error-text">* {fieldErrors.confirmPassword}</p> : null}
              </div>

              <AuthStatusPanel tone="default" role="status">
                <div className="space-y-2 text-[16px]">
                  <p className="font-semibold text-foreground">비밀번호 조건</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    <li className={formData.newPassword.length >= 8 ? 'text-primary' : undefined}>
                      최소 8자 이상
                    </li>
                    <li className={formData.newPassword === formData.confirmPassword && formData.newPassword ? 'text-primary' : undefined}>
                      비밀번호 일치
                    </li>
                  </ul>
                </div>
              </AuthStatusPanel>
            </AuthFieldGroup>

            <AuthActionGroup>
              <Button
                type="submit"
                variant="brand"
                size="touchLg"
                className="w-full"
                disabled={isLoading || !token}
                data-testid="password-reset-confirm-submit"
              >
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </AuthActionGroup>
          </form>
        </>
      ) : (
        <>
          <AuthHeader
            eyebrow="Password Updated"
            title="비밀번호 변경 완료"
            description="비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요."
            data-testid="password-reset-confirm-header"
          />

          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
              <CheckIcon className="h-10 w-10" />
            </div>

            <AuthActionGroup>
              <Button
                type="button"
                variant="brand"
                size="touchLg"
                className="w-full"
                onClick={() => navigate(loginPath)}
                data-testid="password-reset-confirm-login"
              >
                로그인하기
              </Button>
            </AuthActionGroup>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
