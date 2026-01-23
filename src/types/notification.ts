export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_CANCELLED'
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