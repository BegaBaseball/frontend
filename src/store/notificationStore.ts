import { create } from 'zustand';
import { NotificationData } from '../types/notification';

interface NotificationState {
  notifications: NotificationData[];
}

interface NotificationActions {
  setNotifications: (notifications: NotificationData[]) => void;
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: number) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const getInitialState = (): NotificationState => ({
  notifications: [],
});

export const useNotificationStore = create<NotificationStore>((set) => ({
  ...getInitialState(),

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    })),

  // 모든 알림 읽음 처리
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),

  reset: () => set(getInitialState()),
}));
