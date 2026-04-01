// hooks/useSignUpForm.ts
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signupUser } from '../api/authPublic';
import { validateField, validateAllFields } from '../utils/validation';
import { SignUpFormData, FieldErrors, FieldName } from '../types/auth';
import { buildLoginPath } from '../utils/loginRedirect';

const initialFormData: SignUpFormData = {
  name: '',
  handle: '@',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: ''
};

const initialFieldErrors: FieldErrors = {
  name: '',
  handle: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: ''
};

export const useSignUpForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<SignUpFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialFieldErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);  // ✅ 성공 상태 추가
  const successRedirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (successRedirectTimeoutRef.current !== null) {
      window.clearTimeout(successRedirectTimeoutRef.current);
    }
  }, []);

  const handleFieldChange = (fieldName: FieldName, value: string) => {
    setFormData({ ...formData, [fieldName]: value });

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

    // ✅ 중복 요청 방지: 이미 처리 중이거나 성공한 경우 무시
    if (isLoading || isSuccess) {
      return;
    }

    setError(null);
    setIsSuccess(false);  // ✅ 초기화

    const errors = validateAllFields(formData);
    setFieldErrors(errors);

    if (Object.values(errors).some(error => error !== '')) {
      return;
    }

    setIsLoading(true);

    try {
      await signupUser({
        name: formData.name,
        handle: formData.handle.startsWith('@') ? formData.handle : `@${formData.handle}`,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        favoriteTeam: formData.favoriteTeam === '없음' ? null : formData.favoriteTeam,
      });

      setIsSuccess(true);  // ✅ 성공 상태 설정

      // ✅ 3초 후 로그인 페이지로 이동
      successRedirectTimeoutRef.current = window.setTimeout(() => {
        navigate(buildLoginPath(new URLSearchParams(location.search).get('redirect')));
      }, 3000);
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
    isSuccess,  // ✅ 성공 상태 반환
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  };
};
