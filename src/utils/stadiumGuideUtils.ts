import type { Place } from '../types/stadium';

export type StadiumGuideSortOrder = 'default' | 'rating' | 'name';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export const normalizeOptionalText = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatOptionalText = (value?: string | null, fallback = '정보 없음'): string =>
  normalizeOptionalText(value) ?? fallback;

export const hasValidCoordinates = (
  lat?: number | null,
  lng?: number | null
): boolean => typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);

export const filterAndSortPlaces = (
  places: Place[],
  searchQuery: string,
  sortOrder: StadiumGuideSortOrder
): Place[] => {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  let result = normalizedQuery
    ? places.filter((place) => place.name.toLowerCase().includes(normalizedQuery))
    : places;

  if (sortOrder === 'rating') {
    result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sortOrder === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  return result;
};

export const resolveAsyncStatus = <T>(
  loading: boolean,
  error: string | null,
  items: T[]
): AsyncStatus => {
  if (loading) {
    return 'loading';
  }

  if (error) {
    return 'error';
  }

  if (items.length === 0) {
    return 'empty';
  }

  return 'success';
};
