import type { NotificationData } from '../types/notification';
import apiClient from '../api/axios';
import { SERVER_BASE_URL } from '../constants/config';
import { isAxiosError } from 'axios';

const API_BASE_URL = apiClient.defaults.baseURL || '/api';
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

const toRequestHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return headers.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  return headers as Record<string, string>;
};

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
  const method = (options?.method || 'GET').toLowerCase() || 'get';
  const headers = toRequestHeaders(options?.headers);
  const requestUrl = baseUrl === API_BASE_URL ? endpoint : `${baseUrl}${endpoint}`;

  try {
    const response = await apiClient.request<T>({
      url: requestUrl,
      method,
      data: options?.body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: options?.signal ?? undefined,
    });

    return response.status === 204 ? ({} as T) : (response.data as unknown as T);
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      throw new NotificationApiError(
        `API Error: ${error.response.status}`,
        error.response.status,
        error.response.data as NotificationApiErrorData,
      );
    }
    throw error;
  }
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
