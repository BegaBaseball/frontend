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

export interface PartyReview {
  id: number;
  partyId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number | string;
  partyId: number | string;
  senderId: number | string;
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

// --- Request Types (matching backend DTOs) ---

export interface CreatePartyRequest {
  hostId: number;
  hostName: string;
  hostBadge?: string;
  hostRating?: number;
  teamId: string;
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  maxParticipants: number;
  description: string;
  ticketImageUrl?: string | null;
  ticketPrice?: number;
  reservationNumber?: string;
}

export interface UpdatePartyRequest {
  status?: PartyStatus;
  price?: number;
  description?: string;
  section?: string;
  maxParticipants?: number;
  ticketPrice?: number;
}

export interface CreateApplicationRequest {
  partyId: number;
  applicantId: number;
  applicantName: string;
  applicantBadge: string;
  applicantRating: number;
  message: string;
  depositAmount: number;
  paymentType: 'DEPOSIT' | 'FULL';
}

export interface CreateCheckInRequest {
  partyId: number;
  userId: number;
  location: string;
}

export interface CreateReviewRequest {
  partyId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
}
