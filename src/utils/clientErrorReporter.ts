import type { ErrorSource } from '../types/error';
import { getApiBaseUrl } from '../api/apiBase';

const CLIENT_ERROR_ENDPOINT = `${getApiBaseUrl().replace(/\/$/, '')}/client-errors`;
const CLIENT_ERROR_FEEDBACK_ENDPOINT = `${CLIENT_ERROR_ENDPOINT}/feedback`;
const DUPLICATE_TTL_MS = 30_000;
const STACK_MAX_LENGTH = 4_000;
const MESSAGE_MAX_LENGTH = 1_000;
const ROUTE_MAX_LENGTH = 500;
const ENDPOINT_MAX_LENGTH = 500;
const SESSION_ID = createClientErrorEventId();

type AutomaticClientErrorPayload = {
  eventId: string;
  category: ErrorSource;
  message: string;
  statusCode: number | null;
  responseCode?: string;
  stack?: string;
  componentStack?: string;
  route: string;
  method?: string;
  endpoint?: string;
  timestamp: string;
  sessionId: string;
  userId: number | null;
};

type FeedbackPayload = {
  eventId: string;
  comment: string;
  actionTaken: string;
  route: string;
  timestamp: string;
};

type RuntimeErrorReportInput = {
  eventId?: string;
  error: unknown;
  source?: Exclude<ErrorSource, 'api'>;
  componentStack?: string;
  shouldReport?: boolean;
};

type ApiErrorReportInput = {
  eventId?: string;
  message: string;
  statusCode: number | null;
  responseCode?: string;
  method?: string;
  endpoint?: string;
  shouldReport?: boolean;
};

const recentlyReportedFingerprints = new Map<string, number>();

let currentUserId: number | null = null;

const isAutomaticReportingEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return import.meta.env.PROD || import.meta.env.VITE_CLIENT_ERROR_REPORTING_ENABLED === 'true';
};

const truncate = (value: string | undefined, maxLength: number): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
};

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeEndpoint = (value: string | undefined): string | undefined => {
  const endpoint = normalizeText(value);
  if (!endpoint) {
    return undefined;
  }

  if (typeof window === 'undefined') {
    return truncate(endpoint, ENDPOINT_MAX_LENGTH);
  }

  try {
    const parsed = new URL(endpoint, window.location.origin);
    return truncate(`${parsed.pathname}${parsed.search}`, ENDPOINT_MAX_LENGTH);
  } catch {
    return truncate(endpoint, ENDPOINT_MAX_LENGTH);
  }
};

const getCurrentRoute = (): string => {
  if (typeof window === 'undefined') {
    return '/';
  }

  return truncate(`${window.location.pathname}${window.location.search}${window.location.hash}`, ROUTE_MAX_LENGTH) || '/';
};

const buildFingerprint = (payload: AutomaticClientErrorPayload): string => {
  if (payload.category === 'runtime' || payload.category === 'unhandled_rejection') {
    return [
      payload.category,
      payload.message,
      payload.route,
    ].join('|');
  }

  return [
    payload.category,
    payload.message,
    payload.statusCode ?? '',
    payload.responseCode ?? '',
    payload.method ?? '',
    payload.endpoint ?? '',
    payload.route,
  ].join('|');
};

const purgeExpiredFingerprints = (now: number) => {
  recentlyReportedFingerprints.forEach((timestamp, fingerprint) => {
    if (now - timestamp > DUPLICATE_TTL_MS) {
      recentlyReportedFingerprints.delete(fingerprint);
    }
  });
};

const shouldReportFingerprint = (fingerprint: string): boolean => {
  const now = Date.now();
  purgeExpiredFingerprints(now);

  const previousTimestamp = recentlyReportedFingerprints.get(fingerprint);
  if (previousTimestamp && now - previousTimestamp <= DUPLICATE_TTL_MS) {
    return false;
  }

  recentlyReportedFingerprints.set(fingerprint, now);
  return true;
};

const sendPayload = async (url: string, payload: object, preferBeacon: boolean): Promise<boolean> => {
  const body = JSON.stringify(payload);

  if (
    preferBeacon
    && typeof navigator !== 'undefined'
    && typeof navigator.sendBeacon === 'function'
  ) {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) {
        return true;
      }
    } catch {
      // ignore and fallback to fetch
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body,
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
};

const normalizeUnknownError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: truncate(error.message || error.name || 'Unknown runtime error', MESSAGE_MAX_LENGTH) || 'Unknown runtime error',
      stack: truncate(normalizeText(error.stack), STACK_MAX_LENGTH),
    };
  }

  if (typeof error === 'string') {
    return {
      message: truncate(error, MESSAGE_MAX_LENGTH) || 'Unknown runtime error',
    };
  }

  try {
    return {
      message: truncate(JSON.stringify(error), MESSAGE_MAX_LENGTH) || 'Unknown runtime error',
    };
  } catch {
    return {
      message: 'Unknown runtime error',
    };
  }
};

const dispatchAutomaticReport = (payload: AutomaticClientErrorPayload, shouldReport = true) => {
  if (!shouldReport || !isAutomaticReportingEnabled()) {
    return;
  }

  const fingerprint = buildFingerprint(payload);
  if (!shouldReportFingerprint(fingerprint)) {
    return;
  }

  void sendPayload(CLIENT_ERROR_ENDPOINT, payload, true);
};

export function createClientErrorEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-error-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export const setClientErrorReporterUserContext = (context: { userId: number | null }) => {
  currentUserId = context.userId ?? null;
};

export const reportRuntimeError = ({
  eventId = createClientErrorEventId(),
  error,
  source = 'runtime',
  componentStack,
  shouldReport = true,
}: RuntimeErrorReportInput): string => {
  const normalizedError = normalizeUnknownError(error);
  const payload: AutomaticClientErrorPayload = {
    eventId,
    category: source,
    message: normalizedError.message,
    statusCode: null,
    stack: normalizedError.stack,
    componentStack: truncate(normalizeText(componentStack), STACK_MAX_LENGTH),
    route: getCurrentRoute(),
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    userId: currentUserId,
  };

  dispatchAutomaticReport(payload, shouldReport);
  return eventId;
};

export const reportApiError = ({
  eventId = createClientErrorEventId(),
  message,
  statusCode,
  responseCode,
  method,
  endpoint,
  shouldReport = true,
}: ApiErrorReportInput): string => {
  const payload: AutomaticClientErrorPayload = {
    eventId,
    category: 'api',
    message: truncate(message, MESSAGE_MAX_LENGTH) || 'API request failed',
    statusCode,
    responseCode: truncate(normalizeText(responseCode), 64),
    route: getCurrentRoute(),
    method: truncate(normalizeText(method)?.toUpperCase(), 16),
    endpoint: normalizeEndpoint(endpoint),
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    userId: currentUserId,
  };

  dispatchAutomaticReport(payload, shouldReport);
  return eventId;
};

export const installGlobalErrorListeners = (): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleError = (event: ErrorEvent) => {
    reportRuntimeError({
      error: event.error ?? event.message,
      source: 'runtime',
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportRuntimeError({
      error: event.reason,
      source: 'unhandled_rejection',
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

export const submitClientErrorFeedback = async ({
  eventId,
  comment,
  actionTaken,
}: {
  eventId: string;
  comment: string;
  actionTaken: string;
}): Promise<boolean> => {
  const trimmedComment = comment.trim();
  if (!eventId || !trimmedComment) {
    return false;
  }

  const payload: FeedbackPayload = {
    eventId,
    comment: truncate(trimmedComment, 2_000) || trimmedComment,
    actionTaken: truncate(actionTaken, 64) || 'user_feedback',
    route: getCurrentRoute(),
    timestamp: new Date().toISOString(),
  };

  try {
    return await sendPayload(CLIENT_ERROR_FEEDBACK_ENDPOINT, payload, false);
  } catch {
    return false;
  }
};
