/// <reference types="cypress" />

describe('MateDetail QR refresh', () => {
  const checkinBaseUrl = (Cypress.config('baseUrl') || window.location.origin || 'http://localhost:5176').replace(/\/$/, '');
  const fakeToken = 'mate-qr-refresh-token';
  const testUser = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    role: 'ROLE_USER',
    favoriteTeam: 'KT',
    hasPassword: true,
    profileImageUrl: null,
  };

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
    win.localStorage.setItem('auth-bootstrap-hint', '1');
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

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.viewport(1280, 800);
  });

  it('avoids immediate recursive refresh when session is already expired', () => {
    const detailParty = {
      id: 777,
      hostId: 123,
      hostName: '상세호스트',
      hostBadge: 'NEW',
      hostAverageRating: 4.5,
      hostReviewCount: 10,
      hostProfileImageUrl: 'https://cdn.example.com/profile.png',
      hostFavoriteTeam: 'KT',
      status: 'PENDING',
      gameDate: '2026-03-02',
      gameTime: '19:00',
      stadium: '문학 카펜트리',
      teamId: 'KT',
      homeTeam: 'KT',
      awayTeam: 'LG',
      section: '1루석',
      maxParticipants: 4,
      currentParticipants: 1,
      ticketVerified: true,
      ticketPrice: 50000,
      description: 'QR 자동 갱신 검증용 파티',
      createdAt: '2026-02-20T09:00:00',
    };

    let qrSessionCallCount = 0;
    let baselineCallCount = 0;

    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: detailParty,
    }).as('getPartyById');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');
    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyApplicationByParty');
    cy.intercept('GET', '**/api/applications/party/777*', {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('POST', '**/api/checkin/qr-session', (req) => {
      qrSessionCallCount += 1;
      req.reply({
        statusCode: 201,
        body: {
          sessionId: `session-${qrSessionCallCount}`,
          partyId: 777,
          expiresAt: '2026-03-01T11:59:00Z',
          checkinUrl: `${checkinBaseUrl}/mate/777/checkin?sessionId=session-${qrSessionCallCount}`,
        },
      });
    }).as('createCheckinQrSession');

    visitWithAuth('/mate/777');
    cy.wait('@getPartyById');
    cy.contains('CHECK-IN QR').should('be.visible');
    cy.contains('button', '체크인 QR 보기').click();
    cy.wait('@createCheckinQrSession');

    cy.then(() => {
      baselineCallCount = qrSessionCallCount;
      expect(baselineCallCount).to.be.greaterThan(0);
    });

    cy.wait(500);
    cy.then(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount);
    });

    cy.wait(8_500);
    cy.then(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount);
    });

    cy.wait(2_500);
    cy.wrap(null).should(() => {
      expect(qrSessionCallCount).to.be.at.least(baselineCallCount);
      expect(qrSessionCallCount).to.be.at.most(baselineCallCount + 1);
    });

    cy.wait(500);
    cy.then(() => {
      expect(qrSessionCallCount).to.be.at.least(baselineCallCount);
      expect(qrSessionCallCount).to.be.at.most(baselineCallCount + 1);
    });
  });

  it('shows a clear loading message while refreshing the checkin QR', () => {
    const detailParty = {
      id: 778,
      hostId: 123,
      hostName: '로딩호스트',
      hostBadge: 'NEW',
      hostAverageRating: 4.5,
      hostReviewCount: 10,
      hostProfileImageUrl: 'https://cdn.example.com/profile.png',
      hostFavoriteTeam: 'KT',
      status: 'PENDING',
      gameDate: '2026-03-02',
      gameTime: '19:00',
      stadium: '잠실',
      teamId: 'KT',
      homeTeam: 'KT',
      awayTeam: 'LG',
      section: '중앙석',
      maxParticipants: 4,
      currentParticipants: 1,
      ticketVerified: true,
      ticketPrice: 50000,
      description: 'QR 로딩 문구 검증용 파티',
      createdAt: '2026-02-20T09:00:00',
    };

    cy.intercept('GET', '**/api/parties/778*', {
      statusCode: 200,
      body: detailParty,
    }).as('getPartyById');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');
    cy.intercept('GET', '**/api/applications/party/778/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyApplicationByParty');
    cy.intercept('GET', '**/api/applications/party/778*', {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('POST', '**/api/checkin/qr-session', {
      statusCode: 201,
      delay: 1200,
      body: {
        sessionId: 'session-loading',
        partyId: 778,
        expiresAt: '2026-03-01T12:30:00Z',
        checkinUrl: `${checkinBaseUrl}/mate/778/checkin?sessionId=session-loading`,
      },
    }).as('createCheckinQrSession');

    visitWithAuth('/mate/778');
    cy.wait('@getPartyById');
    cy.contains('button', '체크인 QR 보기').click();
    cy.contains('체크인 QR을 새로 불러오는 중입니다.').should('be.visible');
    cy.wait('@createCheckinQrSession');
    cy.contains('체크인 QR을 새로 불러오는 중입니다.').should('not.exist');
  });
});
