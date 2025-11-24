import { create } from 'zustand';
import { NotificationData } from '../types/notification';

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  setNotifications: (notifications: NotificationData[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: NotificationData) => void; 
  markAsRead: (notificationId: number) => void;
  removeNotification: (notificationId: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => set({ notifications }),
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  // 새 알림 추가 (읽지 않은 개수도 자동 증가)
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  
  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  
  removeNotification: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.isRead;
      
      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        // ✅ 읽지 않은 알림을 삭제하면 unreadCount도 감소
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
}));
