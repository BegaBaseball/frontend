// src/utils/validation.ts
import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/validation';
import { SignUpFormData, LoginFormData, PasswordResetConfirmFormData } from '../types/auth';

// ========== 회원가입 검증 (기존) ==========
export const validateField = (
  fieldName: keyof SignUpFormData,
  value: string,
  formData?: SignUpFormData
): string => {
  switch (fieldName) {
    case 'name':
      if (!value.trim()) {
        return ERROR_MESSAGES.NAME.REQUIRED;
      }
      return '';

    case 'handle':
      if (!value.trim()) {
        return '핸들을 입력해주세요.';
      }
      if (!/^@[a-zA-Z0-9_]{1,14}$/.test(value)) {
        return '핸들은 @로 시작하고 15자 이내의 영문, 숫자, 언더바(_)만 가능합니다.';
      }
      return '';

    case 'email':
      if (!value.trim()) {
        return ERROR_MESSAGES.EMAIL.REQUIRED;
      }
      if (!VALIDATION_RULES.EMAIL.REGEX.test(value)) {
        return ERROR_MESSAGES.EMAIL.INVALID;
      }
      return '';

    case 'password':
      if (!value) {
        return ERROR_MESSAGES.PASSWORD.REQUIRED;
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
  switch (fieldName) {
    case 'email':
      if (!value.trim()) {
        return ERROR_MESSAGES.EMAIL.REQUIRED;
      }
      if (!VALIDATION_RULES.EMAIL.REGEX.test(value)) {
        return ERROR_MESSAGES.EMAIL.INVALID;
      }
      return '';

    case 'password':
      if (!value) {
        return ERROR_MESSAGES.PASSWORD.REQUIRED;
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