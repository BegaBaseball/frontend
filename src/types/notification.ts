export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_CANCELLED'
  | 'PARTY_EXPIRED'
  | 'PARTY_AUTO_COMPLETED'
  | 'GAME_TOMORROW_REMINDER'
  | 'GAME_DAY_REMINDER'
  | 'HOST_RESPONSE_NUDGE'
  | 'REVIEW_REQUEST'
  | 'PARTY_CANCELLED_HOST_DELETED'
  | 'PARTY_PARTICIPANT_LEFT'
  | 'POST_COMMENT'
  | 'COMMENT_REPLY'
  | 'POST_LIKE'
  | 'POST_REPOST'
  | 'NEW_FOLLOWER'
  | 'FOLLOWING_NEW_POST';

export interface NotificationData {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: number;
  isRead: boolean;
  createdAt: string;
}