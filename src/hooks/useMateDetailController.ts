import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { isPartyHostedByUser, normalizeMateListReturnTo } from '../utils/mate';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyMyApplicationQueryOptions,
} from './mateQueryOptions';
import { useMatePartyFromRoute } from './useMatePartyFromRoute';

interface UseMateDetailControllerParams {
  id?: string;
  variant?: 'page' | 'panel';
  onClose?: () => void;
}

export function useMateDetailController({
  id: idProp,
  variant = 'page',
  onClose,
}: UseMateDetailControllerParams = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id: string }>();
  const id = idProp ?? routeId;
  const isPanel = variant === 'panel';
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false);
  const missingPartyRedirectRef = useRef<string | null>(null);
  const returnTo = useMemo(() => {
    if (!location.state || typeof location.state !== 'object') return '/mate';
    return normalizeMateListReturnTo((location.state as { returnTo?: unknown }).returnTo);
  }, [location.state]);

  const handleClose = useCallback(() => {
    if (isPanel && onClose) {
      onClose();
      return;
    }
    navigate(returnTo);
  }, [isPanel, navigate, onClose, returnTo]);

  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
    statusCode: partyStatusCode,
  } = useMatePartyFromRoute(id);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const currentUserHandle = currentUser?.handle;
  const partyId = party?.id;
  const isHost = isPartyHostedByUser(party, { id: currentUserId, handle: currentUserHandle });

  const myApplicationQuery = useQuery({
    ...(partyId != null
      ? getMatePartyMyApplicationQueryOptions(partyId, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: Boolean(partyId && currentUserId && !isHost),
  });
  const hostApplicationsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(partyId && isHost),
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (partyStatusCode !== 404 || !id || party) {
      missingPartyRedirectRef.current = null;
      return;
    }
    if (missingPartyRedirectRef.current === id) {
      return;
    }

    missingPartyRedirectRef.current = id;
    toast.info('존재하지 않는 파티입니다. 목록으로 이동합니다.');
    const redirectTimer = window.setTimeout(() => {
      handleClose();
    }, 1600);

    return () => window.clearTimeout(redirectTimer);
  }, [handleClose, id, partyStatusCode, party]);

  useEffect(() => {
    setShowQrPanel(false);
    setShowSeatViewGuide(false);
  }, [partyId]);

  const myApplication = myApplicationQuery.data ?? null;
  const hostApplications = hostApplicationsQuery.data ?? [];
  const isApproved = myApplication?.isApproved || false;
  const canAccessCheckIn = Boolean(party) &&
    (isHost || isApproved) &&
    party?.status !== 'CHECKED_IN' &&
    party?.status !== 'COMPLETED' &&
    party?.status !== 'FAILED';

  const fallbackCheckInUrl = useMemo(() => {
    if (!id && !party?.id) {
      return typeof window === 'undefined' ? '/mate' : window.location.href;
    }
    const path = `/mate/${id ?? party?.id}/checkin`;
    if (typeof window === 'undefined') {
      return path;
    }
    return new URL(path, window.location.origin).toString();
  }, [id, party?.id]);

  const handleApply = useCallback(() => navigate(`/mate/${id}/apply`), [id, navigate]);
  const handleBrowsePartyList = handleClose;
  const handleCheckIn = useCallback((targetUrl?: string) => {
    const fallbackPath = `/mate/${id}/checkin`;
    try {
      const parsedUrl = new URL(targetUrl || fallbackCheckInUrl || fallbackPath, window.location.origin);
      navigate(`${parsedUrl.pathname}${parsedUrl.search}`);
      return;
    } catch (error) {
      console.error('체크인 URL 파싱 실패:', error);
    }

    navigate(fallbackPath);
  }, [fallbackCheckInUrl, id, navigate]);
  const handleManageParty = useCallback(() => navigate(`/mate/${id}/manage`), [id, navigate]);
  const handleOpenChat = useCallback(() => navigate(`/mate/${id}/chat`), [id, navigate]);

  return {
    canAccessCheckIn,
    currentUserHandle,
    currentUserId,
    fallbackCheckInUrl,
    handleApply,
    handleBrowsePartyList,
    handleCheckIn,
    handleClose,
    handleManageParty,
    handleOpenChat,
    hostApplications,
    hostApplicationsQuery,
    id,
    isApproved,
    isHost,
    isPanel,
    isPartyLoading,
    isPartyRevalidating,
    myApplication,
    myApplicationQuery,
    party,
    partyError,
    partyId,
    partyStatusCode,
    setShowQrPanel,
    setShowSeatViewGuide,
    showQrPanel,
    showSeatViewGuide,
  };
}

export type UseMateDetailControllerReturn = ReturnType<typeof useMateDetailController>;
