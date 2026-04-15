import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCheckInQrSession } from '../api/mate';
import { QR_REFRESH_LEAD_MS, resolveQrRefreshDelayMs } from '../utils/qrRefresh';
import MateDetailQrPanel from './MateDetailQrPanel';

interface MateDetailQrRuntimeProps {
  partyId: number;
  fallbackCheckInUrl: string;
  canAccessCheckIn: boolean;
  onClose: () => void;
  onOpenCheckInPage: (targetUrl?: string) => void;
}

const TECHNICAL_ERROR_PATTERNS = [
  /request failed with status code \d+/i,
  /^network error$/i,
  /^api error:/i,
  /timeout of \d+ms exceeded/i,
  /failed to fetch/i,
];

const resolveMateDetailErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const data = 'data' in error ? (error as { data?: { message?: string; error?: string } | null }).data : null;
    const serverMessage = typeof data?.message === 'string'
      ? data.message.trim()
      : typeof data?.error === 'string'
        ? data.error.trim()
        : '';

    if (serverMessage && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(serverMessage))) {
      return serverMessage;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return message;
    }
  }

  return fallback;
};

export default function MateDetailQrRuntime({
  partyId,
  fallbackCheckInUrl,
  canAccessCheckIn,
  onClose,
  onOpenCheckInPage,
}: MateDetailQrRuntimeProps) {
  const [qrCheckInUrl, setQrCheckInUrl] = useState(fallbackCheckInUrl);
  const [qrSessionExpiresAt, setQrSessionExpiresAt] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrSessionError, setQrSessionError] = useState<string | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => (
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  ));
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCheckInUrlRef = useRef(fallbackCheckInUrl);
  const qrSessionExpiresAtRef = useRef<string | null>(null);
  const fetchQrSessionRef = useRef<((isMountedRef: { current: boolean }, force?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const scheduleNextQrRefresh = useCallback((
    isMountedRef: { current: boolean },
    expiresAt: string | null,
  ) => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!isMountedRef.current || !isDocumentVisible || !canAccessCheckIn) {
      return;
    }

    const delay = resolveQrRefreshDelayMs(expiresAt, Date.now());
    refreshTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current || typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void fetchQrSessionRef.current?.(isMountedRef, true);
    }, delay);
  }, [canAccessCheckIn, isDocumentVisible]);

  const fetchQrSession = useCallback(async (
    isMountedRef: { current: boolean },
    force: boolean = false,
  ) => {
    if (!canAccessCheckIn || !isDocumentVisible) return;
    const currentQrCheckInUrl = qrCheckInUrlRef.current;
    const currentQrSessionExpiresAt = qrSessionExpiresAtRef.current;
    if (!force && currentQrCheckInUrl && currentQrSessionExpiresAt) {
      const parsedExpiresAtMs = Date.parse(currentQrSessionExpiresAt);
      if (!Number.isNaN(parsedExpiresAtMs) && parsedExpiresAtMs - Date.now() > QR_REFRESH_LEAD_MS) {
        scheduleNextQrRefresh(isMountedRef, currentQrSessionExpiresAt);
        return;
      }
    }
    setIsQrLoading(true);
    try {
      const qrSession = await createCheckInQrSession({ partyId });
      if (!isMountedRef.current) return;

      const nextQrCheckInUrl = qrSession.checkinUrl || fallbackCheckInUrl;
      qrCheckInUrlRef.current = nextQrCheckInUrl;
      setQrCheckInUrl(nextQrCheckInUrl);
      setManualCode(qrSession.manualCode ?? null);
      setQrSessionError(null);
      const expiresAt = qrSession.expiresAt ?? null;
      const parsedExpiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
      const isValidExpiresAt = expiresAt ? !Number.isNaN(parsedExpiresAtMs) : false;
      const nextQrSessionExpiresAt = isValidExpiresAt ? expiresAt : null;
      qrSessionExpiresAtRef.current = nextQrSessionExpiresAt;
      setQrSessionExpiresAt(nextQrSessionExpiresAt);
      scheduleNextQrRefresh(isMountedRef, nextQrSessionExpiresAt);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      console.error('QR 세션 발급 실패:', error);
      qrCheckInUrlRef.current = fallbackCheckInUrl;
      setQrCheckInUrl(fallbackCheckInUrl);
      setManualCode(null);
      qrSessionExpiresAtRef.current = null;
      setQrSessionError(resolveMateDetailErrorMessage(error, 'QR 세션을 발급하지 못했습니다.'));
    } finally {
      if (isMountedRef.current) {
        setIsQrLoading(false);
      }
    }
  }, [
    canAccessCheckIn,
    fallbackCheckInUrl,
    isDocumentVisible,
    partyId,
    scheduleNextQrRefresh,
  ]);

  useEffect(() => {
    fetchQrSessionRef.current = fetchQrSession;
  }, [fetchQrSession]);

  useEffect(() => {
    const isMountedRef = { current: true };

    qrCheckInUrlRef.current = fallbackCheckInUrl;
    setQrCheckInUrl(fallbackCheckInUrl);
    setManualCode(null);
    qrSessionExpiresAtRef.current = null;
    setQrSessionExpiresAt(null);
    setQrSessionError(null);

    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!canAccessCheckIn || !isDocumentVisible) {
      setIsQrLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }

    void fetchQrSession(isMountedRef);

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [canAccessCheckIn, fallbackCheckInUrl, fetchQrSession, isDocumentVisible]);

  const qrCodeValue = useMemo(
    () => qrCheckInUrl || fallbackCheckInUrl,
    [qrCheckInUrl, fallbackCheckInUrl],
  );

  return (
    <MateDetailQrPanel
      open
      qrCodeValue={qrCodeValue}
      isQrLoading={isQrLoading}
      qrSessionExpiresAt={qrSessionExpiresAt}
      qrSessionError={qrSessionError}
      onClose={onClose}
      manualCode={manualCode}
      onOpenCheckInPage={() => onOpenCheckInPage(qrCodeValue)}
    />
  );
}
