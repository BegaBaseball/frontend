export type DirectMessageMembershipState = 'ACTIVE';

export interface DirectMessageTargetUser {
  id: number;
  name: string;
  handle: string;
  favoriteTeam?: string | null;
  profileImageUrl?: string | null;
}

export interface DirectMessageRoomBootstrap {
  roomId: number;
  membershipState: DirectMessageMembershipState;
  targetUser: DirectMessageTargetUser;
}

export interface DirectMessage {
  id: number | string;
  roomId: number;
  senderId: number;
  content: string;
  clientMessageId?: string | null;
  createdAt: string;
  isPending?: boolean;
}
