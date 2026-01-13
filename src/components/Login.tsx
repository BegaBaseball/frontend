// Login.tsx
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';
import { getSocialLoginUrl } from '../api/auth';
import AuthLayout from './auth/AuthLayout';

export default function Login() {
  const navigate = useNavigate();

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

  const handleSocialLogin = (provider: 'kakao' | 'google') => {
    if (!isLoading) {
      window.location.href = getSocialLoginUrl(provider);
    }
  };

  return (
    <AuthLayout showHomeButton={true}>
      <h2 className="text-center mb-8">SIGN IN</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 서버 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* 이메일 */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
            <Mail className="w-4 h-4" style={{ color: '#2d5f4f' }} />
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            className={`bg-gray-50 dark:bg-gray-50 border-gray-200 text-gray-900 dark:text-gray-900 focus:ring-2 focus:ring-[#2d5f4f] ${fieldErrors.email ? 'border-red-500' : ''}`}
            placeholder="이메일을 입력하세요"
            disabled={isLoading}
          />
          {fieldErrors.email && (
            <p className="text-sm text-red-500">* {fieldErrors.email}</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2 text-gray-700">
            <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              onBlur={() => handleFieldBlur('password')}
              className={`bg-gray-50 dark:bg-gray-50 border-gray-200 text-gray-900 dark:text-gray-900 focus:ring-2 focus:ring-[#2d5f4f] pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-sm text-red-500">* {fieldErrors.password}</p>
          )}
          
         <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={rememberEmail}
                onChange={(e) => handleRememberEmailChange(e.target.checked)}
                disabled={isLoading}
              />
              이메일 저장
            </label>
            <button
              type="button"
              onClick={() => navigate('/password/reset')}
              className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
              disabled={isLoading}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>

        {/* 로그인 버튼 */}
        <Button 
          type="submit" 
          className="w-full text-white py-6 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#2d5f4f' }}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              로그인 중...
            </span>
          ) : (
            '로그인'
          )}
        </Button>

        {/* 회원가입 링크 */}
        <p className="text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="hover:underline disabled:opacity-50"
            style={{ color: '#2d5f4f' }}
            disabled={isLoading}
          >
            회원가입
          </button>
        </p>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-gray-500">또는</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocialLogin('kakao')}
          disabled={isLoading}
          className="w-full py-6 rounded-full flex items-center justify-center gap-3 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#FEE500', color: '#000000' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3C5.589 3 2 5.792 2 9.22c0 2.155 1.396 4.046 3.505 5.146-.15.554-.976 3.505-1.122 4.045-.174.646.237.637.501.463.21-.138 3.429-2.282 3.996-2.657.373.053.754.08 1.12.08 4.411 0 8-2.792 8-6.22C18 5.793 14.411 3 10 3z" fill="currentColor"/>
          </svg>
          카카오로 로그인
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading}
          className="w-full py-6 rounded-full flex items-center justify-center gap-3 text-sm font-medium transition-colors bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 1 1 3.42-9.25l2.58-2.58A8.76 8.76 0 1 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#4285F4"/>
            <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 0 1-5.14-4.24l-2.99 2.31A8.76 8.76 0 0 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#34A853"/>
            <path d="M5.14 10.02a5.26 5.26 0 0 1 0-3.36L2.15 4.35a8.76 8.76 0 0 0 0 7.98l2.99-2.31z" fill="#FBBC05"/>
            <path d="M10.13 4.96c1.39 0 2.63.48 3.61 1.42l2.71-2.71A8.76 8.76 0 0 0 2.15 4.35l2.99 2.31a5.26 5.26 0 0 1 5.14-1.7z" fill="#EA4335"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    </AuthLayout>
  );
}