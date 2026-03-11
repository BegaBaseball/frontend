import { useEffect, useRef, useState } from 'react';
import { Party } from '../types/mate';
import { useMateStore } from '../store/mateStore';
import { api, getApiErrorStatus } from '../utils/api';
import { mapBackendPartyToFrontend } from '../utils/mate';

export interface MatePartyRouteState {
  party: Party | null;
  isLoading: boolean;
  isRevalidating: boolean;
  error: string | null;
  statusCode: number | null;
}

export function useMatePartyFromRoute(id?: string): MatePartyRouteState {
  const selectedParty = useMateStore((state) => state.selectedParty);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);

  const [fetchedParty, setFetchedParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const requestId = useRef(0);

  const setLoadingState = (nextLoading: boolean) => {
    setIsLoading((current) => (current === nextLoading ? current : nextLoading));
  };

  const setErrorState = (nextError: string | null) => {
    setError((current) => (current === nextError ? current : nextError));
  };

  const setRevalidatingState = (nextRevalidating: boolean) => {
    setIsRevalidating((current) => (current === nextRevalidating ? current : nextRevalidating));
  };

  useEffect(() => {
    const partyId = Number(id);
    const routePartyId = Number.isFinite(partyId) && Number.isInteger(partyId) ? partyId : null;
    const currentRequestId = ++requestId.current;
    const abortController = new AbortController();
    const hasMatchingSelectedParty = selectedParty?.id === routePartyId;

    if (!id) {
      setFetchedParty(null);
      setLoadingState(false);
      setRevalidatingState(false);
      setErrorState(null);
      setStatusCode(null);
      return;
    }

    if (routePartyId === null) {
      setFetchedParty(null);
      setLoadingState(false);
      setRevalidatingState(false);
      setErrorState('유효하지 않은 파티 ID입니다.');
      setStatusCode(null);
      return;
    }

    if (!hasMatchingSelectedParty) {
      setFetchedParty(null);
    }
    setLoadingState(!hasMatchingSelectedParty);
    setRevalidatingState(hasMatchingSelectedParty);
    setErrorState(null);
    setStatusCode(null);

    const fetchParty = async () => {
      try {
        const response = await api.getPartyById(routePartyId, {
          signal: abortController.signal,
          skipGlobalErrorHandler: true,
        });
        if (currentRequestId !== requestId.current) {
          return;
        }

        const mappedParty = mapBackendPartyToFrontend(response);
        setSelectedParty(mappedParty);
        setFetchedParty(mappedParty);
      } catch (error) {
        if (abortController.signal.aborted || currentRequestId !== requestId.current) {
          return;
        }

        const status = getApiErrorStatus(error);
        if (status === 404 || status === 403) {
          setFetchedParty(null);
          if (selectedParty?.id === routePartyId) {
            setSelectedParty(null);
          }
          setStatusCode(status);
          setErrorState(status === 404
            ? '삭제되었거나 존재하지 않는 파티입니다.'
            : '이 파티를 볼 권한이 없습니다.');
          return;
        }

        if (currentRequestId !== requestId.current) {
          return;
        }
        setStatusCode(status);
        if (!hasMatchingSelectedParty) {
          setErrorState('파티 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (abortController.signal.aborted || currentRequestId !== requestId.current) {
          return;
        }
        setLoadingState(false);
        setRevalidatingState(false);
      }
    };

    fetchParty();
    return () => {
      abortController.abort();
    };
  }, [id, setSelectedParty]);

  const routePartyId = id ? Number(id) : null;
  const routePartyIdIsValid = routePartyId !== null && Number.isFinite(routePartyId) && Number.isInteger(routePartyId);
  const party = selectedParty?.id === routePartyId && routePartyIdIsValid
    ? selectedParty
    : fetchedParty;

  return { party, isLoading, isRevalidating, error, statusCode };
}
