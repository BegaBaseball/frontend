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
    hostRating: 4.9,
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

describe('Mate Selling Payment Success', () => {
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

  const bootstrapAuthenticatedWindow = (win: Window, paymentMode?: string) => {
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
    if (paymentMode) {
      (win as unknown as { __MATE_PAYMENT_MODE__?: string }).__MATE_PAYMENT_MODE__ = paymentMode;
    }
  };

  const visitAsLoggedIn = (path: string, paymentMode?: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        bootstrapAuthenticatedWindow(win, paymentMode);
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
    cy.intercept('GET', '**/api/reviews/user/*/average', {
      statusCode: 200,
      body: 4.7,
    }).as('getHostRating');

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

  it('SELLING 파티 신청은 prepare를 강제하고 success 콜백에서 confirm 후 상태를 표시한다', () => {
    let createApplicationCalled = false;

    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: buildParty({
        status: 'SELLING',
        price: 50000,
      }),
    }).as('getSellingParty');

    cy.intercept('POST', '**/api/payments/toss/prepare', {
      statusCode: 200,
      body: {
        intentId: 11,
        orderId: 'MATE-777-11-1735123456789',
        amount: 50000,
        currency: 'KRW',
        orderName: 'KBO 메이트 티켓 구매 - 잠실',
        flowType: 'SELLING_FULL',
        paymentType: 'FULL',
      },
    }).as('preparePayment');

    cy.intercept('POST', '**/api/applications', (req) => {
      createApplicationCalled = true;
      req.reply({ statusCode: 201, body: {} });
    }).as('createApplication');

    visitAsLoggedIn('/mate/777/apply', 'TOSS_TEST');
    cy.wait('@getSellingParty');
    cy.contains('결제하기').click();
    cy.wait('@preparePayment');
    cy.wrap(null).then(() => {
      expect(createApplicationCalled).to.eq(false);
    });

    cy.intercept('POST', '**/api/payments/toss/confirm', {
      statusCode: 201,
      body: {
        id: 4001,
        partyId: 777,
        applicantId: 456,
        applicantName: 'BUYER',
        applicantBadge: 'NEW',
        applicantRating: 5.0,
        message: '구매합니다',
        depositAmount: 50000,
        paymentType: 'FULL',
        feeAmount: 0,
        netSettlementAmount: 50000,
        paymentStatus: 'PAID',
        settlementStatus: 'REQUESTED',
        isApproved: true,
        isRejected: false,
        createdAt: '2026-03-01T10:00:00Z',
      },
    }).as('confirmPayment');

    cy.visit('/payment/success?paymentKey=pk-selling-test&orderId=MATE-777-11-1735123456789', {
      onBeforeLoad(win) {
        bootstrapAuthenticatedWindow(win, 'TOSS_TEST');
        win.sessionStorage.setItem('toss_payment_pending', JSON.stringify({
          intentId: 11,
          partyId: 777,
          flowType: 'SELLING_FULL',
          policyVersion: 'v1',
          message: '구매합니다',
          verificationToken: null,
          ticketVerified: true,
          ticketImageUrl: null,
          paymentType: 'FULL',
          amount: 50000,
          orderId: 'MATE-777-11-1735123456789',
          orderName: 'KBO 메이트 결제',
        }));
      },
    });

    cy.wait('@confirmPayment');
    cy.contains('결제 완료').should('be.visible');
    cy.contains('정산 요청').should('be.visible');
  });

  it('DIRECT_TRADE 모드에서는 결제 성공 콜백이 confirm API를 호출하지 않는다', () => {
    cy.intercept('POST', '**/api/payments/toss/confirm').as('confirmPayment');

    cy.visit('/payment/success?paymentKey=pk-selling-test&orderId=MATE-777-11-1735123456789', {
      onBeforeLoad(win) {
        bootstrapAuthenticatedWindow(win, 'DIRECT_TRADE');
        win.sessionStorage.setItem('toss_payment_pending', JSON.stringify({
          partyId: 777,
          flowType: 'SELLING_FULL',
          paymentType: 'FULL',
          amount: 50000,
          orderId: 'MATE-777-11-1735123456789',
          orderName: 'KBO 메이트 결제',
          message: '구매합니다',
          ticketVerified: true,
          ticketImageUrl: null,
        }));
      },
    });

    cy.contains('직거래 모드 안내').should('be.visible');
    cy.get('@confirmPayment.all').should('have.length', 0);
  });
});
