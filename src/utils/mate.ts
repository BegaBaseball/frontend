// src/utils/mate.ts
import { BadgeType, MateHistoryTab, MateParty, MatePartySeed, MateRouteLocationState, Party, PartyStatus } from '../types/mate';
import { getMateStatusBadgeMeta, getStatusBadgeToneColor } from './statusBadgeMeta';

interface BackendLocalTime {
  hour?: number;
  minute?: number;
  second?: number;
  nano?: number;
}

export interface BackendPartyDTO {
  id: number;
  hostId?: number | null;
  hostHandle?: string | null;
  hostName: string;
  hostProfileImageUrl?: string | null;
  hostFavoriteTeam?: string | null;
  hostBadge: string;
  hostAverageRating?: number | null;
  hostReviewCount?: number;
  teamId: string;
  cheeringSide?: Party['cheeringSide'];
  gameDate: string;
  gameTime: string | BackendLocalTime;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  seatDetail?: string | null;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  ticketVerified: boolean;
  ticketImageUrl?: string | null;
  status: PartyStatus;
  price?: number | null;
  ticketPrice?: number | null;
  reservationDepositAmount?: number | null;
  hostTrustMetrics?: Party['hostTrustMetrics'];
  favorited?: boolean | null;
  members?: Party['members'];
  createdAt: string;
}

const normalizeBadgeType = (badge: string): BadgeType => {
  const normalized = badge.toUpperCase();
  if (normalized === 'NEW' || normalized === 'VERIFIED' || normalized === 'TRUSTED') {
    return normalized;
  }
  return 'NEW';
};

const formatBackendGameTime = (value: BackendPartyDTO['gameTime']): string => {
  if (typeof value === 'string') {
    return value;
  }

  const hour = `${value.hour ?? 0}`.padStart(2, '0');
  const minute = `${value.minute ?? 0}`.padStart(2, '0');
  return `${hour}:${minute}`;
};

export const mapBackendPartyToFrontend = (backendParty: BackendPartyDTO): Party => ({
  id: backendParty.id,
  hostId: backendParty.hostId ?? undefined,
  hostHandle: backendParty.hostHandle ?? undefined,
  hostName: backendParty.hostName,
  hostProfileImageUrl: backendParty.hostProfileImageUrl ?? undefined,
  hostFavoriteTeam: backendParty.hostFavoriteTeam ?? undefined,
  hostBadge: normalizeBadgeType(backendParty.hostBadge),
  hostAverageRating: backendParty.hostAverageRating ?? null,
  hostReviewCount: backendParty.hostReviewCount ?? 0,
  teamId: backendParty.teamId,
  cheeringSide: backendParty.cheeringSide ?? null,
  gameDate: backendParty.gameDate,
  gameTime: formatBackendGameTime(backendParty.gameTime),
  stadium: backendParty.stadium,
  homeTeam: backendParty.homeTeam,
  awayTeam: backendParty.awayTeam,
  section: backendParty.section,
  seatDetail: backendParty.seatDetail ?? undefined,
  maxParticipants: backendParty.maxParticipants,
  currentParticipants: backendParty.currentParticipants,
  description: backendParty.description,
  ticketVerified: backendParty.ticketVerified,
  ticketImageUrl: backendParty.ticketImageUrl ?? undefined,
  status: backendParty.status,
  price: backendParty.price ?? undefined,
  ticketPrice: backendParty.ticketPrice ?? 0,
  reservationDepositAmount: backendParty.reservationDepositAmount ?? null,
  hostTrustMetrics: backendParty.hostTrustMetrics ?? null,
  favorited: backendParty.favorited ?? undefined,
  members: backendParty.members ?? undefined,
  createdAt: backendParty.createdAt,
});

type HostReviewSummary = Pick<Party, 'hostAverageRating' | 'hostReviewCount'>;

export const getHostAverageRating = (party: HostReviewSummary): number | null => {
  if ((party.hostReviewCount ?? 0) < 1) {
    return null;
  }
  return typeof party.hostAverageRating === 'number' ? party.hostAverageRating : null;
};

export const formatHostAverageRating = (party: HostReviewSummary): string => {
  const averageRating = getHostAverageRating(party);
  return averageRating === null ? '리뷰 없음' : averageRating.toFixed(1);
};

type MateIdentity = {
  id?: number | null;
  handle?: string | null;
};

const normalizeMateIdentityHandle = (handle?: string | null): string => {
  const trimmedHandle = handle?.trim();
  if (!trimmedHandle) {
    return '';
  }
  return trimmedHandle.replace(/^@/, '').toLowerCase();
};

export const hasSameMateUserIdentity = (
  left: MateIdentity | null | undefined,
  right: MateIdentity | null | undefined,
): boolean => {
  const leftHandle = normalizeMateIdentityHandle(left?.handle);
  const rightHandle = normalizeMateIdentityHandle(right?.handle);
  if (leftHandle && rightHandle) {
    return leftHandle === rightHandle;
  }

  const leftId = left?.id;
  const rightId = right?.id;
  return typeof leftId === 'number' && typeof rightId === 'number' && leftId === rightId;
};

export const isPartyHostedByUser = (
  party: Pick<Party, 'hostId' | 'hostHandle'> | null | undefined,
  user: MateIdentity | null | undefined,
): boolean => hasSameMateUserIdentity(
  { id: party?.hostId ?? null, handle: party?.hostHandle ?? null },
  user,
);

export const getMatePartyDisplayTeamId = (
  party: Pick<Party, 'teamId' | 'cheeringSide' | 'homeTeam' | 'awayTeam'> | null | undefined,
): string => {
  if (!party) {
    return '';
  }
  if (party.cheeringSide === 'HOME') {
    return party.homeTeam || party.teamId;
  }
  if (party.cheeringSide === 'AWAY') {
    return party.awayTeam || party.teamId;
  }
  if (party.cheeringSide === 'NEUTRAL') {
    return [party.homeTeam, party.awayTeam].filter(Boolean).join('/') || party.teamId;
  }
  return party.teamId;
};

export const normalizeMatePartySeed = (
  party: MatePartySeed | null | undefined,
): Party | null => {
  if (!party) {
    return null;
  }

  if ('hostName' in party) {
    return party;
  }

  return {
    id: party.id,
    hostId: party.hostId,
    hostHandle: party.hostHandle,
    hostName: '',
    hostBadge: 'NEW',
    hostAverageRating: null,
    hostReviewCount: 0,
    teamId: party.teamId,
    cheeringSide: party.cheeringSide ?? null,
    gameDate: party.gameDate,
    gameTime: party.gameTime,
    stadium: party.stadium,
    homeTeam: party.homeTeam,
    awayTeam: party.awayTeam,
    section: party.section,
    maxParticipants: party.maxParticipants,
    currentParticipants: party.currentParticipants,
    description: party.description || '',
    ticketVerified: false,
    status: party.status,
    reservationDepositAmount: null,
    hostTrustMetrics: null,
    createdAt: '',
  };
};

export const buildMateRouteLocationState = (
  partySeed: MatePartySeed,
): MateRouteLocationState => ({
  partySeed,
});

export const getMateRoutePlaceholderParty = (
  state: unknown,
  routePartyId: number | null,
): Party | undefined => {
  if (!state || typeof state !== 'object' || !('partySeed' in state)) {
    return undefined;
  }

  const placeholderParty = normalizeMatePartySeed(
    (state as MateRouteLocationState).partySeed,
  );

  if (!placeholderParty) {
    return undefined;
  }

  if (routePartyId !== null && placeholderParty.id !== routePartyId) {
    return undefined;
  }

  return placeholderParty;
};

export const filterActiveParties = (parties: Party[]): Party[] => {
  return parties.filter(party =>
    party.status !== 'CHECKED_IN' && party.status !== 'COMPLETED'
  );
};

export const isGameSoon = (gameDate: string): boolean => {
  const date = new Date(gameDate);
  const now = new Date();
  const hoursUntilGame = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilGame < 24 && hoursUntilGame > 0;
};

export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '오늘';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '어제';
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  }
};


/**
 * 탭에 따라 파티 필터링
 */
export const filterPartiesByTab = (
  parties: MateParty[],
  tab: MateHistoryTab
): MateParty[] => {
  if (tab === 'completed') {
    return parties.filter(
      (p) => p.status === 'COMPLETED' || p.status === 'CHECKED_IN'
    );
  }

  if (tab === 'ongoing') {
    return parties.filter(
      (p) => p.status === 'PENDING' || p.status === 'MATCHED'
    );
  }

  return parties; // 'all'
};

/**
 * 상태별 라벨 가져오기
 */
export const getStatusLabel = (status: PartyStatus): string => {
  return getMateStatusBadgeMeta(status).label || status;
};

/**
 * 요일 계산
 */
export const getDayOfWeek = (dateString: string): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  // Parse YYYY-MM-DD manually to avoid UTC offset issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return days[date.getDay()];
};

/**
 * 경기 날짜를 통일된 포맷으로 변환: "YYYY.MM.DD (요일)"
 */
export const formatGameDate = (dateString: string): string => {
  const formatted = dateString.replace(/-/g, '.');
  const dayOfWeek = getDayOfWeek(dateString);
  return `${formatted} (${dayOfWeek})`;
};

/**
 * description에서 해시태그 추출
 */
export const extractHashtags = (description: string): string[] => {
  const matches = description.match(/#[^\s#]+/g);
  return matches ? [...new Set(matches)] : [];
};

/**
 * 상태별 스타일 가져오기 (mono mint surface — dot 색만 상태 구분)
 */
export const getStatusStyle = (status: PartyStatus): { dotColor: string; isLive: boolean } => {
  const meta = getMateStatusBadgeMeta(status);

  return {
    dotColor: getStatusBadgeToneColor(meta.tone),
    isLive: Boolean(meta.live),
  };
};

/**
 * description에서 해시태그 제거 (순수 텍스트만 추출)
 */
export const stripHashtags = (description: string): string => {
  return description ? description.replace(/#[^\s#]+/g, '').trim() : '';
};
