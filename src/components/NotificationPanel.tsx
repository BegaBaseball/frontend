import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Bell, MessageCircle, MessageSquare, Heart, UserPlus, FileText, Repeat2, Trash2, CheckCheck, Clock, Calendar, AlertTriangle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';
import { NotificationData as Notification, NotificationType } from '../types/notification';

type TabType = 'ALL' | 'MATE' | 'CHEER';

export default function NotificationPanel() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { notifications, unreadCount, setNotifications, setUnreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const userIdResponse = await api.getUserIdByEmail(user.email);
        const id = userIdResponse.data;

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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, setNotifications, setUnreadCount]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await api.markAsRead(notification.id);
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

  const handleMarkAllRead = async () => {
    try {
      // Backend bulk read endpoint is missing, so we loop through unread notifications
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await Promise.all(unreadIds.map(id => api.markAsRead(id)));
      markAllAsRead();
    } catch (error) {
      console.error('일괄 읽음 처리 오류:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPLICATION_RECEIVED': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'APPLICATION_APPROVED': return <Check className="w-5 h-5 text-green-500" />;
      case 'APPLICATION_REJECTED': return <X className="w-5 h-5 text-red-500" />;
      case 'PARTY_EXPIRED': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'PARTY_AUTO_COMPLETED': return <Check className="w-5 h-5 text-gray-500" />;
      case 'GAME_TOMORROW_REMINDER': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'GAME_DAY_REMINDER': return <Calendar className="w-5 h-5 text-green-500" />;
      case 'HOST_RESPONSE_NUDGE': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'REVIEW_REQUEST': return <Star className="w-5 h-5 text-yellow-500" />;
      case 'POST_COMMENT': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'COMMENT_REPLY': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'POST_LIKE': return <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'POST_REPOST': return <Repeat2 className="w-5 h-5 text-emerald-500" />;
      case 'NEW_FOLLOWER': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'FOLLOWING_NEW_POST': return <FileText className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
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
      <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex gap-4">
            {(['ALL', 'MATE', 'CHEER'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors ${activeTab === tab
                  ? 'border-[#2d5f4f] dark:border-[#4ade80] text-[#2d5f4f] dark:text-[#4ade80]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {tab === 'ALL' ? '전체' : tab === 'MATE' ? '메이트' : '응원석'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#2d5f4f] dark:hover:text-[#4ade80] transition-colors"
            >
              <CheckCheck className="w-3 h-3" />
              모두 읽음
            </button>
          )}
        </div>
      </div>

      <div className="p-0 min-h-[300px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
              <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-900 dark:text-gray-100 font-bold mb-1">
              새로운 알림이 없습니다
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeTab === 'ALL' ? '새로운 소식이 도착하면 알려드릴게요!' : '해당 카테고리의 알림이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <AnimatePresence initial={false}>
              {Object.entries(groupedNotifications).map(([groupName, groupNotifs]) => (
                groupNotifs.length > 0 && (
                  <div key={groupName}>
                    <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {groupName}
                    </div>
                    {groupNotifs.map((notification) => (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative group p-4 cursor-pointer transition-colors duration-500 ${notification.isRead
                          ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                      >
                        <div className="flex gap-3 pr-6">
                          {/* Icon/Avatar Area */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${notification.isRead ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 ring-2 ring-blue-100 dark:ring-blue-900'
                              }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate pr-2">
                                {notification.title}
                              </h4>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                {formatTime(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {renderMessageWithBold(notification.message)}
                            </p>
                          </div>

                          {/* Read Indicator Dot */}
                          {!notification.isRead && (
                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-800" />
                          )}

                          {/* Delete Button (Hover Only on Desktop) */}
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="absolute bottom-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="알림 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}