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