import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Party, MateParty } from '../types/mate';
import { validateMateApplyMessage, validateMateChatMessage, validateMateDescription } from '../utils/mateValidation';

export type CheeringSide = 'HOME' | 'AWAY' | 'NEUTRAL' | '';

export interface PartyFormData {
  gameDate: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  section: string;
  cheeringSide: CheeringSide;
  seatCategory: string;
  seatDetail: string;
  maxParticipants: number;
  ticketPrice: number;
  description: string;
  ticketFile: File | null;
  reservationNumber?: string;
}

const normalizeSelectedParty = (party: Party | MateParty | null): Party | null => {
  if (!party) {
    return null;
  }

  if ('hostName' in party) {
    return party;
  }

  return {
    id: party.id,
    hostId: party.hostId,
    hostHandle: party.hostHandle,
    hostName: '',
    hostBadge: 'NEW',
    hostRating: 0,
    teamId: party.teamId,
    gameDate: party.gameDate,
    gameTime: party.gameTime,
    stadium: party.stadium,
    homeTeam: party.homeTeam,
    awayTeam: party.awayTeam,
    section: party.section,
    maxParticipants: party.maxParticipants,
    currentParticipants: party.currentParticipants,
    description: party.description || '',
    ticketVerified: false,
    status: party.status,
    createdAt: '',
  };
};

interface MateState {
  selectedParty: Party | null;
  searchQuery: string;
  createStep: number;
  formData: PartyFormData;
  formErrors: {
    description: string;
    ticketFile: string;
  };
}

interface MateActions {
  setSearchQuery: (query: string) => void;
  setSelectedParty: (party: Party | MateParty | null) => void;
  updateParty: (id: number, updates: Partial<Party>) => void;
  setCreateStep: (step: number) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  setFormError: (field: 'description' | 'ticketFile', error: string) => void;
  resetForm: () => void;
  validateDescription: (text: string) => string;
  validateMessage: (text: string) => string;
  validateChatMessage: (text: string) => string;
  reset: () => void;
}

type MateStore = MateState & MateActions;

const getInitialState = (): MateState => ({
  selectedParty: null,
  searchQuery: '',
  createStep: 1,
  formData: {
    gameDate: '',
    gameTime: '',
    homeTeam: '',
    awayTeam: '',
    stadium: '',
    section: '',
    cheeringSide: '',
    seatCategory: '',
    seatDetail: '',
    maxParticipants: 2,
    ticketPrice: 0,
    description: '',
    ticketFile: null,
    reservationNumber: '',
  },
  formErrors: {
    description: '',
    ticketFile: '',
  },
});

export const useMateStore = create<MateStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedParty: (party) => set({ selectedParty: normalizeSelectedParty(party) }),

      updateParty: (id, updates) =>
        set((state) => ({
          selectedParty:
            state.selectedParty?.id === id
              ? { ...state.selectedParty, ...updates }
              : state.selectedParty,
        })),

      setCreateStep: (step) => set({ createStep: step }),

      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setFormError: (field, error) =>
        set((state) => ({
          formErrors: { ...state.formErrors, [field]: error },
        })),

      resetForm: () => {
        const initialState = getInitialState();
        set({
          createStep: initialState.createStep,
          formData: initialState.formData,
          formErrors: initialState.formErrors,
        });
      },

      validateDescription: (text) => validateMateDescription(text),
      validateMessage: (text) => validateMateApplyMessage(text),
      validateChatMessage: (text) => validateMateChatMessage(text),

      reset: () => set(getInitialState()),
    }),
    {
      name: 'mate-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        createStep: state.createStep,
        formData: { ...state.formData, ticketFile: null },
        searchQuery: state.searchQuery,
      }),
    }
  )
);
