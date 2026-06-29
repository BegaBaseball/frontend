import { useEffect, useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading';

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

const getDefaultDuration = (variant: ToastVariant) => {
  if (variant === 'loading') {
    return Number.POSITIVE_INFINITY;
  }

  return variant === 'error' ? 5000 : 3600;
};

const pushToast = (variant: ToastVariant, title: ReactNode, options?: ToastOptions) => {
  const id = String(options?.id ?? createToastId());
  const duration = options?.duration ?? getDefaultDuration(variant);
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
  loading: (title: ReactNode, options?: ToastOptions) => string;
  dismiss: (id?: string | number) => void;
};

export const toast = Object.assign(
  (title: ReactNode, options?: ToastOptions) => pushToast('default', title, options),
  {
    success: (title: ReactNode, options?: ToastOptions) => pushToast('success', title, options),
    error: (title: ReactNode, options?: ToastOptions) => pushToast('error', title, options),
    info: (title: ReactNode, options?: ToastOptions) => pushToast('info', title, options),
    warning: (title: ReactNode, options?: ToastOptions) => pushToast('warning', title, options),
    loading: (title: ReactNode, options?: ToastOptions) => pushToast('loading', title, {
      duration: Number.POSITIVE_INFINITY,
      ...options,
    }),
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

const variantTokenMap: Record<ToastVariant, { rail: string; tint: string; darkRail: string; darkTint: string }> = {
  default: { rail: '#475569', tint: '#f1f5f9', darkRail: '#94a3b8', darkTint: 'rgba(71,85,105,.18)' },
  success: { rail: '#15803d', tint: '#ecfdf5', darkRail: '#4ade80', darkTint: 'rgba(21,128,61,.18)' },
  error:   { rail: '#b91c1c', tint: '#fef2f2', darkRail: '#f87171', darkTint: 'rgba(185,28,28,.18)' },
  info:    { rail: '#2d5f4f', tint: '#eef6f3', darkRail: '#6ee7b7', darkTint: 'rgba(45,95,79,.18)' },
  warning: { rail: '#a16207', tint: '#fefce8', darkRail: '#fbbf24', darkTint: 'rgba(161,98,7,.18)' },
  loading: { rail: '#047857', tint: '#ecfdf5', darkRail: '#6ee7b7', darkTint: 'rgba(4,120,87,.20)' },
};

const variantIconMap: Record<ToastVariant, string> = {
  default: '<circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  success: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  error:   '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  info:    '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  loading: '<path d="M21 12a9 9 0 1 1-9-9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
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

    const timers = toasts
      .filter((entry) => {
        const shouldAutoDismiss = Number.isFinite(entry.duration) && entry.duration > 0;
        return shouldAutoDismiss;
      })
      .map((entry) => window.setTimeout(() => {
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
        const isDark = resolvedTheme === 'dark';
        const tokens = variantTokenMap[entry.variant];
        const rail = isDark ? tokens.darkRail : tokens.rail;
        const tint = isDark ? tokens.darkTint : tokens.tint;
        const iconSvg = variantIconMap[entry.variant];
        const durationSec = entry.duration / 1000;
        const isLoading = entry.variant === 'loading';
        const shouldShowProgress = Number.isFinite(entry.duration) && entry.duration > 0;

        return (
          <div
            key={entry.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              width: '100%',
              position: 'relative',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              backgroundColor: isDark ? '#1a2a26' : '#fff',
              color: isDark ? '#e4f0ec' : '#111827',
              boxShadow: '0 10px 28px -14px rgba(16,37,32,.22), 0 2px 6px rgba(0,0,0,.04)',
              overflow: 'hidden',
              fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 42px 14px 14px' }}>
              {/* Icon chip */}
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: tint,
                  color: rail,
                  boxShadow: `0 0 0 3px ${rail}2e`,
                  animation: isLoading ? 'toast-spin 900ms linear infinite' : undefined,
                }}
                dangerouslySetInnerHTML={{
                  __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">${iconSvg}</svg>`,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>
                  {entry.title}
                </div>
                {entry.description ? (
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: isDark ? '#8db4a8' : '#6b7280' }}>
                    {entry.description}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => dismissToast(entry.id)}
              aria-label="알림 닫기"
              style={{
                position: 'absolute',
                top: 9,
                right: 9,
                width: 22,
                height: 22,
                borderRadius: 6,
                border: 0,
                background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
                color: isDark ? '#8db4a8' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {shouldShowProgress ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: rail,
                  opacity: 0.5,
                  transformOrigin: 'left',
                  animation: `toast-countdown ${durationSec}s linear forwards`,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
