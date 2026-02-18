// types/auth.ts
export interface SignUpFormData {
  name: string;
  handle: string;
  email: string;
  password: string;
  confirmPassword: string;
  favoriteTeam: string;
}

export interface FieldErrors {
  name: string;
  handle: string;
  email: string;
  password: string;
  confirmPassword: string;
  favoriteTeam: string;
}

export type FieldName = keyof SignUpFormData;

// 🔥 로그인 타입 추가
export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFieldErrors {
  email: string;
  password: string;
}

export type LoginFieldName = keyof LoginFormData;

// 🔥 소셜 로그인 타입
export type SocialProvider = 'kakao' | 'google';

// 🔥 비밀번호 재설정 타입 추가
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

// 🔥 비밀번호 재설정 확인 타입 추가
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetConfirmFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmFieldErrors {
  newPassword: string;
  confirmPassword: string;
}