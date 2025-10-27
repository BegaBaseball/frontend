import { create } from 'zustand';
import happyEmoji from 'figma:asset/5843378a1433c3b38912e3121e2ff42cf8f6cd42.png';

interface DiaryStore {
  // 기존 useState 그대로 옮김
  diaryEntries: any[];
  date: Date | undefined;
  currentMonth: Date;
  selectedEntry: any;
  isDialogOpen: boolean;
  isEditMode: boolean;
  editedEntry: any;
  editPhotos: string[];
  isCreateMode: boolean;
  newEntry: any;
  
  // Setters - 기존 setState 대체
  setDiaryEntries: (entries: any[]) => void;
  setDate: (date: Date | undefined) => void;
  setCurrentMonth: (month: Date) => void;
  setSelectedEntry: (entry: any) => void;
  setIsDialogOpen: (open: boolean) => void;
  setIsEditMode: (mode: boolean) => void;
  setEditedEntry: (entry: any) => void;
  setEditPhotos: (photos: string[]) => void;
  setIsCreateMode: (mode: boolean) => void;
  setNewEntry: (entry: any) => void;
}

export const useDiaryStore = create<DiaryStore>((set) => ({
  // 초기값 - 기존 useState 초기값과 동일
  diaryEntries: [],
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
    homeScore: '',
    awayScore: '',
    emoji: happyEmoji,
    emojiName: '좋음',
    memo: '',
    photos: [],
    type: 'attended'
  },
  
  // Setters - 기존 setState를 그대로 대체
  setDiaryEntries: (entries) => set({ diaryEntries: entries }),
  setDate: (date) => set({ date }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  setIsDialogOpen: (open) => set({ isDialogOpen: open }),
  setIsEditMode: (mode) => set({ isEditMode: mode }),
  setEditedEntry: (entry) => set({ editedEntry: entry }),
  setEditPhotos: (photos) => set({ editPhotos: photos }),
  setIsCreateMode: (mode) => set({ isCreateMode: mode }),
  setNewEntry: (entry) => set({ newEntry: entry }),
}));