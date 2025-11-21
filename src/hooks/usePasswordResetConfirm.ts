// hooks/usePasswordResetConfirm.ts
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import { validatePasswordResetField, validatePasswordResetForm } from '../utils/validation';
import { PasswordResetConfirmFormData, PasswordResetConfirmFieldErrors } from '../types/auth';

const initialFormData: PasswordResetConfirmFormData = {
  newPassword: '',
  confirmPassword: '',
};

const initialFieldErrors: PasswordResetConfirmFieldErrors = {
  newPassword: '',
  confirmPassword: '',
};

export const usePasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  
  // URL에서 토큰 가져오기
  const [token] = useState(() => searchParams.get('token') || '');
  
  const [formData, setFormData] = useState<PasswordResetConfirmFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<PasswordResetConfirmFieldErrors>(initialFieldErrors);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 토큰 없으면 에러 설정
  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다. 비밀번호 재설정을 다시 요청해주세요.');
    }
  }, [token]);

  const handleFieldChange = (fieldName: keyof PasswordResetConfirmFormData, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    
    // 에러 초기화
    if (fieldErrors[fieldName]) {
      setFieldErrors({ ...fieldErrors, [fieldName]: '' });
    }
    if (error) {
      setError(null);
    }
  };

  const handleFieldBlur = (fieldName: keyof PasswordResetConfirmFormData) => {
    const value = formData[fieldName];
    const errorMessage = validatePasswordResetField(fieldName, value, formData);
    setFieldErrors({ ...fieldErrors, [fieldName]: errorMessage });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('유효하지 않은 토큰입니다.');
      return;
    }

    // 검증
    const errors = validatePasswordResetForm(formData);
    setFieldErrors(errors);

    if (Object.values(errors).some(error => error !== '')) {
      return;
    }

    setIsLoading(true);

    try {
      const data = await confirmPasswordReset(token, formData.newPassword, formData.confirmPassword);
      
      if (data.success) {
        setIsCompleted(true);
      } else {
        setError(data.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('Password reset confirm error:', err);
      setError((err as Error).message || '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return {
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
  };
};