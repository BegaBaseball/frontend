describe('Mate Flow Policy', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
    cy.intercept({ method: 'GET', pathname: '/api/payments/capability' }, {
      statusCode: 200,
      body: {
        paymentMode: 'DIRECT_TRADE',
        businessMode: 'DIRECT_TRADE',
        provider: 'TOSS',
        environment: 'NONE',
        tossPaymentEnabled: false,
        sellingPaymentRequired: false,
        payoutEnabled: false,
        payoutProvider: 'SIM',
      },
    }).as('getMatePaymentCapability');
  });

  it('DIRECT_TRADE 일반 모집 신청은 ticketPrice 기반 스냅샷으로 생성한다', () => {
    cy.intercept('GET', '**/api/parties/666', {
      statusCode: 200,
      body: {
        id: 666,
        hostId: 1,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-05',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '내야',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'direct trade pending party',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 17000,
      },
    }).as('getDirectTradePendingParty');

    cy.intercept('POST', '**/api/applications', (req) => {
      expect(req.body).to.deep.equal({
        partyId: 666,
        message: '직거래 신청 메시지 테스트입니다',
        verificationToken: null,
        ticketVerified: false,
        ticketImageUrl: null,
      });
      req.reply({
        statusCode: 201,
        body: {
          id: 1,
          partyId: 666,
          applicantId: 9,
          applicantName: 'USER',
          applicantBadge: 'NEW',
          applicantRating: 5,
          message: '직거래 신청 메시지 테스트입니다',
          depositAmount: 17000,
          paymentType: 'DEPOSIT',
          isPaid: false,
          isApproved: false,
          isRejected: false,
          createdAt: '2026-03-03T10:00:00Z',
        },
      });
    }).as('createDirectTradePendingApplication');

    cy.visit('/mate/666/apply');

    cy.wait('@getDirectTradePendingParty');
    cy.contains('직거래 베타').should('be.visible');
    cy.contains('정책 안내').should('be.visible');
    cy.contains('다음 단계').should('be.visible');
    cy.get('textarea#message').type('직거래 신청 메시지 테스트입니다');
    cy.contains('참여 신청하기').click();
    cy.wait('@createDirectTradePendingApplication');
  });

  it('DIRECT_TRADE SELLING 신청은 price/FULL 스냅샷으로 생성한다', () => {
    cy.intercept('GET', '**/api/parties/667', {
      statusCode: 200,
      body: {
        id: 667,
        hostId: 1,
        hostName: 'SELLER',
        hostBadge: 'VERIFIED',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-06',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '1루',
        maxParticipants: 2,
        currentParticipants: 1,
        description: 'direct trade selling party',
        ticketVerified: true,
        status: 'SELLING',
        price: 50000,
        ticketPrice: 12000,
      },
    }).as('getDirectTradeSellingParty');

    cy.intercept('POST', '**/api/applications', (req) => {
      expect(req.body).to.deep.equal({
        partyId: 667,
        message: '티켓 구매 신청합니다.',
        verificationToken: null,
        ticketVerified: false,
        ticketImageUrl: null,
      });
      req.reply({
        statusCode: 201,
        body: {
          id: 2,
          partyId: 667,
          applicantId: 9,
          applicantName: 'USER',
          applicantBadge: 'NEW',
          applicantRating: 5,
          message: '티켓 구매 신청합니다.',
          depositAmount: 50000,
          paymentType: 'FULL',
          isPaid: false,
          isApproved: false,
          isRejected: false,
          createdAt: '2026-03-03T10:00:01Z',
        },
      });
    }).as('createDirectTradeSellingApplication');

    cy.visit('/mate/667/apply');

    cy.wait('@getDirectTradeSellingParty');
    cy.contains('직거래 베타').should('be.visible');
    cy.contains('현재 상태').should('be.visible');
    cy.contains('직거래 신청하기').click();
    cy.wait('@createDirectTradeSellingApplication');
  });

  it('SELLING 파티는 결제 없이 참여 신청 API를 호출한다', () => {
    cy.intercept('GET', '**/api/parties/777', {
      statusCode: 200,
      body: {
        id: 777,
        hostId: 1,
        hostName: 'SELLER',
        hostBadge: 'VERIFIED',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-01',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '1루',
        maxParticipants: 2,
        currentParticipants: 1,
        description: 'selling party',
        ticketVerified: true,
        status: 'SELLING',
        price: 50000,
        ticketPrice: 12000,
      },
    }).as('getSellingParty');

    cy.intercept('POST', '**/api/applications', (req) => {
      expect(req.body).to.deep.equal({
        partyId: 777,
        message: '티켓 구매 신청합니다.',
        verificationToken: null,
        ticketVerified: false,
        ticketImageUrl: null,
      });
      req.reply({ statusCode: 201, body: {} });
    }).as('createApplication');

    cy.visit('/mate/777/apply');
    cy.wait('@getSellingParty');
    cy.contains('직거래 신청하기').should('be.visible');
    cy.contains('정책 안내').should('be.visible');
    cy.contains('직거래 신청하기').click();
    cy.wait('@createApplication');
  });

  it('승인 전에는 채팅 화면에서 접근 차단 상태를 보여준다', () => {
    cy.intercept('GET', '**/api/parties/888', {
      statusCode: 200,
      body: {
        id: 888,
        hostId: 1,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-02',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '3루',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'pending party',
        ticketVerified: false,
        status: 'PENDING',
      },
    }).as('getPendingParty');

    cy.intercept('GET', '**/api/applications/party/888/mine', {
      statusCode: 200,
      body: null,
    }).as('myPendingApplication');

    cy.visit('/mate/888/chat');
    cy.wait('@getPendingParty');
    cy.wait('@myPendingApplication');
    cy.contains('승인 전에는 채팅이 열리지 않습니다').should('be.visible');
    cy.contains('승인 전에는 채팅 기록 조회와 메시지 전송이 모두 제한됩니다.').should('be.visible');
  });

  it('승인 후에는 채팅 조회 접근이 허용된다', () => {
    cy.intercept('GET', '**/api/parties/999', {
      statusCode: 200,
      body: {
        id: 999,
        hostId: 123,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-03',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '외야',
        maxParticipants: 2,
        currentParticipants: 2,
        description: 'matched party',
        ticketVerified: false,
        status: 'MATCHED',
      },
    }).as('getMatchedParty');

    cy.intercept({ method: 'GET', pathname: '/api/chat/party/999' }, {
      statusCode: 200,
      body: [
        {
          id: 1,
          partyId: 999,
          senderId: 1,
          senderName: 'HOST',
          message: '채팅 입장 가능합니다.',
          createdAt: '2026-03-03T09:00:00Z',
        },
      ],
    }).as('chatAllowed');

    cy.visit('/mate/999/chat');
    cy.wait('@getMatchedParty');
    cy.wait('@chatAllowed')
      .its('response.statusCode')
      .should('eq', 200);
  });
});
