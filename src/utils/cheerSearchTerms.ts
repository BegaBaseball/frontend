import { normalizeCheerSearchQuery } from '../components/cheer/CheerPresentation';

export const CHEER_RECENT_SEARCH_LIMIT = 6;

const getSearchKey = (value: string): string => normalizeCheerSearchQuery(value).toLocaleLowerCase('ko-KR');

export const normalizeRecordableCheerSearchTerm = (value: string): string | null => {
  const normalized = normalizeCheerSearchQuery(value);
  return normalized.length >= 2 ? normalized : null;
};

export const addCheerRecentSearch = (current: string[], value: string): string[] => {
  const normalized = normalizeRecordableCheerSearchTerm(value);
  if (!normalized) return current;
  const key = getSearchKey(normalized);
  return [normalized, ...current.filter((item) => getSearchKey(item) !== key)]
    .slice(0, CHEER_RECENT_SEARCH_LIMIT);
};

export const removeCheerRecentSearch = (current: string[], value: string): string[] => {
  const key = getSearchKey(value);
  return current.filter((item) => getSearchKey(item) !== key);
};
