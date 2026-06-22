import {
  fetchStadiumPlaces,
  fetchStadiums,
} from '../api/stadiumGuidePublic';
import type { CategoryType } from '../types/stadium';

export const STADIUM_GUIDE_QUERY_KEYS = {
  stadiums: ['stadium-guide', 'stadiums'] as const,
  places: (stadiumId: string, category: CategoryType) => [
    ...STADIUM_GUIDE_QUERY_KEYS.stadiums,
    stadiumId,
    'places',
    category,
  ] as const,
};

export const isStadiumGuideDbCategory = (category: CategoryType): boolean =>
  category !== 'store' && category !== 'parking';

export const getStadiumGuideStadiumsQueryOptions = () => ({
  queryKey: STADIUM_GUIDE_QUERY_KEYS.stadiums,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchStadiums({ signal }),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
} as const);

export const getStadiumGuidePlacesQueryOptions = (
  stadiumId: string,
  category: CategoryType,
) => ({
  queryKey: STADIUM_GUIDE_QUERY_KEYS.places(stadiumId, category),
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchStadiumPlaces(stadiumId, category, { signal }),
  enabled: Boolean(stadiumId) && isStadiumGuideDbCategory(category),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
} as const);
