// constants/config.ts

/**
 * API 기본 URL
 */
export const API_BASE_URL = import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080';

/**
 * 현재 시즌 연도
 */
export const CURRENT_SEASON = 2025;

/**
 * 기본 날짜 (예시용 - 2025년 10월 26일)
 */
export const DEFAULT_DATE = new Date(2025, 9, 26);

/**
 * 브랜드 색상
 */
export const BRAND_COLORS = {
  primary: '#2d5f4f',      // 메인 녹색
  secondary: '#3d7f5f',    // 보조 녹색
  light: '#f0f9f4',        // 연한 녹색
  gray: '#9ca3af',         // 회색
} as const;

/**
 * 페이지 제목
 */
export const PAGE_TITLES = {
  home: '홈',
  cheer: '응원게시판',
  stadium: '구장가이드',
  prediction: '승부예측',
  diary: '직관다이어리',
  login: '로그인',
  signup: '회원가입',
  mypage: '마이페이지',
  admin: '관리자',
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  SAVED_EMAIL: 'savedEmail',
  THEME: 'theme',
} as const;

/**
 * 날짜 관련 상수
 */
export const DATE_CONSTANTS = {
  OFF_SEASON_START: { month: 11, day: 15 },  // 11월 15일
  OFF_SEASON_END: { month: 3, day: 21 },     // 3월 21일
} as const;

/**
 * 팀 수
 */
export const TEAM_COUNT = 10;

/**
 * 플레이오프 진출 팀 수
 */
export const PLAYOFF_TEAMS = 5;