// src/types/mate.ts
export interface Party {
  id: number;
  hostId?: number;
  hostHandle?: string;
  hostName: string;
  hostProfileImageUrl?: string;
  hostFavoriteTeam?: string;
  hostBadge: BadgeType;
  hostAverageRating: number | null;
  hostReviewCount: number;
  teamId: string;
  cheeringSide?: CheeringSide | null;
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  seatDetail?: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  ticketVerified: boolean;
  ticketImageUrl?: string;
  status: PartyStatus;
  price?: number;
  ticketPrice?: number;
  reservationDepositAmount?: number | null;
  hostTrustMetrics?: HostTrustMetrics | null;
  favorited?: boolean;
  members?: MemberSummary[];
  createdAt: string;
}

export interface MemberSummary {
  initial: string;
  profileImageUrl?: string | null;
  role: string;
  host: boolean;
}

export interface HostTrustMetrics {
  averageResponseMinutes?: number | null;
  lastActiveAt?: string | null;
  completedMateCount?: number | null;
  recentNoShowCount?: number | null;
  reviewKeywordSummary?: ReviewKeywordSummary[];
  recentHostReviews?: HostReviewSnippet[];
}

export interface ReviewKeywordSummary {
  label: string;
  count: number;
}

export interface HostReviewSnippet {
  reviewerHandle?: string | null;
  rating: number;
  comment?: string | null;
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

export type MatePartySortBy = 'createdAt' | 'gameDate' | 'currentParticipants';
export type MatePartySortDir = 'asc' | 'desc';

export interface MatePopularSearchTerm {
  term: string;
  count: number;
  rank: number;
}

export interface Application {
  id: number;
  partyId: number;
  applicantHandle?: string;
  applicantName: string;
  applicantBadge: BadgeType;
  applicantRating: number;
  message: string;
  depositAmount?: number;
  paymentType?: 'DEPOSIT' | 'FULL';
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
  userHandle?: string;
  userName: string;
  location: string;
  checkedInAt: string;
}

export interface PartyReview {
  id: number;
  partyId: number;
  reviewerHandle?: string;
  revieweeHandle?: string;
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
  clientMessageId?: string;
  createdAt: string;
}

export type BadgeType = 'NEW' | 'VERIFIED' | 'TRUSTED';
export type CheeringSide = 'HOME' | 'AWAY' | 'NEUTRAL';

// MateParty: 히스토리/목록용 간소화 타입 (Party의 서브셋)
export interface MateParty {
  id: number;
  hostId?: number;
  hostHandle?: string;
  teamId: string;
  cheeringSide?: CheeringSide | null;
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

export type MatePartySeed = Party | MateParty;

export interface MateRouteLocationState {
  partySeed?: MatePartySeed;
}

export interface MateApplication {
  id: number;
  partyId: number;
  status: string;
}

export type MateHistoryTab = 'all' | 'completed' | 'ongoing';

// --- Request Types (matching backend DTOs) ---

export interface CreatePartyRequest {
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  cheeringSide: CheeringSide;
  section: string;
  seatDetail?: string;
  maxParticipants: number;
  description: string;
  ticketPrice?: number;
  reservationDepositAmount?: number | null;
  reservationNumber?: string;
  verificationToken: string;
}

export interface UpdatePartyRequest {
  status?: PartyStatus;
  price?: number;
  description?: string;
  section?: string;
  seatDetail?: string;
  maxParticipants?: number;
  ticketPrice?: number;
  reservationDepositAmount?: number | null;
}

export interface CreateApplicationRequest {
  partyId: number;
  message?: string;
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
  revieweeHandle: string;
  rating: number;
  comment?: string;
}

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
