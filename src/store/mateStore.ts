import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MateState {
  searchQuery: string;
}

interface MateActions {
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

type MateStore = MateState & MateActions;

const getInitialState = (): MateState => ({
  searchQuery: '',
});

export const useMateStore = create<MateStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setSearchQuery: (query) => set({ searchQuery: query }),

      reset: () => set(getInitialState()),
    }),
    {
      name: 'mate-search-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
      }),
    }
  )
);
