// src/utils/constants.ts 생성
export const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string || 'http://localhost:8080/api';

// 카카오맵 관련 상수
export const MAP_CONFIG = {
  DEFAULT_LEVEL: 4,
  ZOOM_LEVEL: 3,
  SEARCH_RADIUS: 1000, // 1km
  MAX_SEARCH_RESULTS: 10,
  NEARBY_DISTANCE_KM: 1,
} as const;

// 폴링 관련 상수
export const POLLING_CONFIG = {
  CHECK_INTERVAL: 100, // ms
  MAX_CHECKS: 50,
  INIT_DELAY: 100, // ms
} as const;