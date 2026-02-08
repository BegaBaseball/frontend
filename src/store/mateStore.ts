import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Party, PartyStatus, ChatMessage } from '../types/mate';



export interface PartyApplication {
  id: number;
  partyId: number;
  applicantId: number;
  applicantName: string;
  applicantBadge: 'verified' | 'trusted' | 'new';
  applicantRating: number;
  message: string;
  depositAmount: number;
  isPaid: boolean;
  isApproved: boolean;
  isRejected: boolean;
  createdAt: string;
}

export interface CheckInRecord {
  partyId: number;
  userId: number;
  checkedInAt: string;
  location: string;
}


export interface ChatRoom {
  partyId: number;
  participants: number[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

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

export interface ApplicationFormData {
  message: string;
}

interface MateState {
  parties: Party[];
  selectedParty: Party | null;
  myParties: Party[];
  myApplications: PartyApplication[];
  checkInRecords: CheckInRecord[];
  applications: PartyApplication[];
  chatMessages: ChatMessage[];
  chatRooms: ChatRoom[];
  currentUserId: number | null;

  // Search state
  searchQuery: string;

  // Form state
  createStep: number;
  formData: PartyFormData;
  formErrors: {
    description: string;
    ticketFile: string;
  };

  // Application form state
  applicationForm: ApplicationFormData;

  // Actions
  setSearchQuery: (query: string) => void;
  setParties: (parties: Party[]) => void;
  setSelectedParty: (party: Party | null) => void;
  addParty: (party: Party) => void;
  updateParty: (id: number, updates: Partial<Party>) => void;
  deleteParty: (id: number) => void;

  applyToParty: (application: PartyApplication) => void;
  approveApplication: (applicationId: number, partyId: number) => void;
  rejectApplication: (applicationId: number) => void;
  getPartyApplications: (partyId: number) => PartyApplication[];

  checkIn: (record: CheckInRecord) => void;

  convertToSale: (partyId: number, price: number) => void;

  // Chat actions
  sendMessage: (message: ChatMessage) => void;
  getChatMessages: (partyId: number) => ChatMessage[];
  getChatRoom: (partyId: number) => ChatRoom | undefined;
  markAsRead: (partyId: number) => void;

  // Form actions
  setCreateStep: (step: number) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  setFormError: (field: 'description' | 'ticketFile', error: string) => void;
  resetForm: () => void;
  validateDescription: (text: string) => string;
  validateMessage: (text: string) => string;
  validateChatMessage: (text: string) => string;

  // Application form actions
  updateApplicationForm: (data: Partial<ApplicationFormData>) => void;
  resetApplicationForm: () => void;
}

export const useMateStore = create<MateState>()(
  persist(
    (set, get) => ({
      parties: [],
      selectedParty: null,
      myParties: [],
      myApplications: [],
      checkInRecords: [],
      applications: [],
      chatMessages: [],
      chatRooms: [],
      currentUserId: null,

      // Search state
      searchQuery: '',

      // Form state
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

      // Application form state
      applicationForm: {
        message: '',
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setParties: (parties) => set({ parties }),
      setSelectedParty: (party) => set({ selectedParty: party }),

      addParty: (party) => set((state) => ({
        parties: [party, ...state.parties],
        myParties: [party, ...state.myParties]
      })),

      updateParty: (id, updates) => set((state) => ({
        parties: state.parties.map((p) => p.id === id ? { ...p, ...updates } : p),
        myParties: state.myParties.map((p) => p.id === id ? { ...p, ...updates } : p),
        selectedParty: state.selectedParty?.id === id
          ? { ...state.selectedParty, ...updates }
          : state.selectedParty,
      })),

      deleteParty: (id) => set((state) => ({
        parties: state.parties.filter((p) => p.id !== id),
        myParties: state.myParties.filter((p) => p.id !== id),
      })),

      applyToParty: (application) => set((state) => ({
        myApplications: [...state.myApplications, application],
        applications: [...state.applications, application],
      })),

      approveApplication: (applicationId, partyId) => set((state) => {
        const application = state.applications.find(app => app.id === applicationId);
        if (!application) return {};

        const updatedApplications = state.applications.map((app) =>
          app.id === applicationId ? { ...app, isApproved: true } : app
        );

        const existingRoomIndex = state.chatRooms.findIndex(room => room.partyId === partyId);
        let updatedChatRooms = [...state.chatRooms];

        if (existingRoomIndex !== -1) {
          const existingRoom = updatedChatRooms[existingRoomIndex];
          updatedChatRooms[existingRoomIndex] = {
            ...existingRoom,
            participants: [...new Set([...existingRoom.participants, application.applicantId])]
          };
        } else {
          const party = state.parties.find(p => p.id === partyId);
          if (party) {
            updatedChatRooms.push({
              partyId,
              participants: [party.hostId, application.applicantId],
              unreadCount: 0,
            });
          }
        }

        return {
          applications: updatedApplications,
          myApplications: state.myApplications.map((app) =>
            app.id === applicationId ? { ...app, isApproved: true } : app
          ),
          chatRooms: updatedChatRooms,
        };
      }),

      rejectApplication: (applicationId) => set((state) => ({
        applications: state.applications.map((app) =>
          app.id === applicationId ? { ...app, isRejected: true } : app
        ),
        myApplications: state.myApplications.map((app) =>
          app.id === applicationId ? { ...app, isRejected: true } : app
        ),
      })),

      getPartyApplications: (partyId) => {
        const state = get();
        return state.applications.filter(app => app.partyId === partyId);
      },

      checkIn: (record) => set((state) => ({
        checkInRecords: [...state.checkInRecords, record],
      })),

      convertToSale: (partyId, price) => set((state) => ({
        parties: state.parties.map((p) =>
          p.id === partyId ? { ...p, status: 'SELLING' as PartyStatus, price } : p
        ),
        myParties: state.myParties.map((p) =>
          p.id === partyId ? { ...p, status: 'SELLING' as PartyStatus, price } : p
        ),
      })),

      // Chat actions
      sendMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message],
        chatRooms: state.chatRooms.map((room) =>
          room.partyId === message.partyId
            ? { ...room, lastMessage: message, unreadCount: room.unreadCount + 1 }
            : room
        ),
      })),

      getChatMessages: (partyId) => {
        const state = get();
        return state.chatMessages.filter(msg => msg.partyId === partyId);
      },

      getChatRoom: (partyId) => {
        const state = get();
        return state.chatRooms.find(room => room.partyId === partyId);
      },

      markAsRead: (partyId) => set((state) => ({
        chatRooms: state.chatRooms.map((room) =>
          room.partyId === partyId ? { ...room, unreadCount: 0 } : room
        ),
      })),

      // Form actions
      setCreateStep: (step) => set({ createStep: step }),

      updateFormData: (data) => set((state) => ({
        formData: { ...state.formData, ...data },
      })),

      setFormError: (field, error) => set((state) => ({
        formErrors: { ...state.formErrors, [field]: error },
      })),

      resetForm: () => set({
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
      }),

      validateDescription: (text) => {
        if (text.length < 10) {
          return '소개글은 최소 10자 이상 입력해주세요.';
        }
        if (text.length > 200) {
          return '소개글은 200자를 초과할 수 없습니다.';
        }

        const forbiddenWords = ['욕설', '비방', '광고'];
        for (const word of forbiddenWords) {
          if (text.includes(word)) {
            return '부적절한 단어가 포함되어 있습니다.';
          }
        }

        const phonePattern = /\d{3}[-.\\s]?\d{3,4}[-.\\s]?\d{4}/;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
        if (phonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text)) {
          return '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
        }

        return '';
      },

      validateMessage: (text) => {
        if (text.length < 10) {
          return '메시지는 최소 10자 이상 입력해주세요.';
        }
        if (text.length > 500) {
          return '메시지는 500자를 초과할 수 없습니다.';
        }

        const forbiddenWords = ['욕설', '비방', '광고'];
        for (const word of forbiddenWords) {
          if (text.includes(word)) {
            return '부적절한 단어가 포함되어 있습니다.';
          }
        }

        const phonePattern = /\d{3}[-.\\s]?\d{3,4}[-.\\s]?\d{4}/;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
        if (phonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text)) {
          return '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
        }

        return '';
      },

      // 채팅 메시지 검증 (길이 제한 없이 금칙어/연락처/URL만 체크)
      validateChatMessage: (text) => {
        const forbiddenWords = ['욕설', '비방', '광고'];
        for (const word of forbiddenWords) {
          if (text.includes(word)) {
            return '부적절한 단어가 포함되어 있습니다.';
          }
        }

        const phonePattern = /\d{3}[-.\\s]?\d{3,4}[-.\\s]?\d{4}/;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
        if (phonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text)) {
          return '연락처 정보나 링크는 입력할 수 없습니다. 직접 만나서 교환해주세요.';
        }

        return '';
      },

      // Application form actions
      updateApplicationForm: (data) => set((state) => ({
        applicationForm: { ...state.applicationForm, ...data },
      })),

      resetApplicationForm: () => set({
        applicationForm: {
          message: '',
        },
      }),
    }), {
    name: 'mate-storage',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      selectedParty: state.selectedParty,
      createStep: state.createStep,
      formData: state.formData,
      searchQuery: state.searchQuery,
    }),
  })
);
