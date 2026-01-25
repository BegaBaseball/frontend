// src/components/NotificationPanel.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Bell, MessageCircle, MessageSquare, Heart, UserPlus, FileText, Repeat2 } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';
import { NotificationData as Notification, NotificationType } from '../types/notification';

export default function NotificationPanel() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { notifications, unreadCount, setNotifications, setUnreadCount, markAsRead, removeNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const userId = await api.getUserIdByEmail(user.email);
        const id = userId.data || userId;

        const [notifs, count] = await Promise.all([
          api.getNotifications(id),
          api.getUnreadCount(id),
        ]);

        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error('알림 불러오기 오류:', error);
      }
    };

    fetchNotifications();

    // 30초마다 알림 갱신
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user, setNotifications, setUnreadCount]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // 읽음 처리
      if (!notification.isRead) {
        await api.markAsRead(notification.id);
        markAsRead(notification.id);
      }

      // 관련 페이지로 이동
      if (notification.type === 'APPLICATION_RECEIVED') {
        // 호스트: 파티 관리 페이지로
        navigate(`/mate/${notification.relatedId}/manage`);
      } else if (notification.type === 'APPLICATION_APPROVED' || notification.type === 'APPLICATION_REJECTED') {
        // 신청자: 파티 상세 페이지로
        navigate(`/mate/${notification.relatedId}`);
      } else if (notification.type === 'POST_COMMENT' || notification.type === 'COMMENT_REPLY' || notification.type === 'POST_LIKE' || notification.type === 'POST_REPOST') {
        // 응원석: 게시글 상세 페이지로
        navigate(`/cheer/${notification.relatedId}`);
      } else if (notification.type === 'NEW_FOLLOWER') {
        // 새 팔로워: relatedId는 팔로워의 userId
        // TODO: 프로필 페이지 구현 후 경로 업데이트
        navigate(`/cheer`);
      } else if (notification.type === 'FOLLOWING_NEW_POST') {
        // 팔로우한 유저의 새 게시글: relatedId는 postId
        navigate(`/cheer/${notification.relatedId}`);
      }
    } catch (error) {
      console.error('알림 처리 오류:', error);
    }
  };

  const handleDelete = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await api.deleteNotification(notificationId);
      removeNotification(notificationId);
    } catch (error) {
      console.error('알림 삭제 오류:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      // 메이트 관련
      case 'APPLICATION_RECEIVED':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'APPLICATION_APPROVED':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'APPLICATION_REJECTED':
        return <X className="w-5 h-5 text-red-500" />;

      // 응원석 관련
      case 'POST_COMMENT':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'COMMENT_REPLY':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'POST_LIKE':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'POST_REPOST':
        return <Repeat2 className="w-5 h-5 text-emerald-500" />;

      // 팔로우 관련
      case 'NEW_FOLLOWER':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'FOLLOWING_NEW_POST':
        return <FileText className="w-5 h-5 text-blue-500" />;

      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="max-h-[500px] overflow-y-auto">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className={`p-4 border-b cursor-pointer transition-colors ${notification.isRead
            ? 'bg-white hover:bg-gray-50'
            : 'bg-blue-50 hover:bg-blue-100'
            }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-sm" style={{ color: '#2d5f4f' }}>
                  {notification.title}
                </h4>
                {!notification.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {formatTime(notification.createdAt)}
                </span>

                <button
                  onClick={(e) => handleDelete(notification.id, e)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}