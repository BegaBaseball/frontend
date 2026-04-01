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

  const visitAsGuest = (path: string) => {
    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: { success: false, message: 'Unauthorized' } }).as('guestGetMe');
    cy.intercept('GET', '**/auth/reissue*', { statusCode: 401, body: { success: false, message: 'Unauthorized' } }).as('guestReissue');

    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
      },
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

  const setupPartyErrorMocks = ({
    partyId,
    statusCode,
  }: {
    partyId: number;
    statusCode: 403 | 404;
  }) => {
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: testUser,
      },
    }).as('sessionGetMe');

    cy.intercept('GET', `**/api/parties/${partyId}*`, {
      statusCode,
      body: {},
    }).as('getPartyById');

    cy.intercept('GET', '**/api/parties*', {
      statusCode: 200,
      body: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 9,
      },
    }).as('getParties');
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
      cy.get('[data-testid="mate-pending-status"]').should('be.visible');
      cy.contains('신청이 접수되었습니다.').should('exist');
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

    getDesktopActionCard().scrollIntoView().within(() => {
      cy.contains('참여 확정').should('exist');
      cy.contains('button', '채팅방 입장').should('exist');
      cy.contains('button', '체크인 페이지').should('exist');
    });

    cy.get('@createCheckinQrSession.all').should('have.length', 0);
    cy.contains('button', '체크인 QR 보기').click();
    cy.wait('@createCheckinQrSession');
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

    cy.contains('좌석 시야').should('be.visible');
    cy.contains('button', '좌석/구역 보기').click();
    cy.wait('@getSeatViews');
    cy.contains('아직 등록된 시야가 없어요').should('be.visible');
  });

  it('shows an invalid-id error without issuing a party query', () => {
    visitWithAuth('/mate/not-a-party-id');

    cy.contains('파티를 불러오지 못했습니다').should('be.visible');
    cy.contains('유효하지 않은 파티 ID입니다.').should('be.visible');
  });

  it('preserves the mate detail redirect target when auth bootstrap returns 401', () => {
    cy.intercept('GET', `**/api/parties/${baseParty.id}*`, {
      statusCode: 200,
      body: baseParty,
    }).as('blockedPartyRequest');

    visitAsGuest(`/mate/${baseParty.id}`);
    cy.wait('@guestGetMe');
    cy.contains('로그인 필요').should('be.visible');
    cy.contains('로그인하러 가기').click();
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(`/mate/${baseParty.id}`)}`);
    cy.get('@blockedPartyRequest.all').should('have.length', 0);
  });

  it('preserves the manage redirect target when auth bootstrap returns 401', () => {
    cy.intercept('GET', `**/api/parties/${baseParty.id}*`, {
      statusCode: 200,
      body: baseParty,
    }).as('blockedManagePartyRequest');

    visitAsGuest(`/mate/${baseParty.id}/manage`);
    cy.wait('@guestGetMe');
    cy.contains('로그인 필요').should('be.visible');
    cy.contains('로그인하러 가기').click();
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(`/mate/${baseParty.id}/manage`)}`);
    cy.get('@blockedManagePartyRequest.all').should('have.length', 0);
  });

  it('preserves the check-in redirect target including query params when auth bootstrap returns 401', () => {
    const checkInPath = `/mate/${baseParty.id}/checkin?sessionId=session-${baseParty.id}`;

    cy.intercept('GET', `**/api/parties/${baseParty.id}*`, {
      statusCode: 200,
      body: baseParty,
    }).as('blockedCheckInPartyRequest');

    visitAsGuest(checkInPath);
    cy.wait('@guestGetMe');
    cy.contains('로그인 필요').should('be.visible');
    cy.contains('로그인하러 가기').click();
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(checkInPath)}`);
    cy.get('@blockedCheckInPartyRequest.all').should('have.length', 0);
  });

  it('redirects to the mate list when the party no longer exists', () => {
    const partyId = 999;
    setupPartyErrorMocks({ partyId, statusCode: 404 });

    visitWithAuth(`/mate/${partyId}`);
    cy.wait('@getPartyById');
    cy.contains('삭제되었거나 존재하지 않는 파티입니다.').should('be.visible');
    cy.location('pathname', { timeout: 5000 }).should('eq', '/mate');
  });

  it('keeps the user on the detail route when access is forbidden', () => {
    const partyId = 998;
    setupPartyErrorMocks({ partyId, statusCode: 403 });

    visitWithAuth(`/mate/${partyId}`);
    cy.wait('@getPartyById');
    cy.contains('이 파티를 볼 권한이 없습니다.').should('be.visible');
    cy.location('pathname').should('eq', `/mate/${partyId}`);
  });

  it('loads the apply route directly and recovers after refresh without router state', () => {
    const party = { ...baseParty, id: 904, status: 'MATCHED' as const };

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
    }).as('getApplyParty');

    visitWithAuth(`/mate/${party.id}/apply`);
    cy.wait('@getApplyParty');
    cy.contains('파티 참여 신청').should('be.visible');

    cy.reload();
    cy.wait('@getApplyParty');
    cy.contains('파티 참여 신청').should('be.visible');
  });

  it('keeps detail content visible during list to detail navigation using route state', () => {
    const party = { ...baseParty, id: 905, stadium: '사직야구장', homeTeam: 'LT', awayTeam: 'HH' };

    cy.intercept('GET', '**/api/parties?page=0&size=9*', {
      statusCode: 200,
      body: {
        content: [party],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 9,
      },
    }).as('getParties');
    cy.intercept('GET', `**/api/parties/${party.id}*`, {
      statusCode: 200,
      delay: 1200,
      body: party,
    }).as('getDelayedDetailParty');
    cy.intercept('GET', `**/api/applications/party/${party.id}/mine`, {
      statusCode: 404,
      body: {},
    }).as('getListMyApplication');
    cy.intercept('GET', `**/api/applications/party/${party.id}*`, {
      statusCode: 200,
      body: [],
    }).as('getListPartyApplications');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getListSeatViews');
    cy.intercept('POST', '**/api/checkin/qr-session', {
      statusCode: 201,
      body: {
        sessionId: `session-${party.id}`,
        partyId: party.id,
        expiresAt: '2026-03-28T08:00:00Z',
        checkinUrl: `${checkinBaseUrl}/mate/${party.id}/checkin?sessionId=session-${party.id}`,
      },
    }).as('getListQrSession');

    visitWithAuth('/mate');
    cy.wait('@getParties');
    cy.contains('사직야구장').click();

    cy.location('pathname').should('eq', `/mate/${party.id}`);
    cy.contains('사직야구장').should('be.visible');
    cy.contains('파티 정보를 불러오는 중').should('not.exist');
  });

  it('navigates from mate history without Zustand and keeps the placeholder content visible', () => {
    const party = { ...baseParty, id: 906, stadium: '고척스카이돔', teamId: 'WO', homeTeam: 'WO', awayTeam: 'LG' };

    cy.mockPublicFollowCounts('testuser');
    cy.intercept('GET', '**/api/parties/my*', {
      statusCode: 200,
      body: [party],
    }).as('getMyParties');
    cy.intercept('GET', `**/api/parties/${party.id}*`, {
      statusCode: 200,
      delay: 1200,
      body: party,
    }).as('getHistoryDetailParty');
    cy.intercept('GET', `**/api/applications/party/${party.id}/mine`, {
      statusCode: 404,
      body: {},
    }).as('getHistoryMyApplication');
    cy.intercept('GET', `**/api/applications/party/${party.id}*`, {
      statusCode: 200,
      body: [],
    }).as('getHistoryApplications');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getHistorySeatViews');
    cy.intercept('POST', '**/api/checkin/qr-session', {
      statusCode: 201,
      body: {
        sessionId: `session-${party.id}`,
        partyId: party.id,
        expiresAt: '2026-03-28T08:00:00Z',
        checkinUrl: `${checkinBaseUrl}/mate/${party.id}/checkin?sessionId=session-${party.id}`,
      },
    }).as('getHistoryQrSession');

    visitWithAuth('/mypage?view=mateHistory');
    cy.wait('@getMyParties');
    cy.contains('참여한 메이트').should('be.visible');
    cy.contains('상세보기 →').click();

    cy.location('pathname').should('eq', `/mate/${party.id}`);
    cy.contains('고척스카이돔').should('be.visible');
    cy.contains('파티 정보를 불러오는 중').should('not.exist');
    cy.get('@getHistoryDetailParty.all').should((requests) => {
      expect(requests.length).to.be.at.most(1);
    });
  });
});
