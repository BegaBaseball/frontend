import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getSocialLoginUrl } from '../api/auth';
import { useLoginForm } from '../hooks/useLoginForm';
import { buildPasswordResetPath, buildSignUpPath } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    formData,
    fieldErrors,
    showPassword,
    isLoading,
    error,
    rememberEmail,
    handleFieldChange,
    handleFieldBlur,
    handleRememberEmailChange,
    handleSubmit,
    togglePasswordVisibility,
  } = useLoginForm();

  const redirectPath = new URLSearchParams(location.search).get('redirect');
  const signUpPath = buildSignUpPath(redirectPath);
  const passwordResetPath = buildPasswordResetPath(redirectPath);

  const handleSocialLogin = (provider: 'kakao' | 'google' | 'naver') => {
    if (!isLoading) {
      window.location.href = getSocialLoginUrl(provider);
    }
  };

  return (
    <AuthLayout showHomeButton={true}>
      <AuthHeader
        eyebrow="Account Access"
        title="로그인"
        description="경기 일정, 응원, 메이트, 예측을 이어서 보려면 계정으로 들어오세요."
        data-testid="login-header"
      />

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
        {error ? (
          <AuthStatusPanel tone="error" data-testid="login-status-panel" role="alert">
            <p className="text-sm font-medium">{error}</p>
          </AuthStatusPanel>
        ) : null}

        <AuthFieldGroup>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={formData.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              onBlur={() => handleFieldBlur('email')}
              className={`auth-input login-autofill-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
              placeholder="이메일을 입력하세요"
              disabled={isLoading}
              data-testid="login-email"
            />
            {fieldErrors.email ? <p className="auth-error-text">* {fieldErrors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2 text-foreground">
              <Lock className="h-4 w-4 text-primary" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                onBlur={() => handleFieldBlur('password')}
                className={`auth-input login-autofill-input pr-12 ${fieldErrors.password ? 'auth-input-error' : ''}`}
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                data-testid="login-password-visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? <p className="auth-error-text">* {fieldErrors.password}</p> : null}

            <div className="auth-support-row">
              <label htmlFor="remember-email" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  id="remember-email"
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberEmail}
                  onChange={(event) => handleRememberEmailChange(event.target.checked)}
                  disabled={isLoading}
                />
                이메일 저장
              </label>

              <button
                type="button"
                onClick={() => navigate(passwordResetPath)}
                className="auth-link text-sm"
                disabled={isLoading}
                data-testid="login-password-reset-link"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </div>
        </AuthFieldGroup>

        <AuthActionGroup>
          <Button
            type="submit"
            variant="brand"
            size="touchLg"
            className="w-full"
            disabled={isLoading}
            aria-busy={isLoading}
            data-testid="login-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                로그인 중...
              </span>
            ) : '로그인'}
          </Button>

          <p className="auth-note text-center">
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={() => navigate(signUpPath)}
              className="auth-link"
              disabled={isLoading}
              data-testid="login-signup-link"
            >
              회원가입
            </button>
          </p>
        </AuthActionGroup>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-4 text-sm text-muted-foreground">또는</span>
        </div>
      </div>

      <div className="auth-provider-stack" data-testid="login-social-group">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading}
          className="auth-provider-button auth-provider-google"
          data-testid="login-social-google"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 1 1 3.42-9.25l2.58-2.58A8.76 8.76 0 1 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#4285F4" />
            <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 0 1-5.14-4.24l-2.99 2.31A8.76 8.76 0 0 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#34A853" />
            <path d="M5.14 10.02a5.26 5.26 0 0 1 0-3.36L2.15 4.35a8.76 8.76 0 0 0 0 7.98l2.99-2.31z" fill="#FBBC05" />
            <path d="M10.13 4.96c1.39 0 2.63.48 3.61 1.42l2.71-2.71A8.76 8.76 0 0 0 2.15 4.35l2.99 2.31a5.26 5.26 0 0 1 5.14-1.7z" fill="#EA4335" />
          </svg>
          Google로 로그인
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('naver')}
          disabled={isLoading}
          className="auth-provider-button auth-provider-naver"
          data-testid="login-social-naver"
        >
          <span className="mr-1 text-lg font-bold italic">N</span>
          네이버로 로그인
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('kakao')}
          disabled={isLoading}
          className="auth-provider-button auth-provider-kakao"
          data-testid="login-social-kakao"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M10 3C5.589 3 2 5.792 2 9.22c0 2.155 1.396 4.046 3.505 5.146-.15.554-.976 3.505-1.122 4.045-.174.646.237.637.501.463.21-.138 3.429-2.282 3.996-2.657.373.053.754.08 1.12.08 4.411 0 8-2.792 8-6.22C18 5.793 14.411 3 10 3z" fill="currentColor" />
          </svg>
          카카오로 로그인
        </button>
      </div>
    </AuthLayout>
  );
}
