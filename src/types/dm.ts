export type DirectMessageMembershipState = 'ACTIVE';

export interface DmInboxRoom {
  roomId: number;
  targetUser: DirectMessageTargetUser;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: number;
  } | null;
  hasUnread: boolean;
}

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

export interface DmDeleteEvent {
  messageId: number;
  roomId: number;
  deleted: true;
}
