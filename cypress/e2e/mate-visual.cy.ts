/// <reference types="cypress" />

describe('Mate Visual QA', () => {
  const fakeToken = 'visual-qa-token';
  const testUser = {
    id: 1,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    role: 'ROLE_USER',
    favoriteTeam: 'HH',
    hasPassword: true,
    profileImageUrl: null,
  };

  const listParty = {
    id: 777,
    hostId: 999,
    hostName: '비주얼 호스트',
    hostBadge: 'VERIFIED',
    hostRating: 4.7,
    hostProfileImageUrl: 'https://cdn.example.com/profile.png',
    hostFavoriteTeam: 'SS',
    status: 'PENDING',
    gameDate: '2026-03-22',
    gameTime: '18:30',
    stadium: '대구삼성라이온즈파크',
    teamId: 'SS',
    homeTeam: 'SS',
    awayTeam: 'LG',
    section: '블루존',
    maxParticipants: 4,
    currentParticipants: 2,
    ticketPrice: 26000,
    ticketVerified: true,
    description: '시각 검증용 파티 #응원 #직관',
    createdAt: '2026-03-01T09:00:00',
  };

  const sellingParty = {
    id: 778,
    hostId: 998,
    hostName: '판매 호스트',
    hostBadge: 'NEW',
    hostRating: 4.2,
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'LG',
    status: 'SELLING',
    gameDate: '2026-03-23',
    gameTime: '19:00',
    stadium: '서울잠실야구장',
    teamId: 'LG',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '오렌지석',
    maxParticipants: 2,
    currentParticipants: 1,
    ticketPrice: 22000,
    price: 54000,
    ticketVerified: false,
    description: '판매 흐름 시각 검증용 파티',
    createdAt: '2026-03-02T10:00:00',
  };

  const manageParty = {
    ...listParty,
    id: 779,
    hostId: 1,
    stadium: '잠실 관리 테스트',
    section: '1루 응원석',
  };

  const chatParty = {
    ...listParty,
    id: 780,
    hostId: 999,
    status: 'MATCHED',
    currentParticipants: 2,
    stadium: '대화 흐름 테스트',
    section: '외야석',
  };

  const checkInParty = {
    ...listParty,
    id: 781,
    hostId: 999,
    status: 'CHECKED_IN',
    currentParticipants: 2,
    stadium: '체크인 흐름 테스트',
    section: '3루 지정석',
  };

  const manageApplications = [
    {
      id: 901,
      partyId: manageParty.id,
      applicantId: 4101,
      applicantName: '대기 참여자',
      applicantBadge: 'TRUSTED',
      applicantRating: 4.7,
      message: '관리 화면 시각 검증용 신청입니다.',
      depositAmount: 26000,
      paymentType: 'DEPOSIT',
      paymentStatus: 'PAID',
      settlementStatus: 'PENDING',
      isApproved: false,
      isRejected: false,
      ticketVerified: true,
      createdAt: '2026-03-05T10:00:00Z',
      responseDeadline: '2099-03-22T09:00:00Z',
    },
    {
      id: 902,
      partyId: manageParty.id,
      applicantId: 4102,
      applicantName: '승인 참여자',
      applicantBadge: 'VERIFIED',
      applicantRating: 4.9,
      message: '승인 섹션 시각 검증용 신청입니다.',
      depositAmount: 26000,
      paymentType: 'DEPOSIT',
      paymentStatus: 'PAID',
      settlementStatus: 'COMPLETED',
      isApproved: true,
      isRejected: false,
      ticketVerified: true,
      createdAt: '2026-03-05T11:00:00Z',
    },
  ];

  const chatMessages = [
    {
      id: 1001,
      partyId: chatParty.id,
      senderId: 999,
      senderName: '비주얼 호스트',
      message: '경기 30분 전에 1루 게이트에서 만나요.',
      createdAt: '2026-03-20T09:00:00Z',
    },
    {
      id: 1002,
      partyId: chatParty.id,
      senderId: 1,
      senderName: 'TestUser',
      message: '좋아요. 체크인 전에 다시 연락드릴게요.',
      createdAt: '2026-03-20T09:02:00Z',
    },
  ];

  const checkInRecords = [
    {
      id: 3001,
      partyId: checkInParty.id,
      userId: 1,
      userName: 'TestUser',
      location: checkInParty.stadium,
      checkedInAt: '2026-03-22T08:55:00Z',
    },
  ];

  const seedAuthState = (win: Window, theme: 'light' | 'dark') => {
    const authState = {
      state: {
        user: testUser,
        isLoggedIn: true,
        isAdmin: false,
      },
      version: 0,
    };

    win.localStorage.setItem('auth-storage', JSON.stringify(authState));
    win.localStorage.setItem('accessToken', fakeToken);
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
    win.localStorage.setItem('kbo-theme', theme);
    win.document.cookie = `Authorization=${fakeToken}; path=/`;
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    cy.document().then((doc) => {
      doc.documentElement.classList.toggle('dark', theme === 'dark');
    });
  };

  const visitWithTheme = (path: string, theme: 'light' | 'dark') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        seedAuthState(win, theme);
      },
    });

    cy.window().then((win) => {
      seedAuthState(win, theme);
    });

    applyTheme(theme);
  };

  const setupMateMocks = () => {
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: testUser,
      },
    }).as('sessionGetMe');

    cy.intercept('GET', '**/api/parties*', (req) => {
      const requestUrl = new URL(req.url);
      const pathname = requestUrl.pathname;
      if (!pathname.endsWith('/parties') && !pathname.endsWith('/parties/')) {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          content: [listParty, sellingParty],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 9,
        },
      });
    }).as('getMateParties');

    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: listParty,
    }).as('getMateDetailParty');

    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyMateApplication');

    cy.intercept('GET', '**/api/applications/party/777*', {
      statusCode: 200,
      body: [],
    }).as('getMateApplications');

    cy.intercept('GET', '**/api/reviews/user/999/average', {
      statusCode: 200,
      body: 4.7,
    }).as('getMateHostRating');

    cy.intercept('GET', '**/api/parties/779*', {
      statusCode: 200,
      body: manageParty,
    }).as('getMateManageParty');

    cy.intercept('GET', '**/api/applications/party/779*', {
      statusCode: 200,
      body: manageApplications,
    }).as('getMateManageApplications');

    cy.intercept('GET', '**/api/parties/780*', {
      statusCode: 200,
      body: chatParty,
    }).as('getMateChatParty');

    cy.intercept('GET', '**/api/applications/party/780/mine', {
      statusCode: 200,
      body: {
        id: 903,
        partyId: chatParty.id,
        applicantId: 1,
        applicantName: 'TestUser',
        applicantBadge: 'NEW',
        applicantRating: 4.5,
        message: '채팅 접근 승인',
        depositAmount: 26000,
        paymentType: 'DEPOSIT',
        isApproved: true,
        isRejected: false,
        createdAt: '2026-03-06T09:00:00Z',
      },
    }).as('getMateChatApplication');

    cy.intercept('GET', '**/api/chat/party/780', {
      statusCode: 200,
      body: chatMessages,
    }).as('getMateChatMessages');

    cy.intercept('POST', '**/api/chat/party/780/read', {
      statusCode: 200,
      body: { success: true },
    }).as('markMateChatRead');

    cy.intercept('GET', '**/api/parties/781*', {
      statusCode: 200,
      body: checkInParty,
    }).as('getMateCheckInParty');

    cy.intercept('GET', '**/api/checkin/party/781*', {
      statusCode: 200,
      body: checkInRecords,
    }).as('getMateCheckIns');
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    setupMateMocks();
  });

  it('captures the list page in desktop light mode', () => {
    cy.viewport(1440, 900);
    visitWithTheme('/mate', 'light');
    cy.wait('@getMateParties');
    cy.contains('직관 메이트 찾기').should('be.visible');
    cy.contains('호스트 평점').should('be.visible');
    cy.screenshot('mate-visual-list-desktop-light');
  });

  it('captures the list page in desktop dark mode', () => {
    cy.viewport(1440, 900);
    visitWithTheme('/mate', 'dark');
    cy.wait('@getMateParties');
    cy.contains('직관 메이트 찾기').should('be.visible');
    cy.contains('진행 방식').should('be.visible');
    cy.screenshot('mate-visual-list-desktop-dark');
  });

  it('captures the detail page in desktop dark mode', () => {
    cy.viewport(1440, 900);
    visitWithTheme('/mate/777', 'dark');
    cy.wait('@getMateDetailParty');
    cy.contains('거래 방식').should('be.visible');
    cy.contains('Host Trust').should('be.visible');
    cy.contains('비용 안내').should('be.visible');
    cy.screenshot('mate-visual-detail-desktop-dark');
  });

  it('captures the detail page in mobile dark mode', () => {
    cy.viewport(1280, 800);
    visitWithTheme('/mate/777', 'dark');
    cy.wait('@getMateDetailParty');
    cy.viewport(390, 844);
    cy.contains('거래 방식').should('be.visible');
    cy.contains('취소 규칙').should('be.visible');
    cy.contains('비용 안내').should('be.visible');
    cy.screenshot('mate-visual-detail-mobile-dark');
  });

  it('captures the apply page in mobile light mode', () => {
    cy.viewport(390, 844);
    visitWithTheme('/mate/777/apply', 'light');
    cy.wait('@getMateDetailParty');
    cy.contains('파티 참여 신청').should('be.visible');
    cy.contains('정책 안내').should('be.visible');
    cy.get('textarea#message').type('시각 QA를 위한 신청 메시지입니다.');
    cy.get('button:visible').contains(/결제하기|신청하기/).should('be.visible');
    cy.screenshot('mate-visual-apply-mobile-light');
  });

  it('captures the manage page in desktop dark mode', () => {
    cy.viewport(1440, 900);
    visitWithTheme('/mate/779/manage', 'dark');
    cy.wait('@getMateManageParty');
    cy.wait('@getMateManageApplications');
    cy.contains('Host Control').should('be.visible');
    cy.contains('응답 필요').should('be.visible');
    cy.screenshot('mate-visual-manage-desktop-dark');
  });

  it('captures the chat page in desktop light mode', () => {
    cy.viewport(1440, 900);
    visitWithTheme('/mate/780/chat', 'light');
    cy.wait('@getMateChatParty');
    cy.wait('@getMateChatApplication');
    cy.wait('@getMateChatMessages');
    cy.contains('대화 기록').should('be.visible');
    cy.get('[data-testid="chat-summary-strip"]').should('be.visible');
    cy.screenshot('mate-visual-chat-desktop-light');
  });

  it('captures the check-in page in mobile dark mode', () => {
    cy.viewport(1280, 800);
    visitWithTheme('/mate/781/checkin?sessionId=session-781', 'dark');
    cy.wait('@getMateCheckInParty');
    cy.wait('@getMateCheckIns');
    cy.viewport(390, 844);
    cy.contains('체크인').should('be.visible');
    cy.contains('QR 세션').should('be.visible');
    cy.screenshot('mate-visual-checkin-mobile-dark');
  });
});
