// src/utils/mate.ts
import { BadgeType, MateHistoryTab, MateParty, MatePartySeed, MateRouteLocationState, Party, PartyStatus } from '../types/mate';

interface BackendPartyDTO {
  id: number;
  hostId?: number;
  hostHandle?: string;
  hostName: string;
  hostProfileImageUrl?: string;
  hostFavoriteTeam?: string;
  hostBadge: string;
  hostAverageRating?: number | null;
  hostReviewCount?: number;
  teamId: string;
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  ticketVerified: boolean;
  ticketImageUrl?: string;
  status: PartyStatus;
  price?: number;
  ticketPrice?: number;
  createdAt: string;
}

const normalizeBadgeType = (badge: string): BadgeType => {
  const normalized = badge.toUpperCase();
  if (normalized === 'NEW' || normalized === 'VERIFIED' || normalized === 'TRUSTED') {
    return normalized;
  }
  return 'NEW';
};

export const mapBackendPartyToFrontend = (backendParty: BackendPartyDTO): Party => ({
  id: backendParty.id,
  hostId: backendParty.hostId,
  hostHandle: backendParty.hostHandle,
  hostName: backendParty.hostName,
  hostProfileImageUrl: backendParty.hostProfileImageUrl,
  hostFavoriteTeam: backendParty.hostFavoriteTeam,
  hostBadge: normalizeBadgeType(backendParty.hostBadge),
  hostAverageRating: backendParty.hostAverageRating ?? null,
  hostReviewCount: backendParty.hostReviewCount ?? 0,
  teamId: backendParty.teamId,
  gameDate: backendParty.gameDate,
  gameTime: backendParty.gameTime,
  stadium: backendParty.stadium,
  homeTeam: backendParty.homeTeam,
  awayTeam: backendParty.awayTeam,
  section: backendParty.section,
  maxParticipants: backendParty.maxParticipants,
  currentParticipants: backendParty.currentParticipants,
  description: backendParty.description,
  ticketVerified: backendParty.ticketVerified,
  ticketImageUrl: backendParty.ticketImageUrl,
  status: backendParty.status,
  price: backendParty.price,
  ticketPrice: backendParty.ticketPrice || 0,
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

export const hasSameMateUserIdentity = (
  left: MateIdentity | null | undefined,
  right: MateIdentity | null | undefined,
): boolean => {
  const leftHandle = left?.handle?.trim();
  const rightHandle = right?.handle?.trim();
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
  const labels: Record<PartyStatus, string> = {
    PENDING: '모집 중',
    MATCHED: '매칭 완료',
    CHECKED_IN: '체크인 완료',
    COMPLETED: '완료',
    FAILED: '매칭 실패',
    SELLING: '티켓 판매',
    SOLD: '판매 완료',
  };

  return labels[status] || status;
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
 * 상태별 스타일 가져오기
 */
export const getStatusStyle = (status: PartyStatus) => {
  const styles: Record<PartyStatus, { bg: string; text: string }> = {
    PENDING: { bg: 'bg-blue-100', text: 'text-blue-700' },
    MATCHED: { bg: 'bg-blue-100', text: 'text-blue-700' },
    CHECKED_IN: { bg: 'bg-blue-100', text: 'text-blue-700' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-700' },
    SELLING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    SOLD: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  return styles[status] || styles.PENDING;
};

/**
 * description에서 해시태그 제거 (순수 텍스트만 추출)
 */
export const stripHashtags = (description: string): string => {
  return description ? description.replace(/#[^\s#]+/g, '').trim() : '';
};
