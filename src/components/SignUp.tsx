import { Suspense, lazy, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, User, XCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TEAM_LIST, getFullTeamName } from '../constants/teams';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { buildLoginPath } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';
import { Input } from './ui/input';

const LazyTeamRecommendationTest = lazy(() => import('./TeamRecommendationTest'));

const getAvailabilityMessageClassName = (state: 'idle' | 'checking' | 'available' | 'taken' | 'error') => {
  if (state === 'available') {
    return 'auth-helper-text text-emerald-600';
  }

  if (state === 'taken' || state === 'error') {
    return 'auth-error-text';
  }

  return 'auth-helper-text';
};

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [hasOpenedTeamTest, setHasOpenedTeamTest] = useState(false);

  const {
    formData,
    fieldErrors,
    handleAvailability,
    emailAvailability,
    isLoading,
    isSubmitDisabled,
    isSuccess,
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  } = useSignUpForm();

  const loginPath = buildLoginPath(new URLSearchParams(location.search).get('redirect'));

  return (
    <AuthLayout>
      <AuthHeader
        eyebrow="New Account"
        title="회원가입"
        description="응원팀과 프로필 정보를 설정해 BEGA 경험을 바로 시작하세요."
        data-testid="signup-header"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="signup-form">
        {isSuccess ? (
          <AuthStatusPanel tone="success" data-testid="signup-status-panel" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">회원가입 성공!</p>
              <p className="text-sm">환영합니다! 잠시 후 로그인 화면으로 이동합니다...</p>
            </div>
          </AuthStatusPanel>
        ) : null}

        {error && !isSuccess ? (
          <AuthStatusPanel tone="error" data-testid="signup-status-panel" role="alert">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">회원가입 실패</p>
              <p className="text-sm">{error}</p>
            </div>
          </AuthStatusPanel>
        ) : null}

        <AuthFieldGroup>
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              닉네임
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="nickname"
              value={formData.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              onBlur={() => handleFieldBlur('name')}
              className={`auth-input auth-autofill-input ${fieldErrors.name ? 'auth-input-error' : ''}`}
              placeholder="홍길동"
              disabled={isLoading || isSuccess}
              data-testid="signup-name"
            />
            {fieldErrors.name ? <p className="auth-error-text">* {fieldErrors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="handle" className="flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              사용자 핸들 (@)
            </label>
            <Input
              id="handle"
              name="handle"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              value={formData.handle}
              onChange={(event) => handleFieldChange('handle', event.target.value)}
              onBlur={() => handleFieldBlur('handle')}
              className={`auth-input auth-autofill-input ${fieldErrors.handle ? 'auth-input-error' : ''}`}
              placeholder="@username"
              disabled={isLoading || isSuccess}
              data-testid="signup-handle"
            />
            {fieldErrors.handle ? (
              <p className="auth-error-text">* {fieldErrors.handle}</p>
            ) : handleAvailability.state !== 'idle' ? (
              <p className={getAvailabilityMessageClassName(handleAvailability.state)}>
                {handleAvailability.state === 'taken' || handleAvailability.state === 'error' ? '* ' : ''}
                {handleAvailability.message}
              </p>
            ) : (
              <p className="auth-helper-text">핸들은 내 프로필 주소로 사용되며 소문자로 저장됩니다. (기호는 _만 가능)</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              이메일
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={formData.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              onBlur={() => handleFieldBlur('email')}
              className={`auth-input auth-autofill-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
              placeholder="example@email.com"
              disabled={isLoading || isSuccess}
              data-testid="signup-email"
            />
            {fieldErrors.email ? (
              <p className="auth-error-text">* {fieldErrors.email}</p>
            ) : emailAvailability.state !== 'idle' ? (
              <p className={getAvailabilityMessageClassName(emailAvailability.state)}>
                {emailAvailability.state === 'taken' || emailAvailability.state === 'error' ? '* ' : ''}
                {emailAvailability.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center gap-2 text-foreground">
              <Lock className="h-4 w-4 text-primary" />
              비밀번호
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                onBlur={() => handleFieldBlur('password')}
                className={`auth-input auth-autofill-input pr-12 ${fieldErrors.password ? 'auth-input-error' : ''}`}
                placeholder="8자 이상 입력"
                disabled={isLoading || isSuccess}
                data-testid="signup-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading || isSuccess}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                data-testid="signup-password-visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p className="auth-error-text">* {fieldErrors.password}</p>
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
              <Lock className="h-4 w-4 text-primary" />
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
                placeholder="비밀번호 재입력"
                disabled={isLoading || isSuccess}
                data-testid="signup-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading || isSuccess}
                aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                data-testid="signup-confirm-password-visibility"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? <p className="auth-error-text">* {fieldErrors.confirmPassword}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="favoriteTeam" className="text-foreground">
              응원팀 선택
            </label>
            <select
              id="favoriteTeam"
              name="favoriteTeam"
              value={formData.favoriteTeam}
              onChange={(event) => handleFieldChange('favoriteTeam', event.target.value)}
              disabled={isLoading || isSuccess}
              className={`auth-select-trigger ${fieldErrors.favoriteTeam ? 'auth-input-error' : ''}`}
              data-testid="signup-favorite-team"
            >
              <option value="" disabled>
                팀을 선택하세요
              </option>
              {TEAM_LIST.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            {fieldErrors.favoriteTeam ? <p className="auth-error-text">* {fieldErrors.favoriteTeam}</p> : null}

            {formData.favoriteTeam === '없음' ? (
              <AuthStatusPanel tone="warning" role="status">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">응원구단을 선택하지 않으면 응원석을 이용할 수 없습니다.</p>
                  <p>회원가입 후에도 마이페이지 &gt; 내 정보 수정에서 언제든 변경할 수 있습니다.</p>
                </div>
              </AuthStatusPanel>
            ) : null}

            <div className="auth-support-row">
              <p className="auth-note">응원구단은 응원석에서 사용됩니다</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setHasOpenedTeamTest(true);
                  setShowTeamTest(true);
                }}
                className="h-auto px-2 py-1 text-sm text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                disabled={isLoading || isSuccess}
                data-testid="signup-team-test"
              >
                구단 테스트 해보기
              </Button>
            </div>

            {hasOpenedTeamTest ? (
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
                    <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-2xl">
                      구단 테스트를 불러오는 중...
                    </div>
                  </div>
                }
              >
                <LazyTeamRecommendationTest
                  isOpen={showTeamTest}
                  onClose={() => setShowTeamTest(false)}
                  onSelectTeam={(team) => {
                    handleFieldChange('favoriteTeam', getFullTeamName(team));
                    setShowTeamTest(false);
                  }}
                />
              </Suspense>
            ) : null}

            <p className="auth-note">응원구단은 회원가입 후에도 마이페이지 &gt; 내 정보 수정에서 변경할 수 있습니다.</p>
          </div>
        </AuthFieldGroup>

        <AuthActionGroup>
          <Button
            type="submit"
            variant="brand"
            size="touchLg"
            className="w-full"
            disabled={isSubmitDisabled}
            data-testid="signup-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                처리 중...
              </span>
            ) : isSuccess ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                성공!
              </span>
            ) : '회원가입'}
          </Button>

          <p className="auth-note text-center">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={() => navigate(loginPath)}
              className="auth-link"
              disabled={isLoading || isSuccess}
              data-testid="signup-login-link"
            >
              로그인
            </button>
          </p>
        </AuthActionGroup>
      </form>
    </AuthLayout>
  );
}
