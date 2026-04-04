import type { NotificationData } from '../types/notification';
import { getApiBaseUrl } from '../api/apiBase';
import { getApiErrorStatus } from '../api/errorStatus';
import { privateDelete, privateGet, privatePost } from '../api/privateClient';
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
    this.name = 'NotificationApiError';
    this.status = status;
    this.data = data;
  }
}

let notificationUnreadCountEndpointAvailable = true;
let notificationListEndpointAvailable = true;
let notificationAuthFailure = false;

const isHttpErrorStatus = (error: unknown, statusCode: number): boolean =>
  typeof error === 'object'
  && error !== null
  && 'status' in error
  && Number((error as { status: number | string }).status) === statusCode;

const isBodyInitLike = (value: unknown): value is BodyInit =>
  typeof value === 'string'
  || value instanceof FormData
  || value instanceof URLSearchParams
  || value instanceof Blob
  || value instanceof ArrayBuffer
  || ArrayBuffer.isView(value);

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

const buildFallbackUrl = (endpoint: string): string => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${FALLBACK_API_BASE_URL}${normalizedEndpoint}`;
};

const fallbackRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const requestBody = options.body === undefined
    ? undefined
    : isBodyInitLike(options.body)
      ? options.body
      : JSON.stringify(options.body);
  const shouldSetJsonContentType = requestBody !== undefined && !(requestBody instanceof FormData);
  const response = await fetch(buildFallbackUrl(endpoint), {
    credentials: 'include',
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    body: requestBody,
    signal: options.signal,
  });
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const data = typeof responseBody === 'object' && responseBody !== null
      ? responseBody as NotificationApiErrorData
      : null;
    const message = data?.message || data?.error || response.statusText || `API Error: ${response.status}`;
    throw new NotificationApiError(message, response.status, data);
  }

  return responseBody as T;
};

const requestNotifications = (useFallback: boolean): Promise<NotificationData[]> =>
  useFallback
    ? fallbackRequest<NotificationData[]>('/notifications/my')
    : privateGet<NotificationData[]>('/notifications/my');

const requestUnreadCount = (useFallback: boolean): Promise<number> =>
  useFallback
    ? fallbackRequest<number>('/notifications/my/unread-count')
    : privateGet<number>('/notifications/my/unread-count');

export const isIgnorableNotificationError = (error: unknown): boolean => {
  const status = getApiErrorStatus(error);
  return status === null || status === 401 || status === 404;
};

export const resetNotificationApiStateForTests = (): void => {
  notificationUnreadCountEndpointAvailable = true;
  notificationListEndpointAvailable = true;
  notificationAuthFailure = false;
};

const getNotifications = async (): Promise<NotificationData[]> => {
  if (notificationAuthFailure || !notificationListEndpointAvailable) {
    return [];
  }

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

  const reduceUnreadCount = (notifications: NotificationData[]) =>
    notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);

  if (notificationUnreadCountEndpointAvailable) {
    try {
      return await requestUnreadCount(false);
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
          return await requestUnreadCount(true);
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
    const notifications = await requestNotifications(false);

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
        const fallbackNotifications = await requestNotifications(true);

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
  await privatePost<void>(`/notifications/${notificationId}/read`);
};

const deleteNotification = async (notificationId: number): Promise<void> => {
  await privateDelete<void>(`/notifications/${notificationId}`);
};

export const notificationApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
};
