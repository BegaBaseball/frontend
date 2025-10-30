import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import happyEmoji from 'figma:asset/5843378a1433c3b38912e3121e2ff42cf8f6cd42.png';

export interface DiaryEntry {
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
}

const initialEntries: DiaryEntry[] = [
  { 
    date: '2025-10-10', 
    team: 'KIA vs NC', 
    emoji: happyEmoji, 
    emojiName: '좋음',
    type: 'attended',
    stadium: '광주 KIA 챔피언스 필드',
    score: '5-3 KIA 승',
    memo: '역전승으로 기분이 너무 좋았어요! 치맥이 맛있었습니다.',
    photos: [
      'https://images.unsplash.com/photo-1621601504231-d3b989089c12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMHN0YWRpdW0lMjBmb29kJTIwY2hpY2tlbiUyMGJlZXJ8ZW58MXx8fHwxNzYwOTI0NzU3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1604329003703-dcd7f21527e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMGZpZWxkJTIwbmlnaHQlMjBnYW1lfGVufDF8fHx8MTc2MDkyNDc1N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ]
  },
  { 
    date: '2025-10-07', 
    team: 'LG vs 두산', 
    emoji: happyEmoji,
    emojiName: '좋음',
    type: 'attended',
    stadium: '잠실야구장',
    score: '7-2 LG 승',
    memo: '압도적인 승리! 분위기가 정말 좋았어요.',
    photos: [
      'https://images.unsplash.com/photo-1758234449055-578be59f9613?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMGdhbWUlMjBjcm93ZCUyMHN0YWRpdW18ZW58MXx8fHwxNzYwOTI0NzU3fDA&ixlib=rb-4.1.0&q=80&w=1080'
    ]
  },
];

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
        emojiName: '좋음',
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
            emojiName: '좋음',
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
