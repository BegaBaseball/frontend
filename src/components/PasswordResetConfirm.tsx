// PasswordResetConfirm.tsx
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import { usePasswordResetConfirm } from '../hooks/usePasswordResetConfirm';
import AuthLayout from './auth/AuthLayout';

export default function PasswordResetConfirm() {
  const navigate = useNavigate();

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

  return (
    <AuthLayout>
      {!isCompleted ? (
        <>
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>로그인으로 돌아가기</span>
          </button>

          <h2 className="text-center mb-4">새 비밀번호 설정</h2>
          <p className="text-center text-gray-600 mb-8">
            새로운 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 토큰 없음 또는 서버 에러 메시지 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            {/* 새 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2 text-gray-700">
                <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                새 비밀번호
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('newPassword')}
                  className={`bg-gray-50 dark:bg-gray-50 border-gray-200 text-gray-900 dark:text-gray-900 focus:ring-[#2d5f4f] pr-10 ${fieldErrors.newPassword ? 'border-red-500' : ''}`}
                  style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                  placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                  disabled={isLoading || !token}
                />
                <button
                  type="button"
                  onClick={toggleNewPasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading || !token}
                  aria-label={showNewPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.newPassword ? (
                <p className="text-sm text-red-500">* {fieldErrors.newPassword}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  • 8자 이상<br />
                  • 대문자, 소문자, 숫자, 특수문자(@$!%*?&#) 각 1개 이상 포함
                </p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-gray-700">
                <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                비밀번호 확인
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  className={`bg-gray-50 dark:bg-gray-50 border-gray-200 text-gray-900 dark:text-gray-900 focus:ring-[#2d5f4f] pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                  style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                  placeholder="비밀번호를 다시 입력하세요"
                  disabled={isLoading || !token}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading || !token}
                  aria-label={showConfirmPassword ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-500">* {fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* 비밀번호 조건 표시 */}
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="mb-2">비밀번호 조건:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                  최소 8자 이상
                </li>
                <li className={formData.newPassword === formData.confirmPassword && formData.newPassword ? 'text-green-600' : ''}>
                  비밀번호 일치
                </li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full text-white py-6 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2d5f4f' }}
              disabled={isLoading || !token}
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center py-8">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="mb-4">비밀번호 변경 완료</h2>
          <p className="text-gray-600 mb-8">
            비밀번호가 성공적으로 변경되었습니다.<br />
            새로운 비밀번호로 로그인해주세요.
          </p>
          <Button 
            onClick={() => navigate('/login')}
            className="w-full text-white py-6 rounded-full hover:opacity-90"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            로그인하기
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}