import { create } from 'zustand';
import { NotificationData } from '../types/notification';

interface NotificationState {
  notifications: NotificationData[];
  locallyReadIds: Set<number>;
  locallyDeletedIds: Set<number>;
  locallyReadThrough: number | null;
}

interface NotificationActions {
  setNotifications: (notifications: NotificationData[]) => void;
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: (readThrough?: number) => void;
  removeNotification: (notificationId: number) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const getInitialState = (): NotificationState => ({
  notifications: [],
  locallyReadIds: new Set<number>(),
  locallyDeletedIds: new Set<number>(),
  locallyReadThrough: null,
});

const deduplicateNotifications = (notifications: NotificationData[]) => {
  const seenIds = new Set<number>();

  return notifications.filter((notification) => {
    if (seenIds.has(notification.id)) {
      return false;
    }

    seenIds.add(notification.id);
    return true;
  });
};

const wasCreatedBy = (notification: NotificationData, timestamp: number | null) => {
  if (timestamp == null) {
    return false;
  }

  const createdAt = Date.parse(notification.createdAt);
  return Number.isFinite(createdAt) && createdAt <= timestamp;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  ...getInitialState(),

  setNotifications: (notifications) =>
    set((state) => {
      const existingById = new Map(
        state.notifications.map((notification) => [notification.id, notification]),
      );
      const locallyReadIds = new Set(state.locallyReadIds);
      const nextNotifications = deduplicateNotifications(notifications)
        .filter((notification) => !state.locallyDeletedIds.has(notification.id))
        .map((notification) => {
          const shouldRemainRead = notification.isRead
            || existingById.get(notification.id)?.isRead
            || locallyReadIds.has(notification.id)
            || wasCreatedBy(notification, state.locallyReadThrough);

          if (shouldRemainRead) {
            locallyReadIds.add(notification.id);
          }

          return shouldRemainRead && !notification.isRead
            ? { ...notification, isRead: true }
            : notification;
        });

      return {
        notifications: nextNotifications,
        locallyReadIds,
      };
    }),

  addNotification: (notification) =>
    set((state) => {
      if (state.locallyDeletedIds.has(notification.id)) {
        return {};
      }

      const existing = state.notifications.find((item) => item.id === notification.id);
      const shouldRemainRead = notification.isRead
        || existing?.isRead
        || state.locallyReadIds.has(notification.id)
        || wasCreatedBy(notification, state.locallyReadThrough);
      const nextNotification = shouldRemainRead && !notification.isRead
        ? { ...notification, isRead: true }
        : notification;
      const locallyReadIds = new Set(state.locallyReadIds);
      if (shouldRemainRead) {
        locallyReadIds.add(notification.id);
      }

      return {
        notifications: [
          nextNotification,
          ...state.notifications.filter((item) => item.id !== notification.id),
        ],
        locallyReadIds,
      };
    }),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      locallyReadIds: new Set(state.locallyReadIds).add(notificationId),
    })),

  // 모든 알림 읽음 처리
  markAllAsRead: (readThrough = Date.now()) =>
    set((state) => {
      const locallyReadIds = new Set(state.locallyReadIds);
      state.notifications.forEach((notification) => locallyReadIds.add(notification.id));

      return {
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        locallyReadIds,
        locallyReadThrough: readThrough,
      };
    }),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      locallyDeletedIds: new Set(state.locallyDeletedIds).add(notificationId),
    })),

  reset: () => set(getInitialState()),
}));
