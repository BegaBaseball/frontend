import type { StatusBadgeLiveMode, StatusBadgeMarker, StatusBadgeTone, StatusBadgeVariant } from '../components/ui/status-badge';
import type { PartyStatus } from '../types/mate';

export interface StatusBadgeMeta {
  label: string;
  accessibleLabel: string;
  tone: StatusBadgeTone;
  marker: StatusBadgeMarker;
  live?: boolean;
  liveMode?: StatusBadgeLiveMode;
  variant?: StatusBadgeVariant;
  /** Raw hex for the marker dot when variant is "filled". */
  dotColor?: string;
  /** Raw hex for the label text when variant is "filled" (defaults to white). */
  filledTextColor?: string;
}

// 딥 민트 필드 칩(#173b34) + 상태별 점 색 — 매칭 완료는 tint 텍스트로 구분
export const MATE_STATUS_BADGE_META: Record<PartyStatus, StatusBadgeMeta> = {
  PENDING: {
    label: '모집 중',
    accessibleLabel: '신청 가능',
    tone: 'success',
    marker: 'dot',
    live: true,
    variant: 'filled',
    dotColor: '#63b39b',
  },
  MATCHED: {
    label: '매칭 성공',
    accessibleLabel: '매칭 성공',
    tone: 'success',
    marker: 'check',
    variant: 'filled',
    dotColor: '#22c55e',
    filledTextColor: '#63b39b',
  },
  FAILED: {
    label: '매칭 실패',
    accessibleLabel: '매칭 실패',
    tone: 'danger',
    marker: 'x',
    variant: 'filled',
    dotColor: '#ef4444',
    filledTextColor: 'rgba(255,255,255,0.65)',
  },
  SELLING: {
    label: '판매 중',
    accessibleLabel: '판매 가능',
    tone: 'warning',
    marker: 'arrow',
    live: true,
    liveMode: 'hover',
    variant: 'filled',
    dotColor: '#ea580c',
  },
  SOLD: {
    label: '판매 완료',
    accessibleLabel: '판매 완료',
    tone: 'neutral',
    marker: 'check',
    variant: 'filled',
    dotColor: '#8fa0ab',
    filledTextColor: 'rgba(255,255,255,0.75)',
  },
  CHECKED_IN: {
    label: '체크인',
    accessibleLabel: '체크인',
    tone: 'violet',
    marker: 'diamond',
    variant: 'filled',
    dotColor: '#a78bfa',
  },
  COMPLETED: {
    label: '관람 완료',
    accessibleLabel: '관람 완료',
    tone: 'neutral',
    marker: 'check',
    variant: 'filled',
    dotColor: '#8fa0ab',
    filledTextColor: 'rgba(255,255,255,0.75)',
  },
};

const DEFAULT_MATE_STATUS_META: StatusBadgeMeta = {
  label: '마감',
  accessibleLabel: '마감',
  tone: 'neutral',
  marker: 'dash',
};

export type NormalizedStatusBadgeGameStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'DRAW'
  | 'UNKNOWN';

const normalizeGameStatus = (status: string | null | undefined): NormalizedStatusBadgeGameStatus => {
  const normalized = (status || '').trim().toUpperCase();

  if (normalized === 'LIVE' || normalized === 'IN_PROGRESS' || normalized === 'INPROGRESS' || normalized === 'PLAYING') {
    return 'LIVE';
  }
  if (normalized === 'FINAL' || normalized === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (normalized === 'POSTPONED') {
    return 'POSTPONED';
  }
  if (normalized === 'CANCELLED' || normalized === 'CANCEL') {
    return 'CANCELLED';
  }
  if (normalized === 'DRAW') {
    return 'DRAW';
  }
  if (
    normalized === 'SCHEDULED'
    || normalized === 'READY'
    || normalized === 'PENDING'
    || normalized === 'NOT_STARTED'
    || normalized === 'TBD'
    || normalized === ''
  ) {
    return 'SCHEDULED';
  }

  return 'UNKNOWN';
};

const GAME_STATUS_BADGE_META: Record<NormalizedStatusBadgeGameStatus, StatusBadgeMeta> = {
  SCHEDULED: {
    label: '경기 예정',
    accessibleLabel: '경기 예정',
    tone: 'info',
    marker: 'dot',
  },
  LIVE: {
    label: 'LIVE',
    accessibleLabel: '경기 진행중',
    tone: 'danger',
    marker: 'dot',
    live: true,
  },
  COMPLETED: {
    label: '경기 종료',
    accessibleLabel: '경기 종료',
    tone: 'neutral',
    marker: 'check',
  },
  POSTPONED: {
    label: '경기 연기',
    accessibleLabel: '경기 연기',
    tone: 'warning',
    marker: 'dash',
  },
  CANCELLED: {
    label: '경기 취소',
    accessibleLabel: '경기 취소',
    tone: 'neutral',
    marker: 'dash',
  },
  DRAW: {
    label: '무승부',
    accessibleLabel: '무승부',
    tone: 'neutral',
    marker: 'dash',
  },
  UNKNOWN: {
    label: '상태 미정',
    accessibleLabel: '상태 미정',
    tone: 'neutral',
    marker: 'dash',
  },
};

const ADMIN_STATUS_BADGE_META: Record<string, StatusBadgeMeta> = {
  PASS: {
    label: 'PASS',
    accessibleLabel: 'PASS',
    tone: 'success',
    marker: 'check',
  },
  FAIL: {
    label: 'FAIL',
    accessibleLabel: 'FAIL',
    tone: 'danger',
    marker: 'x',
  },
  WARN: {
    label: 'WARN',
    accessibleLabel: 'WARN',
    tone: 'warning',
    marker: 'dot',
  },
  GO: {
    label: 'GO',
    accessibleLabel: 'GO',
    tone: 'success',
    marker: 'check',
  },
  NO_GO: {
    label: 'NO_GO',
    accessibleLabel: 'NO_GO',
    tone: 'danger',
    marker: 'x',
  },
  PENDING: {
    label: '대기',
    accessibleLabel: '대기',
    tone: 'warning',
    marker: 'dot',
  },
  IN_REVIEW: {
    label: '검토중',
    accessibleLabel: '검토중',
    tone: 'warning',
    marker: 'dot',
    live: true,
  },
  RESOLVED: {
    label: '완료',
    accessibleLabel: '완료',
    tone: 'success',
    marker: 'check',
  },
  CLOSED: {
    label: '종결',
    accessibleLabel: '종결',
    tone: 'neutral',
    marker: 'dash',
  },
  DRAFT: {
    label: '초안',
    accessibleLabel: '초안',
    tone: 'neutral',
    marker: 'dot',
  },
  REQUESTED: {
    label: '요청 완료',
    accessibleLabel: '요청 완료',
    tone: 'info',
    marker: 'arrow',
  },
  IN_PROGRESS: {
    label: '정제 진행 중',
    accessibleLabel: '정제 진행 중',
    tone: 'warning',
    marker: 'dot',
    live: true,
  },
  DONE: {
    label: '정제 완료',
    accessibleLabel: '정제 완료',
    tone: 'success',
    marker: 'check',
  },
  UNKNOWN: {
    label: '상태 미정',
    accessibleLabel: '상태 미정',
    tone: 'neutral',
    marker: 'dash',
  },
};

const TONE_ACCENT_COLOR: Record<StatusBadgeTone, string> = {
  brand: '#2d5f4f',
  success: '#168a5b',
  danger: '#d23a56',
  warning: '#c46a0a',
  info: '#2563d8',
  violet: '#7650d9',
  neutral: '#718096',
};

export const getMateStatusBadgeMeta = (status: PartyStatus | string | null | undefined): StatusBadgeMeta => {
  if (!status || !(status in MATE_STATUS_BADGE_META)) {
    return DEFAULT_MATE_STATUS_META;
  }

  return MATE_STATUS_BADGE_META[status as PartyStatus];
};

export const getGameStatusBadgeMeta = (
  status: string | null | undefined,
  explicitLabel?: string | null,
): StatusBadgeMeta => {
  const normalizedStatus = normalizeGameStatus(status);
  const meta = GAME_STATUS_BADGE_META[normalizedStatus];
  const label = explicitLabel?.trim();

  if (!label || label === '정보 없음') {
    return meta;
  }

  return {
    ...meta,
    label,
    accessibleLabel: label,
  };
};

export const getAdminStatusBadgeMeta = (
  status: string | null | undefined,
  explicitLabel?: string | null,
): StatusBadgeMeta => {
  const normalizedStatus = (status || 'UNKNOWN').trim().toUpperCase();
  const meta = ADMIN_STATUS_BADGE_META[normalizedStatus] ?? ADMIN_STATUS_BADGE_META.UNKNOWN;
  const label = explicitLabel?.trim();

  if (!label) {
    return meta;
  }

  return {
    ...meta,
    label,
    accessibleLabel: label,
  };
};

export const getStatusBadgeToneColor = (tone: StatusBadgeTone): string => TONE_ACCENT_COLOR[tone];
