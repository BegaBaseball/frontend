// src/types/mate.ts
export interface Party {
  id: number;
  hostId: number;
  hostName: string;
  hostProfileImageUrl?: string;
  hostFavoriteTeam?: string;
  hostBadge: string;
  hostRating: number;
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

export type PartyStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'FAILED'
  | 'SELLING'
  | 'SOLD'
  | 'CHECKED_IN'
  | 'COMPLETED';

export interface Application {
  id: number;
  partyId: number;
  applicantId: number;
  applicantName: string;
  applicantBadge: string;
  applicantRating: number;
  message: string;
  depositAmount: number;
  paymentType: 'DEPOSIT' | 'FULL';
  isApproved: boolean;
  isRejected: boolean;
  createdAt: string;
  responseDeadline?: string;
}

export interface CheckIn {
  id: number;
  partyId: number;
  userId: number;
  userName: string;
  location: string;
  checkedInAt: string;
}

export interface ChatMessage {
  id: number;
  partyId: number;
  senderId: number;
  senderName: string;
  message: string;
  createdAt: string;
}

export type BadgeType = 'new' | 'verified' | 'trusted';

// MateParty: 히스토리/목록용 간소화 타입 (Party의 서브셋)
export interface MateParty {
  id: number;
  hostId: number;
  teamId: string;
  stadium: string;
  gameDate: string;
  gameTime: string;
  section: string;
  currentParticipants: number;
  maxParticipants: number;
  status: PartyStatus;
  description?: string;
  homeTeam: string;
  awayTeam: string;
}

export interface MateApplication {
  id: number;
  partyId: number;
  applicantId: number;
  status: string;
}

export type MateHistoryTab = 'all' | 'completed' | 'ongoing';
