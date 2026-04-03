import { useEffect, useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string | number;
  description?: ReactNode;
  duration?: number;
}

export interface ToasterProps {
  className?: string;
  style?: CSSProperties;
  theme?: 'light' | 'dark' | 'system';
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

interface ToastRecord extends Required<Pick<ToastOptions, 'duration'>> {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  variant: ToastVariant;
  createdAt: number;
}

const listeners = new Set<() => void>();
let toastState: ToastRecord[] = [];

const notify = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => toastState;

const createToastId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const dismissToast = (id?: string | number) => {
  if (id == null) {
    if (toastState.length === 0) {
      return;
    }
    toastState = [];
    notify();
    return;
  }

  const next = toastState.filter((toast) => toast.id !== String(id));
  if (next.length === toastState.length) {
    return;
  }
  toastState = next;
  notify();
};

const pushToast = (variant: ToastVariant, title: ReactNode, options?: ToastOptions) => {
  const id = String(options?.id ?? createToastId());
  const duration = options?.duration ?? (variant === 'error' ? 5000 : 3600);
  const nextToast: ToastRecord = {
    id,
    title,
    description: options?.description,
    duration,
    variant,
    createdAt: Date.now(),
  };

  toastState = [...toastState.filter((toast) => toast.id !== id), nextToast].slice(-4);
  notify();
  return id;
};

type ToastFn = ((title: ReactNode, options?: ToastOptions) => string) & {
  success: (title: ReactNode, options?: ToastOptions) => string;
  error: (title: ReactNode, options?: ToastOptions) => string;
  info: (title: ReactNode, options?: ToastOptions) => string;
  warning: (title: ReactNode, options?: ToastOptions) => string;
  dismiss: (id?: string | number) => void;
};

export const toast = Object.assign(
  (title: ReactNode, options?: ToastOptions) => pushToast('default', title, options),
  {
    success: (title: ReactNode, options?: ToastOptions) => pushToast('success', title, options),
    error: (title: ReactNode, options?: ToastOptions) => pushToast('error', title, options),
    info: (title: ReactNode, options?: ToastOptions) => pushToast('info', title, options),
    warning: (title: ReactNode, options?: ToastOptions) => pushToast('warning', title, options),
    dismiss: dismissToast,
  },
) as ToastFn;

const positionStyleMap: Record<NonNullable<ToasterProps['position']>, CSSProperties> = {
  'top-left': { top: 16, left: 16, alignItems: 'flex-start' },
  'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
  'top-right': { top: 16, right: 16, alignItems: 'flex-end' },
  'bottom-left': { bottom: 16, left: 16, alignItems: 'flex-start' },
  'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
  'bottom-right': { bottom: 16, right: 16, alignItems: 'flex-end' },
};

const variantAccentMap: Record<ToastVariant, string> = {
  default: '#475569',
  success: '#16a34a',
  error: '#dc2626',
  info: '#2563eb',
  warning: '#d97706',
};

const useToastState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export function Toaster({
  className,
  style,
  theme = 'system',
  position = 'bottom-right',
}: ToasterProps) {
  const toasts = useToastState();
  const resolvedTheme = theme === 'system'
    ? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    : theme;

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((entry) => window.setTimeout(() => {
      dismissToast(entry.id);
    }, entry.duration));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const containerStyle = useMemo<CSSProperties>(() => ({
    position: 'fixed',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    pointerEvents: 'none',
    maxWidth: 'min(420px, calc(100vw - 24px))',
    width: '100%',
    ...positionStyleMap[position],
    ...style,
  }), [position, style]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={className} style={containerStyle} aria-live="polite" aria-atomic="true">
      {toasts.map((entry) => {
        const accent = variantAccentMap[entry.variant];
        const isDark = resolvedTheme === 'dark';
        return (
          <div
            key={entry.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              width: '100%',
              borderRadius: 16,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'}`,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255,255,255,0.96)',
              color: isDark ? '#f8fafc' : '#0f172a',
              boxShadow: isDark
                ? '0 12px 36px rgba(2, 6, 23, 0.45)'
                : '0 12px 36px rgba(15, 23, 42, 0.16)',
              backdropFilter: 'blur(12px)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  minWidth: 10,
                  height: 10,
                  marginTop: 6,
                  borderRadius: 999,
                  backgroundColor: accent,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>
                  {entry.title}
                </div>
                {entry.description ? (
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {entry.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(entry.id)}
                aria-label="알림 닫기"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 3,
                background: accent,
                opacity: 0.9,
              }}
            />
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
