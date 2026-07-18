// hooks/useLoginForm.ts
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { validateLoginField, validateLoginForm } from '../utils/validation';
import { LoginFormData } from '../types/auth';
import { resolveLoginCompletionPath } from '../utils/authFlow';
import { getLoginQueryErrorMessage } from '../utils/loginError';
import {
  clearStoredLoginRedirect,
  getStoredLoginRedirect,
  sanitizeLoginRedirect,
  setStoredLoginRedirect,
} from '../utils/loginRedirect';

const SAVED_EMAIL_KEY = 'savedEmail';

let authPublicModulePromise: Promise<typeof import('../api/authPublic')> | null = null;
let authStoreModulePromise: Promise<typeof import('../store/authStore')> | null = null;
let errorUtilsModulePromise: Promise<typeof import('../utils/errorUtils')> | null = null;

const loadAuthPublicModule = () => {
  authPublicModulePromise ??= import('../api/authPublic');
  return authPublicModulePromise;
};

const loadAuthStoreModule = () => {
  authStoreModulePromise ??= import('../store/authStore');
  return authStoreModulePromise;
};

const loadErrorUtilsModule = () => {
  errorUtilsModulePromise ??= import('../utils/errorUtils');
  return errorUtilsModulePromise;
};

export const useLoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    setError(getLoginQueryErrorMessage(location.search));
  }, [location.search]);

  useEffect(() => {
    const redirect = sanitizeLoginRedirect(new URLSearchParams(location.search).get('redirect'));
    if (redirect) {
      setStoredLoginRedirect(redirect);
      return;
    }

    if (getStoredLoginRedirect()) {
      clearStoredLoginRedirect();
    }
  }, [location.search]);

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
      const queryRedirect = new URLSearchParams(location.search).get('redirect');
      const pendingLoginRedirect = getStoredLoginRedirect();
      const { loginUser } = await loadAuthPublicModule();
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

      const { useAuthStore } = await loadAuthStoreModule();
      const { login, fetchProfileAndAuthenticate } = useAuthStore.getState();

      // login(email: string, name: string, profileImageUrl?: string, role?: string)
      login(
        formData.email,
        response.data.name ?? formData.email,
        undefined, // profileImageUrl는 나중에 마이페이지에서 가져옴
        response.data.role,
        undefined, // favoriteTeam
        response.data.id,
        response.data.cheerPoints,
        response.data.handle ?? undefined
      );

      const didAuthenticate = await fetchProfileAndAuthenticate();
      const redirectTarget = resolveLoginCompletionPath({
        didAuthenticate,
        queryRedirect,
        pendingRedirect: pendingLoginRedirect,
      });
      clearStoredLoginRedirect();
      navigate(redirectTarget, { replace: true });
    } catch (err: unknown) {
      console.error('로그인 실패:', err);
      const { getApiErrorMessage } = await loadErrorUtilsModule();
      setError(getApiErrorMessage(err, '로그인에 실패했습니다. 다시 시도해주세요.'));
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
