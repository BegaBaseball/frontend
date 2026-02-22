import type { NotificationData } from '../types/notification';
import { getApiBaseUrl } from '../api/apiBase';
import { SERVER_BASE_URL } from '../constants/config';

const API_BASE_URL = getApiBaseUrl();
const FALLBACK_API_BASE_URL = `${SERVER_BASE_URL.replace(/\/$/, '')}/api`;

type NotificationApiErrorData = {
  message?: string;
  error?: string;
  timestamp?: string;
  code?: string;
} | null;

class NotificationApiError extends Error {
  status: number;
  data: NotificationApiErrorData;

  constructor(message: string, status: number, data: NotificationApiErrorData = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let notificationUnreadCountEndpointAvailable = true;
let notificationListEndpointAvailable = true;
let notificationAuthFailure = false;

const isHttpErrorStatus = (error: unknown, statusCode: number): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  Number((error as { status: number | string }).status) === statusCode;

const getApiErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null;
  }

  const status = Number((error as { status: number | string }).status);
  return Number.isNaN(status) ? null : status;
};

export const isIgnorableNotificationError = (error: unknown): boolean => {
  const status = getApiErrorStatus(error);
  return status === null || status === 401 || status === 404;
};

const request = async <T = unknown>(endpoint: string, options?: RequestInit, baseUrl = API_BASE_URL): Promise<T> => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const apiError = new NotificationApiError(`API Error: ${response.status}`, response.status);
    try {
      apiError.data = await response.json();
    } catch {
      apiError.data = null;
    }
    throw apiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return {} as T;
};

const getNotifications = async (): Promise<NotificationData[]> => {
  if (notificationAuthFailure) {
    return [];
  }

  if (!notificationListEndpointAvailable) {
    return [];
  }

  const requestNotifications = (useFallback: boolean): Promise<NotificationData[]> =>
    request<NotificationData[]>('/notifications/my', undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

  try {
    return await requestNotifications(false);
  } catch (error) {
    if (isHttpErrorStatus(error, 401)) {
      notificationAuthFailure = true;
      return [];
    }

    if (isHttpErrorStatus(error, 404) && API_BASE_URL === '/api') {
      try {
        return await requestNotifications(true);
      } catch (fallbackError) {
        if (isHttpErrorStatus(fallbackError, 401)) {
          notificationAuthFailure = true;
          return [];
        }
        if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
          notificationListEndpointAvailable = false;
          return [];
        }
        throw fallbackError;
      }
    }

    if (isHttpErrorStatus(error, 404) || getApiErrorStatus(error) === null) {
      notificationListEndpointAvailable = false;
      return [];
    }

    throw error;
  }
};

const getUnreadCount = async (): Promise<number> => {
  if (notificationAuthFailure) {
    return 0;
  }

  if (!notificationUnreadCountEndpointAvailable && !notificationListEndpointAvailable) {
    return 0;
  }

  const getUnreadCountFromPath = (path: string, useFallback = false): Promise<number> =>
    request<number>(path, undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

  const getNotificationsFromPath = (path: string, useFallback = false): Promise<NotificationData[]> =>
    request<NotificationData[]>(path, undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

  const reduceUnreadCount = (notifications: NotificationData[]) =>
    notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);

  if (notificationUnreadCountEndpointAvailable) {
    try {
      return await getUnreadCountFromPath('/notifications/my/unread-count');
    } catch (error) {
      if (isHttpErrorStatus(error, 401)) {
        notificationAuthFailure = true;
        notificationUnreadCountEndpointAvailable = false;
        return 0;
      }
      if (getApiErrorStatus(error) === null) {
        notificationUnreadCountEndpointAvailable = false;
        return 0;
      }

      if (!isHttpErrorStatus(error, 404)) {
        throw error;
      }

      notificationUnreadCountEndpointAvailable = false;
      if (API_BASE_URL === '/api') {
        try {
          return await getUnreadCountFromPath('/notifications/my/unread-count', true);
        } catch (fallbackError) {
          if (isHttpErrorStatus(fallbackError, 401)) {
            notificationAuthFailure = true;
            return 0;
          }
          if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
            notificationUnreadCountEndpointAvailable = false;
            return 0;
          }
          throw fallbackError;
        }
      }
    }
  }

  if (!notificationListEndpointAvailable) {
    return 0;
  }

  try {
    const notifications = await request<NotificationData[]>('/notifications/my');

    if (!Array.isArray(notifications)) {
      return 0;
    }

    return reduceUnreadCount(notifications);
  } catch (error) {
    if (isHttpErrorStatus(error, 401)) {
      notificationAuthFailure = true;
      return 0;
    }
    if (isHttpErrorStatus(error, 404) && API_BASE_URL === '/api' && FALLBACK_API_BASE_URL !== '/api') {
      try {
        const fallbackNotifications = await getNotificationsFromPath('/notifications/my', true);
        if (!Array.isArray(fallbackNotifications)) {
          return 0;
        }
        return reduceUnreadCount(fallbackNotifications);
      } catch (fallbackError) {
        if (isHttpErrorStatus(fallbackError, 401)) {
          notificationAuthFailure = true;
          return 0;
        }

        if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
          notificationListEndpointAvailable = false;
          return 0;
        }
        throw fallbackError;
      }
    }
    if (isHttpErrorStatus(error, 404) || getApiErrorStatus(error) === null) {
      if (!notificationAuthFailure) {
        notificationListEndpointAvailable = false;
      }
      return 0;
    }
    throw error;
  }
};

const markAsRead = async (notificationId: number): Promise<void> => {
  await request(`/notifications/${notificationId}/read`, {
    method: 'POST',
  });
};

const deleteNotification = async (notificationId: number): Promise<void> => {
  await request(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
};

export const notificationApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
};
