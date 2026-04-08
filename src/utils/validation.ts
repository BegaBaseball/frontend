// src/utils/validation.ts
import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/validation';
import {
  SignUpFieldAvailability,
  SignUpFieldAvailabilityState,
  SignUpFormData,
  LoginFormData,
  PasswordResetConfirmFormData,
} from '../types/auth';

const NON_ASCII_REGEX = /[^\x20-\x7E]/;
const NON_ASCII_REPLACE_REGEX = /[^\x20-\x7E]/g;

type SignUpAvailabilityField = 'handle' | 'email';

export const sanitizeLoginText = (value: string): string => value.replace(NON_ASCII_REPLACE_REGEX, '');
export const sanitizeLoginPasswordText = (value: string): string => sanitizeLoginText(value).replace(/\s/g, '');

export const hasNonAsciiCharacters = (value: string): boolean => NON_ASCII_REGEX.test(value);

const SIGNUP_AVAILABILITY_MESSAGES: Record<SignUpAvailabilityField, Record<Exclude<SignUpFieldAvailabilityState, 'idle'>, string>> = {
  handle: {
    checking: '핸들 중복 확인 중...',
    available: '사용 가능한 핸들입니다.',
    taken: '이미 사용 중인 핸들입니다.',
    error: '핸들 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
  email: {
    checking: '이메일 중복 확인 중...',
    available: '사용 가능한 이메일입니다.',
    taken: '이미 사용 중인 이메일입니다.',
    error: '이메일 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

export const SIGNUP_AVAILABILITY_DEBOUNCE_MS = 450;

export const createSignUpAvailabilityState = (
  field: SignUpAvailabilityField,
  state: SignUpFieldAvailabilityState,
  normalized?: string,
  message?: string,
): SignUpFieldAvailability => ({
  state,
  message: state === 'idle' ? '' : message || SIGNUP_AVAILABILITY_MESSAGES[field][state],
  normalized,
});

export const normalizeSignUpHandleInput = (value: string): string => {
  const lowercased = sanitizeLoginText(value.toLowerCase());
  if (lowercased === '' || lowercased === '@') {
    return '@';
  }
  return lowercased.startsWith('@') ? lowercased : `@${lowercased}`;
};

export const normalizeSignUpHandleValue = (value: string): string => {
  const normalized = sanitizeLoginText(value.trim().toLowerCase());
  if (!normalized || normalized === '@') {
    return '@';
  }
  return normalized.startsWith('@') ? normalized : `@${normalized}`;
};

export const normalizeSignUpEmailValue = (value: string): string => value.trim().toLowerCase();

// ========== 회원가입 검증 (기존) ==========
export const validateField = (
  fieldName: keyof SignUpFormData,
  value: string,
  formData?: SignUpFormData
): string => {
  const trimmedValue = value.trim();
  switch (fieldName) {
    case 'name':
      if (!trimmedValue) {
        return ERROR_MESSAGES.NAME.REQUIRED;
      }
      return '';

    case 'handle':
      if (!trimmedValue) {
        return '핸들을 입력해주세요.';
      }
      if (hasNonAsciiCharacters(trimmedValue)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (!/^@[a-z0-9_]{1,14}$/.test(value)) {
        return '핸들은 @로 시작하고 15자 이내의 영문 소문자, 숫자, 언더바(_)만 가능합니다.';
      }
      return '';

    case 'email':
      if (!trimmedValue) {
        return ERROR_MESSAGES.EMAIL.REQUIRED;
      }
      if (hasNonAsciiCharacters(trimmedValue)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (!VALIDATION_RULES.EMAIL.REGEX.test(trimmedValue)) {
        return ERROR_MESSAGES.EMAIL.INVALID;
      }
      return '';

    case 'password':
      if (!value) {
        return ERROR_MESSAGES.PASSWORD.REQUIRED;
      }
      if (/\s/.test(value) || hasNonAsciiCharacters(value)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (value.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
        return ERROR_MESSAGES.PASSWORD.MIN_LENGTH;
      }
      if (!VALIDATION_RULES.PASSWORD.REGEX.test(value)) {
        return ERROR_MESSAGES.PASSWORD.INVALID;
      }
      return '';

    case 'confirmPassword':
      if (!value) {
        return ERROR_MESSAGES.CONFIRM_PASSWORD.REQUIRED;
      }
      if (formData && value !== formData.password) {
        return ERROR_MESSAGES.CONFIRM_PASSWORD.NOT_MATCH;
      }
      return '';

    case 'favoriteTeam':
      if (!value) {
        return ERROR_MESSAGES.TEAM.REQUIRED;
      }
      return '';

    default:
      return '';
  }
};

export const validateAllFields = (formData: SignUpFormData) => {
  return {
    name: validateField('name', formData.name),
    handle: validateField('handle', formData.handle),
    email: validateField('email', formData.email),
    password: validateField('password', formData.password),
    confirmPassword: validateField('confirmPassword', formData.confirmPassword, formData),
    favoriteTeam: validateField('favoriteTeam', formData.favoriteTeam),
  };
};

// 🔥 로그인 검증 추가
export const validateLoginField = (
  fieldName: keyof LoginFormData,
  value: string
): string => {
  const asciiValue = value.trim();

  switch (fieldName) {
    case 'email':
      if (!value.trim()) {
        return ERROR_MESSAGES.EMAIL.REQUIRED;
      }
      if (hasNonAsciiCharacters(asciiValue)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (!VALIDATION_RULES.EMAIL.REGEX.test(value.trim())) {
        return ERROR_MESSAGES.EMAIL.INVALID;
      }
      return '';

    case 'password':
      if (!value) {
        return ERROR_MESSAGES.PASSWORD.REQUIRED;
      }
      if (/\s/.test(value)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (hasNonAsciiCharacters(value)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      return '';

    default:
      return '';
  }
};

export const validateLoginForm = (formData: LoginFormData) => {
  return {
    email: validateLoginField('email', formData.email),
    password: validateLoginField('password', formData.password),
  };
};

export const validatePasswordResetField = (
  fieldName: keyof PasswordResetConfirmFormData,
  value: string,
  formData?: PasswordResetConfirmFormData
): string => {
  switch (fieldName) {
    case 'newPassword':
      if (!value) {
        return ERROR_MESSAGES.PASSWORD.REQUIRED;
      }
      if (/\s/.test(value) || hasNonAsciiCharacters(value)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (value.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
        return ERROR_MESSAGES.PASSWORD.MIN_LENGTH;
      }
      if (!VALIDATION_RULES.PASSWORD.REGEX.test(value)) {
        return ERROR_MESSAGES.PASSWORD.INVALID;
      }
      return '';

    case 'confirmPassword':
      if (!value) {
        return ERROR_MESSAGES.CONFIRM_PASSWORD.REQUIRED;
      }
      if (/\s/.test(value) || hasNonAsciiCharacters(value)) {
        return ERROR_MESSAGES.ENCODE.INVALID;
      }
      if (formData && value !== formData.newPassword) {
        return ERROR_MESSAGES.CONFIRM_PASSWORD.NOT_MATCH;
      }
      return '';

    default:
      return '';
  }
};

export const validatePasswordResetForm = (formData: PasswordResetConfirmFormData) => {
  return {
    newPassword: validatePasswordResetField('newPassword', formData.newPassword),
    confirmPassword: validatePasswordResetField('confirmPassword', formData.confirmPassword, formData),
  };
};
