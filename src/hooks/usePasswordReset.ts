// hooks/usePasswordReset.ts
import { useState } from 'react';
import { requestPasswordReset } from '../api/auth';
import { validateLoginField } from '../utils/validation';

export const usePasswordReset = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    
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
      const data = await requestPasswordReset(email);
      
      if (data.success) {
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
    handleEmailChange,
    handleEmailBlur,
    handleSubmit,
  };
};