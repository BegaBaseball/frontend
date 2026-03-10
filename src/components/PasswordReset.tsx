// PasswordReset.tsx
import { ArrowLeft, Mail, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import { usePasswordReset } from '../hooks/usePasswordReset';
import AuthLayout from './auth/AuthLayout';

export default function PasswordReset() {
  const navigate = useNavigate();

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
  } = usePasswordReset();

  const passwordResetInputClass =
    'auth-autofill-input bg-gray-50 dark:bg-card border-gray-200 dark:border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-300 focus:ring-primary ring-primary';

  return (
    <AuthLayout>
      <button 
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>로그인으로 돌아가기</span>
      </button>

      {!isSubmitted ? (
        <>
          <h2 className="text-center mb-4">비밀번호 재설정</h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
            가입하신 이메일 주소를 입력해주세요.<br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 서버 에러 메시지 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4 text-primary" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                className={`${passwordResetInputClass} ${emailError ? 'border-red-500' : ''}`}
                placeholder="이메일을 입력하세요"
                disabled={isLoading}
              />
              {emailError && (
                <p className="text-sm text-red-500">* {emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-white py-6 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-primary"
              disabled={isLoading}
            >
              {isLoading ? '전송 중...' : '재설정 링크 보내기'}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center py-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary"
          >
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="mb-4">이메일을 확인해주세요</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {successMessage}<br />
            메일을 받지 못했다면 잠시 후 다시 시도해주세요.
          </p>

          <Button
            onClick={() => navigate('/login')}
            className="w-full py-6 rounded-full hover:bg-gray-50 dark:hover:bg-secondary border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light bg-white dark:bg-card"
          >
            로그인으로 돌아가기
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
