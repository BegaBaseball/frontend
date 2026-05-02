import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PendingDiaryDraft {
  date: string | null;
  gameId?: number;
  stadium?: string;
  team?: string;
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
}

interface DiaryState {
  pendingDraft: PendingDiaryDraft | null;
}

interface DiaryActions {
  setPendingDraft: (draft: PendingDiaryDraft) => void;
  clearPendingDraft: () => void;
  reset: () => void;
}

type DiaryStore = DiaryState & DiaryActions;

const getInitialState = (): DiaryState => ({
  pendingDraft: null,
});

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setPendingDraft: (pendingDraft) => set({ pendingDraft }),
      clearPendingDraft: () => set({ pendingDraft: null }),
      reset: () => set(getInitialState()),
    }),
    {
      name: 'diary-draft-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        pendingDraft: state.pendingDraft,
      }),
    }
  )
);
