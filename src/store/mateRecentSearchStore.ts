import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  MATE_RECENT_SEARCH_LIMIT,
  getMateSearchTermKey,
  normalizeRecordableMateSearchTerm,
} from '../utils/mateSearchTerms';

interface MateRecentSearchState {
  recentSearches: string[];
}

interface MateRecentSearchActions {
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

type MateRecentSearchStore = MateRecentSearchState & MateRecentSearchActions;

export const useMateRecentSearchStore = create<MateRecentSearchStore>()(
  persist(
    (set) => ({
      recentSearches: [],

      addRecentSearch: (term) => {
        const normalized = normalizeRecordableMateSearchTerm(term);
        const normalizedKey = normalized ? getMateSearchTermKey(normalized) : null;
        if (!normalized || !normalizedKey) {
          return;
        }

        set((state) => ({
          recentSearches: [
            normalized,
            ...state.recentSearches.filter((item) => getMateSearchTermKey(item) !== normalizedKey),
          ].slice(0, MATE_RECENT_SEARCH_LIMIT),
        }));
      },

      removeRecentSearch: (term) => {
        const normalizedKey = getMateSearchTermKey(term);
        set((state) => ({
          recentSearches: normalizedKey
            ? state.recentSearches.filter((item) => getMateSearchTermKey(item) !== normalizedKey)
            : state.recentSearches.filter((item) => item !== term),
        }));
      },

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'mate-recent-search',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
