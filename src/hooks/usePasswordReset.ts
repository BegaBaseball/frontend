// hooks/usePasswordReset.ts
import { useState } from 'react';
import { sanitizeLoginText, validateLoginField } from '../utils/validation';

let authPublicModulePromise: Promise<typeof import('../api/authPublic')> | null = null;

const loadAuthPublicModule = () => {
  authPublicModulePromise ??= import('../api/authPublic');
  return authPublicModulePromise;
};

export const usePasswordReset = (redirectPath?: string | null) => {
  const defaultSuccessMessage = '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.';
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(defaultSuccessMessage);

  const handleEmailChange = (value: string) => {
    setEmail(sanitizeLoginText(value));
    
    // 에러 초기화
    if (emailError) {
      setEmailError('');
    }
    if (error) {
      setError(null);
    }
  };

  const handleEmailBlur = () => {
    const errorMessage = validateLoginField('email', email);
    setEmailError(errorMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 이메일 검증
    const errorMessage = validateLoginField('email', email);
    if (errorMessage) {
      setEmailError(errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const { requestPasswordReset } = await loadAuthPublicModule();
      const data = await requestPasswordReset(email, redirectPath);
      
      if (data.success) {
        setSuccessMessage(data.message || defaultSuccessMessage);
        setIsSubmitted(true);
      } else {
        setError(data.message || '이메일 발송에 실패했습니다.');
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      setError((err as Error).message || '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    emailError,
    isSubmitted,
    isLoading,
    error,
    successMessage,
    handleEmailChange,
    handleEmailBlur,
    handleSubmit,
  };
};
