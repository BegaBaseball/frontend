import { useEffect, useRef, useState } from 'react';
import { Party } from '../types/mate';
import { useMateStore } from '../store/mateStore';
import { api } from '../utils/api';
import { mapBackendPartyToFrontend } from '../utils/mate';

export interface MatePartyRouteState {
  party: Party | null;
  isLoading: boolean;
  error: string | null;
}

export function useMatePartyFromRoute(id?: string): MatePartyRouteState {
  const selectedParty = useMateStore((state) => state.selectedParty);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);

  const [fetchedParty, setFetchedParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const setLoadingState = (nextLoading: boolean) => {
    setIsLoading((current) => (current === nextLoading ? current : nextLoading));
  };

  const setErrorState = (nextError: string | null) => {
    setError((current) => (current === nextError ? current : nextError));
  };

  useEffect(() => {
    const partyId = Number(id);
    const routePartyId = Number.isFinite(partyId) && Number.isInteger(partyId) ? partyId : null;
    const currentRequestId = ++requestId.current;

    if (!id) {
      setFetchedParty(null);
      setLoadingState(false);
      setErrorState(null);
      return;
    }

    if (routePartyId === null) {
      setFetchedParty(null);
      setLoadingState(false);
      setErrorState('유효하지 않은 파티 ID입니다.');
      return;
    }

    if (selectedParty?.id === routePartyId) {
      setFetchedParty(null);
      setLoadingState(false);
      setErrorState(null);
      return;
    }

    setFetchedParty(null);
    setLoadingState(true);
    setErrorState(null);

    const fetchParty = async () => {
      try {
        const response = await api.getPartyById(routePartyId);
        if (currentRequestId !== requestId.current) {
          return;
        }

        const mappedParty = mapBackendPartyToFrontend(response);
        setSelectedParty(mappedParty);
        setFetchedParty(mappedParty);
      } catch {
        if (currentRequestId !== requestId.current) {
          return;
        }
        setErrorState('파티 정보를 불러오지 못했습니다.');
      } finally {
        if (currentRequestId !== requestId.current) {
          return;
        }
        setLoadingState(false);
      }
    };

    fetchParty();
  }, [id, selectedParty?.id, setSelectedParty]);

  const routePartyId = id ? Number(id) : null;
  const routePartyIdIsValid = routePartyId !== null && Number.isFinite(routePartyId) && Number.isInteger(routePartyId);
  const party = selectedParty?.id === routePartyId && routePartyIdIsValid
    ? selectedParty
    : fetchedParty;

  return { party, isLoading, error };
}
