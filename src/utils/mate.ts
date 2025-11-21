// src/utils/mate.ts
import { Party, PartyStatus } from '../types/mate';
import { MateParty, MateHistoryTab, MateStatus } from '../types/mate';

export const mapBackendPartyToFrontend = (backendParty: any): Party => ({
  id: backendParty.id.toString(),
  hostId: backendParty.hostId.toString(),
  hostName: backendParty.hostName,
  hostProfileImageUrl: backendParty.hostProfileImageUrl,
  hostBadge: backendParty.hostBadge.toLowerCase(),
  hostRating: backendParty.hostRating,
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
export const getStatusLabel = (status: MateStatus): string => {
  const labels: Record<MateStatus, string> = {
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
 * 상태별 스타일 가져오기
 */
export const getStatusStyle = (status: MateStatus) => {
  const styles: Record<MateStatus, { bg: string; text: string }> = {
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