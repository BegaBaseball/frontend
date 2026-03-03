// src/types/mate.ts
export interface Party {
  id: number;
  hostId: number;
  hostName: string;
  hostProfileImageUrl?: string;
  hostFavoriteTeam?: string;
  hostBadge: BadgeType;
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
  applicantBadge: BadgeType;
  applicantRating: number;
  message: string;
  // DIRECT_TRADE: 거래 기준 금액 스냅샷, TOSS_TEST: 보증금/결제 금액
  depositAmount: number;
  paymentType: 'DEPOSIT' | 'FULL';
  feeAmount?: number;
  netSettlementAmount?: number;
  paymentStatus?: 'PAID' | 'REFUND_REQUESTED' | 'CANCELED' | 'REFUND_FAILED';
  settlementStatus?: 'PENDING' | 'REQUESTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'REFUNDED_AFTER_SETTLEMENT';
  isApproved: boolean;
  isRejected: boolean;
  ticketVerified?: boolean;
  ticketImageUrl?: string;
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
  imageUrl?: string;
  createdAt: string;
}

export type BadgeType = 'NEW' | 'VERIFIED' | 'TRUSTED';

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
  hostBadge?: BadgeType;
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
  applicantId?: number;
  applicantName?: string;
  applicantBadge?: BadgeType;
  applicantRating?: number;
  message?: string;
  // DIRECT_TRADE: 거래 기준 금액 스냅샷, TOSS_TEST: 보증금/결제 금액
  depositAmount: number;
  paymentType: 'DEPOSIT' | 'FULL';
  verificationToken?: string | null;
  ticketVerified?: boolean;
  ticketImageUrl?: string | null;
}

export interface CreateCheckInRequest {
  partyId: number;
  location: string;
  qrSessionId?: string;
  manualCode?: string;
}

export interface CreateCheckInQrSessionRequest {
  partyId: number;
}

export interface CreateCheckInQrSessionResponse {
  sessionId: string;
  partyId: number;
  expiresAt: string;
  checkinUrl: string;
  manualCode?: string;
}

export interface CreateReviewRequest {
  partyId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
}

export type PaymentFlowType = 'DEPOSIT' | 'SELLING_FULL';

export type CancelReasonType =
  | 'BUYER_CHANGED_MIND'
  | 'SELLER_CHANGED_MIND'
  | 'SYSTEM'
  | 'EVENT_CANCELED'
  | 'OTHER';

export interface CancelApplicationRequest {
  cancelReasonType: CancelReasonType;
  cancelMemo?: string;
}

export interface CancelApplicationResponse {
  applicationId: number;
  refundAmount: number;
  feeCharged: number;
  refundPolicyApplied: string;
  paymentStatus?: Application['paymentStatus'];
  settlementStatus?: Application['settlementStatus'];
}
