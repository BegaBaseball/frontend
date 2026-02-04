// src/utils/constants.ts 생성
import { Utensils, Truck, ShoppingBag, ParkingCircle } from 'lucide-react';
import { CategoryConfig } from '../types/stadium';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

export const KAKAO_API_KEY = (import.meta.env.VITE_KAKAO_MAP_KEY || import.meta.env.VITE_KAKAO_API_KEY || '') as string;
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

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  food: {
    key: 'food',
    label: '구장 먹거리',
    icon: Utensils,
    color: '#ff9500',
    bgColor: '#fff5e6',
    borderColor: '#ff9500',
  },
  delivery: {
    key: 'delivery',
    label: '배달픽업존',
    icon: Truck,
    color: '#2196f3',
    bgColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  store: {
    key: 'store',
    label: '편의점',
    icon: ShoppingBag,
    color: '#2d5f4f',
    bgColor: '#e8f5f0',
    borderColor: '#2d5f4f',
  },
  parking: {
    key: 'parking',
    label: '주차장',
    icon: ParkingCircle,
    color: '#2d5f4f',
    bgColor: '#e8f5f0',
    borderColor: '#2d5f4f',
  },
} as const;

export const THEME_COLORS = {
  primary: '#2d5f4f',
  primaryLight: '#e8f5f0',
  primaryBg: '#f0f9f6',
  border: '#e5e7eb',
  gray: '#4b5563',
} as const;

export const DEFAULT_PROFILE_IMAGE = baseballLogo;

export const STADIUMS = [
  '잠실야구장',
  '고척스카이돔',
  '인천SSG랜더스필드',
  '수원KT위즈파크',
  '대전한화생명이글스파크',
  '광주-기아 챔피언스필드',
  '대구삼성라이온즈파크',
  '창원NC파크',
  '사직야구장',
  '포항야구장',
];

export const TEAMS = [
  { id: 'doosan', name: '두산 베어스' },
  { id: 'lg', name: 'LG 트윈스' },
  { id: 'kiwoom', name: '키움 히어로즈' },
  { id: 'kt', name: 'KT 위즈' },
  { id: 'ssg', name: 'SSG 랜더스' },
  { id: 'nc', name: 'NC 다이노스' },
  { id: 'lotte', name: '롯데 자이언츠' },
  { id: 'samsung', name: '삼성 라이온즈' },
  { id: 'kia', name: 'KIA 타이거즈' },
  { id: 'hanwha', name: '한화 이글스' },
];

export const PARTY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '모집 중', color: '#2d5f4f' },
  MATCHED: { label: '매칭 성공', color: '#059669' },
  FAILED: { label: '매칭 실패', color: '#dc2626' },
  SELLING: { label: '티켓 판매', color: '#ea580c' },
  SOLD: { label: '판매 완료', color: '#6b7280' },
  CHECKED_IN: { label: '체크인 완료', color: '#7c3aed' },
  COMPLETED: { label: '관람 완료', color: '#4b5563' },
};

export const DEPOSIT_AMOUNT = 10000; // 보증금
