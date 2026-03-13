export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
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
  | 'FOLLOWING_NEW_POST'
  | 'NEW_DEVICE_LOGIN';

export interface NotificationData {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
}
