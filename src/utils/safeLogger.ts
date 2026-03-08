interface ErrorLike {
  name?: string;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  stack?: unknown;
}

interface AxiosLikeError {
  isAxiosError?: boolean;
  message?: string;
  code?: string;
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, unknown>;
  };
  response?: {
    status?: number;
    data?: {
      code?: string;
      message?: unknown;
    };
  };
}

interface EventLike {
  type?: string;
  message?: string;
  code?: unknown;
  reason?: unknown;
  target?: unknown;
}

type LogValue = string | number | boolean | bigint | symbol | null | undefined | ErrorLike | AxiosLikeError | EventLike | object | unknown[] | Record<string, unknown>;

const REDACTED_FIELD_PATTERNS = [
  /authorization/i,
  /api[_-]?key/i,
  /token/i,
  /cookie/i,
  /set[-_]?cookie/i,
  /password/i,
  /secret/i,
  /session/i,
  /credential/i,
  /refresh/i,
  /access[_-]?token/i,
  /id[_-]?token/i,
  /x[_-]?api[_-]?key/i,
  /otp/i,
  /phone/i,
  /email/i,
  /birth/i,
  /jwt/i,
  /csrf/i,
  /state/i,
  /internal[_-]?token/i,
];

const MAX_RECURSION_DEPTH = 3;
const MAX_OBJECT_KEYS = 24;
const MAX_ARRAY_ITEMS = 20;

const SENSITIVE_STRING_ASSIGNMENT_PATTERN = /(?:^|[\s,;])((?:authorization|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|state|code|phone|email|password|secret|session|cookie|set[-_]?cookie|credential|csrf|jwt)\b\s*(?::|=)\s*["']?)([^&\s"'`]+)(?=\s|$|&|,|;)/gi;
const SENSITIVE_JSON_KEY_VALUE_PATTERN = /([\"']?)(authorization|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|state|code|phone|email|password|secret|session|cookie|set[-_]?cookie|credential|csrf|jwt)\1\s*:\s*(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`[^`]*`|[^,}\s]+)/gi;
const BEARER_TOKEN_PATTERN = /\bbearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const JWT_PATTERN = /\b(?:eyJ[a-zA-Z0-9._~+/-]*\.[a-zA-Z0-9._~+/-]+\.[a-zA-Z0-9._~+/-]+)\b/g;

const sanitizeSensitiveText = (value: string): string => {
  let sanitized = value.replace(SENSITIVE_STRING_ASSIGNMENT_PATTERN, '$1[REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_JSON_KEY_VALUE_PATTERN, '$1$2$1: [REDACTED]');
  sanitized = sanitized.replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(JWT_PATTERN, '[REDACTED_JWT]');
  return sanitized;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isAxiosLikeError = (value: unknown): value is AxiosLikeError => {
  return !!value && typeof value === 'object' && (value as AxiosLikeError).isAxiosError === true;
};

const isErrorLike = (value: unknown): value is ErrorLike => {
  return !!value && (value instanceof Error || (typeof value === 'object' && value !== null && 'message' in value && 'name' in value));
};

const isEventLike = (value: unknown): value is EventLike => {
  return !!value && typeof value === 'object' && ('type' in (value as EventLike) || 'message' in (value as EventLike));
};

const stripQueryString = (url: string): string => {
  const [base] = url.split(/[?#]/);
  return base;
};

const isLikelyUrlWithQuery = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const hasQuery = trimmed.includes('?');
  const urlLike = /^(?:https?:\/\/|wss?:\/\/|\/\/|mailto:|\/|\.{1,2}\/|www\.)/i.test(trimmed);
  const hasSensitiveQueryKey = /[?&](?:token|access[_-]?token|id[_-]?token|refresh[_-]?token|authorization|api[_-]?key|code|state)=/i.test(
    trimmed,
  );

  return hasQuery && (urlLike || hasSensitiveQueryKey);
};

const shouldRedactKey = (key: string): boolean => {
  return REDACTED_FIELD_PATTERNS.some((pattern) => pattern.test(key));
};

const sanitizeValue = (value: LogValue, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (isLikelyUrlWithQuery(value)) {
      return stripQueryString(value);
    }
    return sanitizeSensitiveText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint' || typeof value === 'symbol') {
    return value;
  }

  if (typeof value === 'function') {
    return `[Function:${value.name || 'anonymous'}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    const safeError: ErrorLike = {
      name: value.name || 'Error',
      message: value.message,
    };
    if (value.cause) {
      safeError.code = value.cause as unknown;
    }
    return safeError;
  }

  if (isAxiosLikeError(value)) {
    const safeUrl = typeof value.config?.url === 'string' ? stripQueryString(value.config.url) : value.config?.url;
    return {
      type: 'AxiosError',
      name: 'AxiosError',
      message: value.message,
      code: value.code,
      responseCode: value.response?.data?.code,
      status: value.response?.status,
      method: value.config?.method,
      url: safeUrl,
    };
  }

  if (isErrorLike(value)) {
    const safeError: ErrorLike = {
      name: value.name || 'Error',
      message: String(value.message ?? ''),
      code: value.code,
      status: value.status,
    };
    return safeError;
  }

  if (isEventLike(value)) {
    return {
      type: value.type || 'event',
      message: value.message,
      code: value.code,
      reason: value.reason,
    };
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_RECURSION_DEPTH) {
      return `[Array(${value.length})]`;
    }
    const sliced = value.slice(0, MAX_ARRAY_ITEMS);
    const mapped = sliced.map((item) => sanitizeValue(item as LogValue, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      mapped.push(`[+${value.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return mapped;
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }
    if (depth >= MAX_RECURSION_DEPTH) {
      return '[Object]';
    }

    seen.add(value as object);

    if (isPlainObject(value)) {
      const entries = Object.entries(value as Record<string, unknown>);
      const sanitized: Record<string, unknown> = {};
      const limitedEntries = entries.slice(0, MAX_OBJECT_KEYS);

      limitedEntries.forEach(([key, rawValue]) => {
        if (shouldRedactKey(key)) {
          sanitized[key] = '[REDACTED]';
          return;
        }
        if (key === 'url' || key === 'href') {
          if (typeof rawValue === 'string') {
            sanitized[key] = rawValue ? stripQueryString(rawValue) : rawValue;
          } else {
            sanitized[key] = sanitizeValue(rawValue, depth + 1, seen);
          }
          return;
        }
        sanitized[key] = sanitizeValue(rawValue, depth + 1, seen);
      });

      if (entries.length > MAX_OBJECT_KEYS) {
        sanitized.__truncated = `${entries.length - MAX_OBJECT_KEYS} more fields`;
      }
      return sanitized;
    }

    return value.constructor?.name ? `[${value.constructor.name}]` : '[Object]';
  }

  return String(value);
};

type ConsoleMethod = 'error' | 'warn' | 'info' | 'log' | 'debug';

type ConsoleMethodFn = (...args: unknown[]) => void;

interface ConsolePatchState {
  [key: string]: ConsoleMethodFn;
}

export const installSafeConsole = (): void => {
  if (typeof window === 'undefined' || !window.console) {
    return;
  }

  const safeWindow = window as Window & { __safeLoggerState?: ConsolePatchState; __safeLoggerPatched?: boolean };
  if (safeWindow.__safeLoggerPatched) {
    return;
  }

  const methods: ConsoleMethod[] = ['error', 'warn', 'info', 'log', 'debug'];
  const safeState = safeWindow.__safeLoggerState || ({} as ConsolePatchState);
  safeWindow.__safeLoggerState = safeState;
  const consoleObject = window.console as Record<ConsoleMethod, ConsoleMethodFn> & {
    [key: string]: ConsoleMethodFn | undefined;
  };

  methods.forEach((method) => {
    const original = consoleObject[method];
    if (typeof original !== 'function') {
      return;
    }
    safeState[method] = original;
    consoleObject[method] = (...args: unknown[]) => {
      const maskedArgs = args.map((arg) => sanitizeValue(arg as LogValue));
      original.apply(console, maskedArgs);
    };
  });

  safeWindow.__safeLoggerPatched = true;
};
