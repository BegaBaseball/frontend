import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthSession } from '../store/authStore';
import { notificationApi, isIgnorableNotificationError } from '../utils/notificationApi';
import { NotificationData as Notification, NotificationType } from '../types/notification';
import {
  NotificationAlertTriangleIcon,
  NotificationBellIcon,
  NotificationCalendarIcon,
  NotificationCheckCheckIcon,
  NotificationCheckIcon,
  NotificationClockIcon,
  NotificationCloseIcon,
  NotificationFileTextIcon,
  NotificationHeartIcon,
  NotificationMessageCircleIcon,
  NotificationMessageSquareIcon,
  NotificationRepeatIcon,
  NotificationShieldAlertIcon,
  NotificationStarIcon,
  NotificationTrashIcon,
  NotificationUserPlusIcon,
} from './NotificationIcons';

type TabType = 'ALL' | 'MATE' | 'CHEER';

export default function NotificationPanel() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const unreadCount = notifications.reduce((count, notif) => (!notif.isRead ? count + 1 : count), 0);

  // 패널이 열릴 때 1회 fetch (WebSocket push가 이후 업데이트를 담당)
  useEffect(() => {
    if (!isLoggedIn) return;

    notificationApi.getNotifications()
      .then(setNotifications)
      .catch((error) => {
        if (!isIgnorableNotificationError(error)) {
          console.error('알림 불러오기 오류:', error);
        }
      });
  }, [isLoggedIn, setNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await notificationApi.markAsRead(notification.id);
        markAsRead(notification.id);
      }

      if (notification.type === 'APPLICATION_RECEIVED' || notification.type === 'HOST_RESPONSE_NUDGE') {
        navigate(`/mate/${notification.relatedId}/manage`);
      } else if (['APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'PARTY_EXPIRED', 'PARTY_AUTO_COMPLETED', 'GAME_TOMORROW_REMINDER', 'GAME_DAY_REMINDER', 'REVIEW_REQUEST'].includes(notification.type)) {
        navigate(`/mate/${notification.relatedId}`);
      } else if (['POST_COMMENT', 'COMMENT_REPLY', 'POST_LIKE', 'POST_REPOST'].includes(notification.type)) {
        navigate(`/cheer/${notification.relatedId}`);
      } else if (notification.type === 'NEW_FOLLOWER') {
        navigate(`/cheer`);
      } else if (notification.type === 'FOLLOWING_NEW_POST') {
        navigate(`/cheer/${notification.relatedId}`);
      } else if (notification.type === 'NEW_DEVICE_LOGIN') {
        navigate('/mypage?view=accountSettings');
      }
    } catch (error) {
      console.error('알림 처리 오류:', error);
      toast.error('알림 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(notificationId);
      removeNotification(notificationId);
    } catch (error) {
      console.error('알림 삭제 오류:', error);
      toast.error('알림 삭제에 실패했습니다.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Backend bulk read endpoint is missing, so we loop through unread notifications
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await Promise.all(unreadIds.map(id => notificationApi.markAsRead(id)));
      markAllAsRead();
    } catch (error) {
      console.error('일괄 읽음 처리 오류:', error);
      toast.error('일괄 읽음 처리에 실패했습니다.');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPLICATION_RECEIVED': return <NotificationBellIcon className="w-5 h-5 text-blue-500" />;
      case 'APPLICATION_APPROVED': return <NotificationCheckIcon className="w-5 h-5 text-green-500" />;
      case 'APPLICATION_REJECTED': return <NotificationCloseIcon className="w-5 h-5 text-red-500" />;
      case 'PARTY_EXPIRED': return <NotificationAlertTriangleIcon className="w-5 h-5 text-orange-500" />;
      case 'PARTY_AUTO_COMPLETED': return <NotificationCheckIcon className="w-5 h-5 text-gray-500" />;
      case 'GAME_TOMORROW_REMINDER': return <NotificationCalendarIcon className="w-5 h-5 text-blue-500" />;
      case 'GAME_DAY_REMINDER': return <NotificationCalendarIcon className="w-5 h-5 text-green-500" />;
      case 'HOST_RESPONSE_NUDGE': return <NotificationClockIcon className="w-5 h-5 text-orange-500" />;
      case 'REVIEW_REQUEST': return <NotificationStarIcon className="w-5 h-5 text-yellow-500" />;
      case 'POST_COMMENT': return <NotificationMessageCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'COMMENT_REPLY': return <NotificationMessageSquareIcon className="w-5 h-5 text-purple-500" />;
      case 'POST_LIKE': return <NotificationHeartIcon className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'POST_REPOST': return <NotificationRepeatIcon className="w-5 h-5 text-emerald-500" />;
      case 'NEW_FOLLOWER': return <NotificationUserPlusIcon className="w-5 h-5 text-green-500" />;
      case 'FOLLOWING_NEW_POST': return <NotificationFileTextIcon className="w-5 h-5 text-blue-500" />;
      case 'NEW_DEVICE_LOGIN': return <NotificationShieldAlertIcon className="w-5 h-5 text-red-500" />;
      default: return <NotificationBellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // Helpers for rendering
  const renderMessageWithBold = (message: string) => {
    // Bold names ending with '님' or text inside quotes
    // Example: "김철수님이...", "'공지사항' 게시글에..."
    // Using a regex that captures the whole group to bold
    const parts = message.split(/([^\s]+님|'.*?')/g);
    return parts.map((part, i) => {
      if (part.match(/[^\s]+님|'.*?'/)) {
        return <strong key={i} className="font-bold text-gray-900 dark:text-gray-100">{part}</strong>;
      }
      return part;
    });
  };

  const groupNotifications = (notifs: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const groups: { [key: string]: Notification[] } = {
      '오늘': [],
      '이번 주': [],
      '이전 알림': []
    };

    notifs.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= today) {
        groups['오늘'].push(n);
      } else if (date >= startOfWeek) {
        groups['이번 주'].push(n);
      } else {
        groups['이전 알림'].push(n);
      }
    });

    return groups;
  };

  // Filter and then Group
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MATE') return ['APPLICATION_RECEIVED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'PARTY_EXPIRED', 'PARTY_AUTO_COMPLETED', 'GAME_TOMORROW_REMINDER', 'GAME_DAY_REMINDER', 'HOST_RESPONSE_NUDGE', 'REVIEW_REQUEST'].includes(n.type);
    if (activeTab === 'CHEER') return ['POST_COMMENT', 'COMMENT_REPLY', 'POST_LIKE', 'POST_REPOST', 'NEW_FOLLOWER', 'FOLLOWING_NEW_POST'].includes(n.type);
    return true;
  });

  const groupedNotifications = groupNotifications(filteredNotifications);

  return (
    <div>
      {/* Header with Tabs & Mark All Read */}
      <div className="sticky top-0 bg-white dark:bg-card z-10 border-b border-gray-100 dark:border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex gap-4">
            {(['ALL', 'MATE', 'CHEER'] as TabType[]).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[16px] font-bold pb-2 border-b-2 transition-colors ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {tab === 'ALL' ? '전체' : tab === 'MATE' ? '메이트' : '응원석'}
              </button>
            ))}
          </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[16px] text-gray-400 hover:text-primary transition-colors"
              >
              <NotificationCheckCheckIcon className="w-3 h-3" />
              모두 읽음
            </button>
          )}
        </div>
      </div>

      <div className="p-0 min-h-[300px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 dark:bg-secondary p-6 rounded-full mb-4">
              <NotificationBellIcon className="w-8 h-8 text-gray-400 dark:text-gray-300" />
            </div>
            <p className="text-gray-900 dark:text-gray-100 font-bold mb-1">
              새로운 알림이 없습니다
            </p>
            <p className="text-[16px] text-gray-500 dark:text-gray-300">
              {activeTab === 'ALL' ? '새로운 소식이 도착하면 알려드릴게요!' : '해당 카테고리의 알림이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(groupedNotifications).map(([groupName, groupNotifs]) => (
              groupNotifs.length > 0 && (
                <div key={groupName}>
                <div className="px-4 py-2 bg-gray-50/50 dark:bg-card/50 text-[16px] font-bold text-gray-400 uppercase tracking-wider">
                    {groupName}
                  </div>
                  {groupNotifs.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative group p-4 cursor-pointer transition-colors duration-500 ${notification.isRead
                        ? 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                    >
                        <div className="flex gap-3 pr-6">
                          {/* Icon/Avatar Area */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${notification.isRead ? 'bg-gray-100 dark:bg-secondary' : 'bg-white dark:bg-card border-2 border-blue-100 dark:border-blue-900'
                              }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 truncate pr-2">
                                {notification.title}
                              </h4>
                                <span className="text-[16px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                {formatTime(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-[16px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                              {renderMessageWithBold(notification.message)}
                            </p>
                          </div>

                          {/* Read Indicator Dot */}
              {!notification.isRead && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />
              )}

                          {/* Delete Button (Hover Only on Desktop) */}
              <button
                type="button"
                onClick={(e) => handleDelete(notification.id, e)}
                className="absolute bottom-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="알림 삭제"
                          >
                            <NotificationTrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
