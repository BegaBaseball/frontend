import { create } from 'zustand';

export type PartyStatus = 'PENDING' | 'MATCHED' | 'FAILED' | 'SELLING' | 'SOLD' | 'CHECKED_IN' | 'COMPLETED';

export interface Party {
  id: string;
  hostId: string;
  hostName: string;
  hostBadge: 'verified' | 'trusted' | 'new';
  hostRating: number;
  teamId: string;
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  ticketVerified: boolean;
  status: PartyStatus;
  price?: number; // 판매 전환 시
  createdAt: string;
}

export interface PartyApplication {
  id: string;
  partyId: string;
  applicantId: string;
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
  partyId: string;
  userId: string;
  checkedInAt: string;
  location: string;
}

export interface ChatMessage {
  id: string;
  partyId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface ChatRoom {
  partyId: string;
  participants: string[]; // userId array
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface PartyFormData {
  gameDate: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  section: string;
  maxParticipants: number;
  description: string;
  ticketFile: File | null;
}

export interface ApplicationFormData {
  message: string;
  paymentType: 'deposit' | 'full';
}

interface MateState {
  parties: Party[];
  selectedParty: Party | null;
  myParties: Party[];
  myApplications: PartyApplication[];
  checkInRecords: CheckInRecord[];
  applications: PartyApplication[]; // 모든 신청 목록
  chatMessages: ChatMessage[];
  chatRooms: ChatRoom[];
  currentUserId: string;
  
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
  updateParty: (id: string, updates: Partial<Party>) => void;
  deleteParty: (id: string) => void;
  
  applyToParty: (application: PartyApplication) => void;
  approveApplication: (applicationId: string, partyId: string) => void;
  rejectApplication: (applicationId: string) => void;
  getPartyApplications: (partyId: string) => PartyApplication[];
  
  checkIn: (record: CheckInRecord) => void;
  
  convertToSale: (partyId: string, price: number) => void;
  
  // Chat actions
  sendMessage: (message: ChatMessage) => void;
  getChatMessages: (partyId: string) => ChatMessage[];
  getChatRoom: (partyId: string) => ChatRoom | undefined;
  markAsRead: (partyId: string) => void;
  
  // Form actions
  setCreateStep: (step: number) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  setFormError: (field: 'description' | 'ticketFile', error: string) => void;
  resetForm: () => void;
  validateDescription: (text: string) => string;
  
  // Application form actions
  updateApplicationForm: (data: Partial<ApplicationFormData>) => void;
  resetApplicationForm: () => void;
}

export const useMateStore = create<MateState>((set) => ({
  parties: [
    {
      id: '1',
      hostId: 'currentUser',
      hostName: '나',
      hostBadge: 'verified',
      hostRating: 4.8,
      teamId: 'doosan',
      gameDate: '2025-05-15',
      gameTime: '18:30',
      stadium: '잠실야구장',
      homeTeam: 'doosan',
      awayTeam: 'lg',
      section: 'B 304',
      maxParticipants: 3,
      currentParticipants: 1,
      description: '같이 응원하실 분! 초보자도 환영합니다. 치맥 준비해갈게요 😊',
      ticketVerified: true,
      status: 'PENDING',
      createdAt: '2025-04-20T10:00:00Z',
    },
    {
      id: '2',
      hostId: 'user2',
      hostName: '베어스팬',
      hostBadge: 'trusted',
      hostRating: 4.5,
      teamId: 'doosan',
      gameDate: '2025-05-16',
      gameTime: '18:30',
      stadium: '잠실야구장',
      homeTeam: 'doosan',
      awayTeam: 'kia',
      section: 'A 201',
      maxParticipants: 2,
      currentParticipants: 2,
      description: '주말 경기 같이 보실 분 구해요! 열정적으로 응원해요 🔥',
      ticketVerified: true,
      status: 'MATCHED',
      createdAt: '2025-04-21T14:00:00Z',
    },
    {
      id: '3',
      hostId: 'user3',
      hostName: '직관러버',
      hostBadge: 'new',
      hostRating: 5.0,
      teamId: 'kia',
      gameDate: '2025-05-18',
      gameTime: '17:00',
      stadium: '광주-기아 챔피언스필드',
      homeTeam: 'kia',
      awayTeam: 'samsung',
      section: 'C 108',
      maxParticipants: 4,
      currentParticipants: 2,
      description: '즐겁게 야구 보러 가실 분! 분위기 좋게 즐겨요 ⚾',
      ticketVerified: true,
      status: 'PENDING',
      createdAt: '2025-04-22T09:00:00Z',
    },
    {
      id: '4',
      hostId: 'user4',
      hostName: 'KT팬',
      hostBadge: 'trusted',
      hostRating: 4.6,
      teamId: 'kt',
      gameDate: '2025-05-20',
      gameTime: '18:30',
      stadium: '수원KT위즈파크',
      homeTeam: 'kt',
      awayTeam: 'ssg',
      section: 'A 103',
      maxParticipants: 3,
      currentParticipants: 2,
      description: '주말 경기 같이 보실 분! 응원용품도 준비해갈게요!',
      ticketVerified: true,
      status: 'MATCHED',
      createdAt: '2025-04-23T11:00:00Z',
    },
  ],
  selectedParty: null,
  myParties: [],
  myApplications: [
    {
      id: 'myapp1',
      partyId: '4',
      applicantId: 'currentUser',
      applicantName: '나',
      applicantBadge: 'new',
      applicantRating: 5.0,
      message: '같이 응원하고 싶습니다!',
      depositAmount: 10000,
      isPaid: true,
      isApproved: true,
      isRejected: false,
      createdAt: '2025-04-24T09:00:00Z',
    },
  ],
  checkInRecords: [],
  applications: [
    {
      id: 'app1',
      partyId: '1',
      applicantId: 'user101',
      applicantName: '야구팬',
      applicantBadge: 'verified',
      applicantRating: 4.7,
      message: '같이 재미있게 경기 봐요! 저도 두산 팬입니다 😊',
      depositAmount: 10000,
      isPaid: true,
      isApproved: false,
      isRejected: false,
      createdAt: '2025-04-21T10:00:00Z',
    },
    {
      id: 'app2',
      partyId: '1',
      applicantId: 'user102',
      applicantName: '직관러',
      applicantBadge: 'trusted',
      applicantRating: 4.9,
      message: '직관 좋아하는 사람입니다! 함께 즐겁게 응원해요!',
      depositAmount: 10000,
      isPaid: true,
      isApproved: false,
      isRejected: false,
      createdAt: '2025-04-21T14:30:00Z',
    },
    {
      id: 'app3',
      partyId: '4',
      applicantId: 'user103',
      applicantName: 'KT응원단',
      applicantBadge: 'verified',
      applicantRating: 4.8,
      message: '열정적으로 응원합니다!',
      depositAmount: 10000,
      isPaid: true,
      isApproved: true,
      isRejected: false,
      createdAt: '2025-04-23T12:00:00Z',
    },
  ],
  chatMessages: [
    {
      id: 'msg1',
      partyId: '4',
      senderId: 'user4',
      senderName: 'KT팬',
      message: '안녕하세요! 경기 당일에 구장 정문에서 만나요',
      createdAt: '2025-04-25T10:00:00Z',
    },
    {
      id: 'msg2',
      partyId: '4',
      senderId: 'currentUser',
      senderName: '나',
      message: '네, 좋습니다! 18시까지 갈게요',
      createdAt: '2025-04-25T10:05:00Z',
    },
    {
      id: 'msg3',
      partyId: '4',
      senderId: 'user103',
      senderName: 'KT응원단',
      message: '저도 18시에 도착 예정입니다!',
      createdAt: '2025-04-25T10:10:00Z',
    },
  ],
  chatRooms: [
    {
      partyId: '4',
      participants: ['user4', 'currentUser', 'user103'],
      lastMessage: {
        id: 'msg3',
        partyId: '4',
        senderId: 'user103',
        senderName: 'KT응원단',
        message: '저도 18시에 도착 예정입니다!',
        createdAt: '2025-04-25T10:10:00Z',
      },
      unreadCount: 0,
    },
  ],
  currentUserId: 'currentUser', // 현재 로그인한 사용자 ID
  
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
    maxParticipants: 2,
    description: '',
    ticketFile: null,
  },
  formErrors: {
    description: '',
    ticketFile: '',
  },
  
  // Application form state
  applicationForm: {
    message: '',
    paymentType: 'deposit',
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
    const updatedApplications = state.applications.map((app) =>
      app.id === applicationId ? { ...app, isApproved: true } : app
    );
    
    // 채팅방 생성 또는 참여자 추가
    let updatedChatRooms = [...state.chatRooms];
    const existingRoom = updatedChatRooms.find(room => room.partyId === partyId);
    
    if (existingRoom && application) {
      existingRoom.participants = [...new Set([...existingRoom.participants, application.applicantId])];
    } else if (application) {
      const party = state.parties.find(p => p.id === partyId);
      updatedChatRooms.push({
        partyId,
        participants: [party?.hostId || '', application.applicantId],
        unreadCount: 0,
      });
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
    const state = useMateStore.getState();
    return state.applications.filter(app => app.partyId === partyId);
  },
  
  checkIn: (record) => set((state) => ({
    checkInRecords: [...state.checkInRecords, record],
  })),
  
  convertToSale: (partyId, price) => set((state) => ({
    parties: state.parties.map((p) =>
      p.id === partyId ? { ...p, status: 'SELLING', price } : p
    ),
    myParties: state.myParties.map((p) =>
      p.id === partyId ? { ...p, status: 'SELLING', price } : p
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
    const state = useMateStore.getState();
    return state.chatMessages.filter(msg => msg.partyId === partyId);
  },
  
  getChatRoom: (partyId) => {
    const state = useMateStore.getState();
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
      maxParticipants: 2,
      description: '',
      ticketFile: null,
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
    
    // 금칙어 체크
    const forbiddenWords = ['욕설', '비방', '광고'];
    for (const word of forbiddenWords) {
      if (text.includes(word)) {
        return '부적절한 단어가 포함되어 있습니다.';
      }
    }
    
    // 연락처 패턴 체크
    const phonePattern = /\d{3}[-.\\s]?\d{3,4}[-.\\s]?\d{4}/;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (phonePattern.test(text) || emailPattern.test(text)) {
      return '연락처 정보는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
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
      paymentType: 'deposit',
    },
  }),
}));
