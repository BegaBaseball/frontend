import { create } from 'zustand';

export interface PendingDiaryDraft {
  date: string | null;
  gameId?: number;
  stadium?: string;
  team?: string;
  section?: string;
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

export const useDiaryStore = create<DiaryStore>((set) => ({
  ...getInitialState(),

  setPendingDraft: (pendingDraft) => set({ pendingDraft }),
  clearPendingDraft: () => set({ pendingDraft: null }),
  reset: () => set(getInitialState()),
}));
