/// <reference types="cypress" />

const toUtcDateString = (date: Date): string => date.toISOString().slice(0, 10);

const buildParty = (overrides: Record<string, unknown> = {}) => {
  const nextUtcDay = new Date();
  nextUtcDay.setUTCDate(nextUtcDay.getUTCDate() + 1);

  return {
    id: 777,
    hostId: 123,
    hostName: 'HOST',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.9,
    hostReviewCount: 14,
    teamId: 'LG',
    gameDate: toUtcDateString(nextUtcDay),
    gameTime: '18:30:00',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    maxParticipants: 2,
    currentParticipants: 1,
    description: 'selling party',
    ticketVerified: true,
    ticketPrice: 12000,
    status: 'PENDING',
    ...overrides,
  };
};

describe('Mate Selling Flow', () => {
  const fakeToken = 'e2e-mate-token';
  const authState = {
    state: {
      user: {
        id: 123,
        email: 'test@example.com',
        name: 'TestUser',
        handle: '@testuser',
        role: 'ROLE_USER',
        favoriteTeam: 'HH',
        profileImageUrl: null,
        hasPassword: true,
      },
      isLoggedIn: true,
      isAdmin: false,
    },
    version: 0,
  };

  const bootstrapAuthenticatedWindow = (win: Window) => {
    const originalAddEventListener = win.addEventListener.bind(win);
    win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'auth-session-expired' || type === 'global-api-error') {
        return;
      }
      return originalAddEventListener(type, listener, options);
    }) as typeof win.addEventListener;

    win.localStorage.setItem('auth-storage', JSON.stringify(authState));
    win.localStorage.setItem('accessToken', fakeToken);
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
  };

  const visitAsLoggedIn = (path: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        bootstrapAuthenticatedWindow(win);
      },
    });
    cy.setCookie('Authorization', fakeToken);
  };

  beforeEach(() => {
    cy.mockAPI();
  });

  it('판매 전환 시 단일 PATCH 요청에 status=SELLING, price를 포함한다', () => {
    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: buildParty(),
    }).as('getParty');
    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyApplication');
    cy.intercept('GET', '**/api/applications/party/777', {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('PATCH', '**/api/parties/777', (req) => {
      expect(req.body).to.deep.include({
        status: 'SELLING',
        price: 50000,
      });
      req.reply({
        statusCode: 200,
        body: buildParty({
          status: 'SELLING',
          price: 50000,
        }),
      });
    }).as('convertToSelling');

    visitAsLoggedIn('/mate/777');
    cy.wait('@getParty');
    cy.wait('@getMyApplication');

    cy.contains('button', '판매 전환').scrollIntoView().click({ force: true });
    cy.contains('티켓 판매 전환').should('be.visible');
    cy.get('input[placeholder="예: 15000"]').clear().type('50000');
    cy.contains('button', '확인').click();

    cy.wait('@convertToSelling');
    cy.contains('판매 전환이 완료되었습니다.').should('be.visible');
    cy.contains('티켓 판매가').should('be.visible');
    cy.contains('50,000원').should('be.visible');
  });
});
