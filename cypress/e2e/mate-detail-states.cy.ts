/// <reference types="cypress" />

describe('MateDetail state coverage', () => {
  const checkinBaseUrl = (Cypress.config('baseUrl') || window.location.origin || 'http://localhost:5176').replace(/\/$/, '');

  const fakeToken = 'mate-detail-state-token';
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

  const baseParty = {
    id: 901,
    hostId: 999,
    hostName: '상태 호스트',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 15,
    hostProfileImageUrl: 'https://cdn.example.com/profile.png',
    hostFavoriteTeam: 'SS',
    status: 'PENDING',
    gameDate: '2026-03-28',
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
    description: '상태 검증용 파티',
    createdAt: '2026-03-01T09:00:00',
  };

  const buildApplication = (overrides: Partial<{
    id: number;
    applicantId: number;
    applicantName: string;
    applicantBadge: 'NEW' | 'VERIFIED' | 'TRUSTED';
    applicantRating: number;
    message: string;
    depositAmount: number;
    paymentType: 'DEPOSIT' | 'FULL';
    isApproved: boolean;
    isRejected: boolean;
    createdAt: string;
  }> = {}) => ({
    id: 11,
    partyId: baseParty.id,
    applicantId: 1,
    applicantName: 'TestUser',
    applicantBadge: 'NEW' as const,
    applicantRating: 4.4,
    message: '상태 검증 신청',
    depositAmount: 26000,
    paymentType: 'DEPOSIT' as const,
    isApproved: false,
    isRejected: false,
    createdAt: '2026-03-10T10:00:00Z',
    ...overrides,
  });

  const seedAuthState = (win: Window) => {
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
    win.document.cookie = `Authorization=${fakeToken}; path=/`;
  };

  const visitWithAuth = (path: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        seedAuthState(win);
      },
    });

    cy.window().then((win) => {
      seedAuthState(win);
    });
  };

  const setupDetailMocks = ({
    party,
    myApplication,
    applications = [],
    seatViews = [],
  }: {
    party: typeof baseParty;
    myApplication?: Record<string, unknown> | null;
    applications?: Array<Record<string, unknown>>;
    seatViews?: Array<Record<string, unknown>>;
  }) => {
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: testUser,
      },
    }).as('sessionGetMe');

    cy.intercept('GET', `**/api/parties/${party.id}*`, {
      statusCode: 200,
      body: party,
    }).as('getPartyById');

    cy.intercept('GET', `**/api/applications/party/${party.id}/mine`, myApplication === undefined
      ? { statusCode: 404, body: {} }
      : { statusCode: 200, body: myApplication }).as('getMyApplicationByParty');

    cy.intercept('GET', `**/api/applications/party/${party.id}*`, {
      statusCode: 200,
      body: applications,
    }).as('getPartyApplications');

    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: seatViews,
    }).as('getSeatViews');

    cy.intercept('POST', '**/api/checkin/qr-session', {
      statusCode: 201,
      body: {
        sessionId: `session-${party.id}`,
        partyId: party.id,
        expiresAt: '2026-03-28T08:00:00Z',
        checkinUrl: `${checkinBaseUrl}/mate/${party.id}/checkin?sessionId=session-${party.id}`,
      },
    }).as('createCheckinQrSession');
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.viewport(1280, 800);
  });

  const getDesktopActionCard = () => cy.get('.sticky.top-6').first();

  it('shows host management CTA when the current user is the host', () => {
    const party = { ...baseParty, hostId: 1 };
    setupDetailMocks({
      party,
      applications: [buildApplication({ applicantId: 44, applicantName: '대기 신청자' })],
    });

    visitWithAuth(`/mate/${party.id}`);
    cy.wait('@getPartyById');
    cy.wait('@getPartyApplications');

    getDesktopActionCard().scrollIntoView().within(() => {
      cy.contains('호스트 모드').should('exist');
      cy.contains('button', '신청 관리 (1)').should('exist');
    });
  });

  it('shows pending approval context and cancel action for a waiting applicant', () => {
    const party = { ...baseParty, hostId: 999 };
    setupDetailMocks({
      party,
      myApplication: buildApplication(),
    });

    visitWithAuth(`/mate/${party.id}`);
    cy.wait('@getPartyById');
    cy.wait('@getMyApplicationByParty');

    getDesktopActionCard().scrollIntoView().within(() => {
      cy.contains('승인 대기').should('exist');
      cy.contains('승인 대기 중...').should('exist');
      cy.contains('신청 취소').should('exist');
    });
  });

  it('shows chat and check-in actions for an approved applicant', () => {
    const party = { ...baseParty, status: 'MATCHED' as const };
    setupDetailMocks({
      party,
      myApplication: buildApplication({ isApproved: true }),
    });

    visitWithAuth(`/mate/${party.id}`);
    cy.wait('@getPartyById');
    cy.wait('@getMyApplicationByParty');
    cy.wait('@createCheckinQrSession');

    getDesktopActionCard().scrollIntoView().within(() => {
      cy.contains('참여 확정').should('exist');
      cy.contains('button', '채팅방 입장').should('exist');
      cy.contains('button', '체크인 페이지').should('exist');
    });
  });

  it('shows rejected state recovery action', () => {
    const party = { ...baseParty };
    setupDetailMocks({
      party,
      myApplication: buildApplication({ isRejected: true }),
    });

    visitWithAuth(`/mate/${party.id}`);
    cy.wait('@getPartyById');
    cy.wait('@getMyApplicationByParty');

    getDesktopActionCard().scrollIntoView().within(() => {
      cy.contains('이번 신청은 거절되었습니다.').should('be.visible');
      cy.contains('button', '다른 파티 보기').should('be.visible');
    });
  });

  it('shows the seat-view empty state when no photos are available', () => {
    const party = { ...baseParty, stadium: '테스트구장', section: '알 수 없는 좌석' };
    setupDetailMocks({
      party,
      seatViews: [],
    });

    visitWithAuth(`/mate/${party.id}`);
    cy.wait('@getPartyById');
    cy.wait('@getSeatViews');

    cy.contains('좌석 시야').should('be.visible');
    cy.contains('아직 등록된 시야가 없어요').should('be.visible');
  });
});
