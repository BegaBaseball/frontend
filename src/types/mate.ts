// src/types/mate.ts
export interface Party {
  id: string;
  hostId: string;
  hostName: string;
  hostProfileImageUrl?: string;
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
  id: string;
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
}

export interface CheckIn {
  id: string;
  partyId: number;
  userId: number;
  userName: string;
  location: string;
  checkedInAt: string;
}

export interface ChatMessage {
  id: string;
  partyId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export type BadgeType = 'new' | 'verified' | 'trusted';

export type MateStatus = 
  | 'PENDING' 
  | 'MATCHED' 
  | 'CHECKED_IN' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'SELLING' 
  | 'SOLD';

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
  status: MateStatus;
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