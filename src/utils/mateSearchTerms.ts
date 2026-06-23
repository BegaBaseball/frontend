export const MATE_RECENT_SEARCH_LIMIT = 6;
export const MATE_SEARCH_TERM_MIN_LENGTH = 2;
export const MATE_SEARCH_TERM_MAX_LENGTH = 50;

const CONTROL_CHARS = /[\x00-\x1F\x7F]+/g;
const WHITESPACE = /\s+/g;

export const normalizeMateSearchText = (term: string) =>
  term.replace(CONTROL_CHARS, ' ').replace(WHITESPACE, ' ').trim();

export const normalizeRecordableMateSearchTerm = (term: string) => {
  const normalized = normalizeMateSearchText(term);
  if (
    normalized.length < MATE_SEARCH_TERM_MIN_LENGTH
    || normalized.length > MATE_SEARCH_TERM_MAX_LENGTH
  ) {
    return null;
  }

  return normalized;
};

export const getMateSearchTermKey = (term: string) =>
  normalizeRecordableMateSearchTerm(term)?.toLowerCase() ?? null;
