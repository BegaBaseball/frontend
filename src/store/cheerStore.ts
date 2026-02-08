import { create } from 'zustand';

interface CheerState {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const useCheerStore = create<CheerState>((set) => ({
    activeTab: 'all',
    setActiveTab: (tab) => set({ activeTab: tab }),
}));
