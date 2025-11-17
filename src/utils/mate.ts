// src/utils/mate.ts
import { Party, PartyStatus } from '../types/mate';

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