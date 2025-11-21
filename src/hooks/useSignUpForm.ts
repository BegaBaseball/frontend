// hooks/useSignUpForm.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser } from '../api/auth';
import { validateField, validateAllFields } from '../utils/validation';
import { SignUpFormData, FieldErrors, FieldName } from '../types/auth';

const initialFormData: SignUpFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: ''
};

const initialFieldErrors: FieldErrors = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: ''
};

export const useSignUpForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialFieldErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (fieldName: FieldName, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    
    // 에러 메시지 초기화
    if (fieldErrors[fieldName]) {
      setFieldErrors({ ...fieldErrors, [fieldName]: '' });
    }
  };

  const handleFieldBlur = (fieldName: FieldName) => {
    const value = formData[fieldName];
    const errorMessage = validateField(fieldName, value, formData);
    setFieldErrors({ ...fieldErrors, [fieldName]: errorMessage });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 필드 검증
    const errors = validateAllFields(formData);
    setFieldErrors(errors);
    
    // 에러가 하나라도 있으면 제출 중단
    if (Object.values(errors).some(error => error !== '')) {
      return;
    }

    setIsLoading(true);

    try {
      await signupUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        favoriteTeam: formData.favoriteTeam === '없음' ? null : formData.favoriteTeam,
      });

      alert('회원가입 성공! 로그인 화면으로 이동합니다.');
      navigate('/login');
    } catch (err) {
      console.error('Sign up error:', err);
      setError((err as Error).message || '네트워크 오류로 회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    fieldErrors,
    isLoading,
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  };
};