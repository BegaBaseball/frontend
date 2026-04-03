import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getApiErrorStatus } from '../api/errorStatus';
import { Party } from '../types/mate';
import { getMatePartyQueryOptions } from './mateQueryOptions';
import { getMateRoutePlaceholderParty } from '../utils/mate';

export interface MatePartyRouteState {
  party: Party | null;
  isLoading: boolean;
  isRevalidating: boolean;
  error: string | null;
  statusCode: number | null;
}

const parseRoutePartyId = (id?: string): number | null => {
  if (!id) {
    return null;
  }

  const partyId = Number(id);
  return Number.isFinite(partyId) && Number.isInteger(partyId) ? partyId : null;
};

export function useMatePartyFromRoute(id?: string): MatePartyRouteState {
  const location = useLocation();
  const routePartyId = parseRoutePartyId(id);
  const placeholderParty = getMateRoutePlaceholderParty(location.state, routePartyId);

  const partyQuery = useQuery({
    ...(routePartyId !== null
      ? getMatePartyQueryOptions(routePartyId, { skipGlobalErrorHandler: true })
      : getMatePartyQueryOptions('invalid', { skipGlobalErrorHandler: true })),
    enabled: routePartyId !== null,
    placeholderData: placeholderParty,
  });

  const statusCode = id && routePartyId !== null ? getApiErrorStatus(partyQuery.error) : null;
  const isFatalStatus = statusCode === 404 || statusCode === 403;
  const party = isFatalStatus ? null : (partyQuery.data ?? placeholderParty ?? null);
  const isLoading = routePartyId !== null && party === null && partyQuery.isPending;
  const isRevalidating = routePartyId !== null && party !== null && partyQuery.isFetching && !isLoading;
  const error = !id
    ? null
    : routePartyId === null
      ? '유효하지 않은 파티 ID입니다.'
      : statusCode === 404
        ? '삭제되었거나 존재하지 않는 파티입니다.'
        : statusCode === 403
          ? '이 파티를 볼 권한이 없습니다.'
          : party === null && partyQuery.error
            ? '파티 정보를 불러오지 못했습니다.'
            : null;

  return { party, isLoading, isRevalidating, error, statusCode };
}
