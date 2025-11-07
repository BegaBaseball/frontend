import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import worstEmoji from 'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png';
import fullEmoji from 'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png';
import bestEmoji from 'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png';
import angryEmoji from 'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png';
import happyEmoji from 'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png';

export interface DiaryEntry {
  id: number;
  gameId: number;
  date: string;
  team: string;
  emoji: string;
  emojiName: string;
  type: 'attended' | 'scheduled';
  stadium: string;
  score: string;
  memo: string;
  photos: string[];
}

interface DiaryState {
  date: Date | undefined;
  currentMonth: Date;
  selectedEntry: DiaryEntry | null;
  isDialogOpen: boolean;
  isEditMode: boolean;
  editedEntry: DiaryEntry | null;
  editPhotos: string[];
  isCreateMode: boolean;
  newEntry: Partial<DiaryEntry>;
  diaryEntries: DiaryEntry[];
  
  setDate: (date: Date | undefined) => void;
  setCurrentMonth: (month: Date) => void;
  setSelectedEntry: (entry: DiaryEntry | null) => void;
  setIsDialogOpen: (open: boolean) => void;
  setIsEditMode: (mode: boolean) => void;
  setEditedEntry: (entry: DiaryEntry | null) => void;
  setEditPhotos: (photos: string[]) => void;
  setIsCreateMode: (mode: boolean) => void;
  setNewEntry: (entry: Partial<DiaryEntry>) => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
  updateDiaryEntry: (date: string, entry: DiaryEntry) => void;
  deleteDiaryEntry: (date: string) => void;
  resetNewEntry: () => void;
  setDiaryEntries: (entries: DiaryEntry[]) => void;
}

const initialEntries: DiaryEntry[] = [];

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      date: new Date(),
      currentMonth: new Date(),
      selectedEntry: null,
      isDialogOpen: false,
      isEditMode: false,
      editedEntry: null,
      editPhotos: [],
      isCreateMode: false,
      newEntry: {
        date: new Date().toISOString().split('T')[0],
        team: '',
        stadium: '',
        score: '',
        emoji: happyEmoji,
        emojiName: '즐거움',
        memo: '',
        photos: []
      },
      diaryEntries: initialEntries,
      
      setDate: (date) => set({ date }),
      setCurrentMonth: (month) => set({ currentMonth: month }),
      setSelectedEntry: (entry) => set({ selectedEntry: entry }),
      setIsDialogOpen: (open) => set({ isDialogOpen: open }),
      setIsEditMode: (mode) => set({ isEditMode: mode }),
      setEditedEntry: (entry) => set({ editedEntry: entry }),
      setDiaryEntries: (entries) => set({ diaryEntries: entries }),
      setEditPhotos: (photos) => set({ editPhotos: photos }),
      setIsCreateMode: (mode) => set({ isCreateMode: mode }),
      setNewEntry: (entry) => set((state) => ({ newEntry: { ...state.newEntry, ...entry } })),
      addDiaryEntry: (entry) =>
        set((state) => ({
          diaryEntries: [...state.diaryEntries, entry],
        })),
      updateDiaryEntry: (date, entry) =>
        set((state) => ({
          diaryEntries: state.diaryEntries.map((e) => (e.date === date ? entry : e)),
        })),
      deleteDiaryEntry: (date) =>
        set((state) => ({
          diaryEntries: state.diaryEntries.filter((e) => e.date !== date),
        })),
      resetNewEntry: () =>
        set({
          newEntry: {
            date: new Date().toISOString().split('T')[0],
            team: '',
            stadium: '',
            score: '',
            emoji: happyEmoji,
            emojiName: '즐거움',
            memo: '',
            photos: []
          },
        }),
    }),
    {
      name: 'diary-storage',
      partialize: (state) => ({
        diaryEntries: state.diaryEntries,
      }),
    }
  )
);
