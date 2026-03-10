import { create } from 'zustand';

interface CheerState {
  activeTab: string;
}

interface CheerActions {
  setActiveTab: (tab: string) => void;
  reset: () => void;
}

type CheerStore = CheerState & CheerActions;

const getInitialState = (): CheerState => ({
  activeTab: 'all',
});

export const useCheerStore = create<CheerStore>((set) => ({
  ...getInitialState(),
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set(getInitialState()),
}));
