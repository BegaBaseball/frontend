// hooks/useLoginForm.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { validateLoginField, validateLoginForm } from '../utils/validation';
import { LoginFormData } from '../types/auth';

const SAVED_EMAIL_KEY = 'savedEmail';

export const useLoginForm = () => {
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);

  const getSavedEmail = () => {
    try {
      return localStorage.getItem(SAVED_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState<LoginFormData>({
    email: getSavedEmail(),
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(!!getSavedEmail());

  const handleFieldChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setError(null);
  };

  const handleFieldBlur = (field: keyof LoginFormData) => {
    const value = formData[field];
    const error = validateLoginField(field, value);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleRememberEmailChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (!checked) {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validateLoginForm(formData);
    const hasErrors = Object.values(errors).some((error) => error !== '');
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      // 이메일 저장 처리
      if (rememberEmail) {
        localStorage.setItem(SAVED_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }

      // login(email: string, name: string, profileImageUrl?: string, role?: string)
      login(
        formData.email,
        response.data.name,
        undefined, // profileImageUrl는 나중에 마이페이지에서 가져옴
        response.data.role,
        undefined, // favoriteTeam
        response.data.id
      );

      await fetchProfileAndAuthenticate();
      navigate('/home');
    } catch (err: any) {
      console.error('로그인 실패:', err);
      setError(err.message || '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return {
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
  };
};
