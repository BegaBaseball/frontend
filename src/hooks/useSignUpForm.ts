import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createSignUpAvailabilityState,
  normalizeSignUpEmailValue,
  normalizeSignUpHandleInput,
  normalizeSignUpHandleValue,
  sanitizeLoginPasswordText,
  sanitizeLoginText,
  SIGNUP_AVAILABILITY_DEBOUNCE_MS,
  validateAllFields,
  validateField,
} from '../utils/validation';
import {
  type FieldErrors,
  type FieldName,
  type SignUpFieldAvailability,
  type SignUpFormData,
} from '../types/auth';
import { buildLoginPath } from '../utils/loginRedirect';

const initialFormData: SignUpFormData = {
  name: '',
  handle: '@',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: '',
};

const initialFieldErrors: FieldErrors = {
  name: '',
  handle: '',
  email: '',
  password: '',
  confirmPassword: '',
  favoriteTeam: '',
};

const initialAvailabilityState: SignUpFieldAvailability = {
  state: 'idle',
  message: '',
};

let authPublicModulePromise: Promise<typeof import('../api/authPublic')> | null = null;

const loadAuthPublicModule = () => {
  authPublicModulePromise ??= import('../api/authPublic');
  return authPublicModulePromise;
};

const checkHandleAvailability = async (value: string, signal?: AbortSignal) => {
  const authPublic = await loadAuthPublicModule();
  return authPublic.checkSignUpHandleAvailability(value, signal);
};

// 이메일 중복 여부는 회원가입 제출 시 서버의 DUPLICATE_EMAIL 응답으로만 확인된다.

const useSignUpAvailabilityCheck = (
  field: 'handle' | 'email',
  normalizedValue: string,
  isValid: boolean,
  checkAvailability: (value: string, signal?: AbortSignal) => Promise<{ available: boolean; message?: string; normalized?: string }>,
) => {
  const [availability, setAvailability] = useState<SignUpFieldAvailability>(initialAvailabilityState);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isValid) {
      setAvailability(initialAvailabilityState);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability(createSignUpAvailabilityState(field, 'checking', normalizedValue));

      try {
        const result = await checkAvailability(normalizedValue, controller.signal);
        if (requestIdRef.current !== requestId) {
          return;
        }

        setAvailability(createSignUpAvailabilityState(
          field,
          result.available ? 'available' : 'taken',
          result.normalized ?? normalizedValue,
          result.available ? undefined : result.message,
        ));
      } catch {
        if (requestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setAvailability(createSignUpAvailabilityState(field, 'error', normalizedValue));
      }
    }, SIGNUP_AVAILABILITY_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [checkAvailability, field, isValid, normalizedValue]);

  return [availability, setAvailability] as const;
};

export const useSignUpForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<SignUpFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(initialFieldErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const successRedirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (successRedirectTimeoutRef.current !== null) {
      window.clearTimeout(successRedirectTimeoutRef.current);
    }
  }, []);

  const normalizedHandle = normalizeSignUpHandleValue(formData.handle);
  const [handleAvailability, setHandleAvailability] = useSignUpAvailabilityCheck(
    'handle',
    normalizedHandle,
    validateField('handle', normalizedHandle) === '',
    checkHandleAvailability,
  );
  // 이메일 중복은 사전 조회 없이 최종 signup 충돌 응답으로만 확정한다.
  const [emailAvailability, setEmailAvailability] = useState<SignUpFieldAvailability>(initialAvailabilityState);
  const normalizedEmail = normalizeSignUpEmailValue(formData.email);

  const currentValidationErrors = validateAllFields(formData);
  const hasLocalValidationErrors = Object.values(currentValidationErrors).some((value) => value !== '');
  const isAvailabilityChecking = handleAvailability.state === 'checking';
  const isAvailabilityReady = handleAvailability.state === 'available';
  const hasCurrentEmailConflict = emailAvailability.state === 'taken' && emailAvailability.normalized === normalizedEmail;
  const isSubmitDisabled = (
    isLoading
    || isSuccess
    || hasLocalValidationErrors
    || isAvailabilityChecking
    || !isAvailabilityReady
    || hasCurrentEmailConflict
  );

  const sanitizeFieldValue = (fieldName: FieldName, value: string) => {
    if (fieldName === 'handle') {
      return normalizeSignUpHandleInput(value);
    }
    if (fieldName === 'email') {
      return sanitizeLoginText(value);
    }
    if (fieldName === 'password' || fieldName === 'confirmPassword') {
      return sanitizeLoginPasswordText(value);
    }
    return value;
  };

  const handleFieldChange = (fieldName: FieldName, value: string) => {
    const nextValue = sanitizeFieldValue(fieldName, value);
    setFormData((prev) => ({ ...prev, [fieldName]: nextValue }));
    setError(null);

    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }

    if (fieldName === 'handle') {
      setHandleAvailability(initialAvailabilityState);
    }

    if (fieldName === 'email') {
      const nextNormalizedEmail = normalizeSignUpEmailValue(nextValue);
      if (emailAvailability.state !== 'taken' || emailAvailability.normalized !== nextNormalizedEmail) {
        setEmailAvailability(initialAvailabilityState);
      }
    }
  };

  const handleFieldBlur = (fieldName: FieldName) => {
    const value = formData[fieldName];
    const normalizedValue = sanitizeFieldValue(fieldName, value);
    const nextFormData = ['handle', 'email', 'password', 'confirmPassword'].includes(fieldName)
      ? { ...formData, [fieldName]: normalizedValue }
      : formData;
    const errorMessage = validateField(fieldName, normalizedValue, nextFormData);
    setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSuccess) {
      return;
    }

    setError(null);
    setIsSuccess(false);

    const errors = validateAllFields(formData);
    setFieldErrors(errors);

    if (Object.values(errors).some((value) => value !== '')) {
      return;
    }

    if (isAvailabilityChecking) {
      setError('핸들 사용 가능 여부 확인이 끝날 때까지 기다려주세요.');
      return;
    }

    if (!isAvailabilityReady) {
      setError('핸들 중복 확인을 완료해 주세요.');
      return;
    }

    if (hasCurrentEmailConflict) {
      setError(emailAvailability.message || '이미 사용 중인 이메일입니다.');
      return;
    }

    setIsLoading(true);

    try {
      const authPublic = await loadAuthPublicModule();
      await authPublic.signupUser({
        name: formData.name,
        handle: normalizeSignUpHandleValue(formData.handle),
        email: normalizeSignUpEmailValue(formData.email),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        favoriteTeam: formData.favoriteTeam === '없음' ? null : formData.favoriteTeam,
      });

      setIsSuccess(true);

      successRedirectTimeoutRef.current = window.setTimeout(() => {
        navigate(buildLoginPath(new URLSearchParams(location.search).get('redirect')));
      }, 3000);
    } catch (err) {
      console.error('Sign up error:', err);

      const authPublic = await loadAuthPublicModule();
      if (err instanceof authPublic.SignUpSubmissionError) {
        if (err.field === 'handle') {
          setHandleAvailability(createSignUpAvailabilityState(
            'handle',
            'taken',
            err.normalized ?? normalizeSignUpHandleValue(formData.handle),
            err.message,
          ));
        }

        if (err.field === 'email') {
          setEmailAvailability(createSignUpAvailabilityState(
            'email',
            'taken',
            err.normalized ?? normalizeSignUpEmailValue(formData.email),
            err.message,
          ));
        }
      }

      setError((err as Error).message || '네트워크 오류로 회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    fieldErrors,
    handleAvailability,
    emailAvailability,
    isLoading,
    isSubmitDisabled,
    isSuccess,
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  };
};
