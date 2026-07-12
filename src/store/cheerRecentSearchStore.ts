import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { addCheerRecentSearch, removeCheerRecentSearch } from '../utils/cheerSearchTerms';

interface CheerRecentSearchStore {
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

export const useCheerRecentSearchStore = create<CheerRecentSearchStore>()(
  persist(
    (set) => ({
      recentSearches: [],
      addRecentSearch: (term) => set((state) => ({
        recentSearches: addCheerRecentSearch(state.recentSearches, term),
      })),
      removeRecentSearch: (term) => set((state) => ({
        recentSearches: removeCheerRecentSearch(state.recentSearches, term),
      })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'cheer-recent-search',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
