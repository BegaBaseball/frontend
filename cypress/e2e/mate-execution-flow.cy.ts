/// <reference types="cypress" />

describe('Mate execution flow UI', () => {
  const revealDeferredMateDetailContent = () => {
    cy.contains('CHECK-IN QR').should('be.visible');
    cy.scrollTo(0, 900);
  };

  const buildParty = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 920,
    hostId: 123,
    hostName: '호스트',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 11,
    teamId: 'LG',
    gameDate: '2026-03-21',
    gameTime: '18:30',
    stadium: '잠실야구장',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루 응원석',
    maxParticipants: 4,
    currentParticipants: 2,
    description: '실행 흐름 테스트용 파티',
    ticketVerified: true,
    ticketPrice: 26000,
    status: 'MATCHED',
    createdAt: '2026-03-01T09:00:00',
    ...overrides,
  });

  const buildApplication = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 501,
    partyId: 920,
    applicantId: 3001,
    applicantName: '신청자',
    applicantBadge: 'TRUSTED',
    applicantRating: 4.7,
    message: '같이 응원하고 체크인도 깔끔하게 진행하고 싶습니다.',
    depositAmount: 26000,
    paymentType: 'DEPOSIT',
    paymentStatus: 'PAID',
    settlementStatus: 'PENDING',
    isApproved: false,
    isRejected: false,
    ticketVerified: true,
    createdAt: '2026-03-10T10:00:00Z',
    responseDeadline: '2099-03-21T09:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('shows trust signals and follow-up actions on the host manage page', () => {
    const party = buildParty({ id: 920, hostId: 123 });
    const pendingApplication = buildApplication({ id: 501, partyId: 920, applicantName: '대기 신청자' });
    const approvedApplication = buildApplication({
      id: 502,
      partyId: 920,
      applicantName: '승인 참여자',
      isApproved: true,
      isRejected: false,
      settlementStatus: 'COMPLETED',
      responseDeadline: undefined,
    });

    cy.intercept('GET', '**/api/parties/920*', {
      statusCode: 200,
      body: party,
    }).as('getManageParty');

    cy.intercept('GET', '**/api/applications/party/920*', {
      statusCode: 200,
      body: [pendingApplication, approvedApplication],
    }).as('getManageApplications');

    cy.visit('/mate/920/manage');
    cy.wait('@getManageParty');
    cy.wait('@getManageApplications');

    cy.contains('Host Control').should('be.visible');
    cy.get('[data-testid="manage-summary-strip"]').within(() => {
      cy.contains('거래 방식').should('be.visible');
      cy.contains('응답 필요').should('be.visible');
    });

    cy.get('[data-testid="manage-application-pending"]').first().within(() => {
      cy.contains('대기 신청자').should('be.visible');
      cy.contains('신뢰 배지').should('be.visible');
      cy.contains('티켓 인증').should('be.visible');
      cy.contains('button', '승인').should('be.visible');
      cy.contains('button', '거절').should('be.visible');
    });

    cy.contains('button', '승인 (1)').click();
    cy.get('[data-testid="manage-application-approved"]').first().within(() => {
      cy.contains('승인 참여자').should('be.visible');
      cy.contains('button', '채팅방 입장').should('be.visible');
      cy.contains('button', '체크인 연결').should('be.visible');
    });
  });

  it('blocks non-host access to the manage page with an explanatory state', () => {
    const party = buildParty({ id: 921, hostId: 999 });

    cy.intercept('GET', '**/api/parties/921*', {
      statusCode: 200,
      body: party,
    }).as('getForeignParty');

    cy.visit('/mate/921/manage');
    cy.wait('@getForeignParty');
    cy.contains('호스트 전용 관리 화면').should('be.visible');
    cy.contains('상세로 돌아가기').should('be.visible');
  });

  it('supports QR-session check-in and updates progress after a successful check-in', () => {
    const party = buildParty({
      id: 930,
      hostId: 999,
      currentParticipants: 2,
      status: 'CHECKED_IN',
    });
    let checkIns: Array<Record<string, unknown>> = [];

    cy.intercept('GET', '**/api/parties/930*', {
      statusCode: 200,
      body: party,
    }).as('getCheckInParty');

    cy.intercept('GET', '**/api/checkin/party/930*', (req) => {
      req.reply({
        statusCode: 200,
        body: checkIns,
      });
    }).as('getCheckIns');

    cy.intercept('POST', '**/api/checkin', (req) => {
      expect(req.body.qrSessionId).to.eq('session-930');
      checkIns = [
        {
          id: 1,
          partyId: 930,
          userId: 123,
          userName: 'TestUser',
          location: '잠실야구장',
          checkedInAt: '2026-03-21T09:10:00Z',
        },
      ];
      req.reply({
        statusCode: 201,
        body: checkIns[0],
      });
    }).as('createCheckIn');

    cy.visit('/mate/930/checkin?sessionId=session-930');
    cy.wait('@getCheckInParty');
    cy.wait('@getCheckIns');

    cy.get('[data-testid="checkin-summary-strip"]').within(() => {
      cy.contains('QR 세션 진입').should('be.visible');
      cy.contains('0/2명').should('be.visible');
    });

    cy.contains('button', '체크인하기').click();
    cy.wait('@createCheckIn');
    cy.get('@getCheckIns.all').should('have.length', 1);

    cy.contains('체크인 완료').should('be.visible');
    cy.get('[data-testid="checkin-progress-card"]').within(() => {
      cy.contains('1명').should('be.visible');
      cy.contains('50%').should('be.visible');
    });
  });

  it('supports direct-entry check-in with a manual code when no QR session is present', () => {
    const party = buildParty({
      id: 932,
      hostId: 999,
      currentParticipants: 2,
      status: 'CHECKED_IN',
    });
    let checkIns: Array<Record<string, unknown>> = [];

    cy.intercept('GET', '**/api/parties/932*', {
      statusCode: 200,
      body: party,
    }).as('getManualCheckInParty');

    cy.intercept('GET', '**/api/checkin/party/932*', {
      statusCode: 200,
      body: checkIns,
    }).as('getManualCheckIns');

    cy.intercept('POST', '**/api/checkin', (req) => {
      expect(req.body).to.deep.equal({
        partyId: 932,
        location: '잠실야구장',
        manualCode: '0427',
      });
      checkIns = [
        {
          id: 2,
          partyId: 932,
          userId: 123,
          userName: 'TestUser',
          location: '잠실야구장',
          checkedInAt: '2026-03-21T09:12:00Z',
        },
      ];
      req.reply({
        statusCode: 201,
        body: checkIns[0],
      });
    }).as('createManualCheckIn');

    cy.visit('/mate/932/checkin');
    cy.wait('@getManualCheckInParty');
    cy.wait('@getManualCheckIns');

    cy.contains('수동 체크인 코드 입력').should('be.visible');
    cy.get('[data-testid="checkin-summary-strip"]').within(() => {
      cy.contains('일반 진입').should('be.visible');
      cy.contains('0/2명').should('be.visible');
    });

    cy.get('#manualCode').type('0427');
    cy.contains('button', '체크인하기').click();
    cy.wait('@createManualCheckIn');

    cy.contains('체크인 완료').should('be.visible');
    cy.get('[data-testid="checkin-progress-card"]').within(() => {
      cy.contains('1명').should('be.visible');
      cy.contains('50%').should('be.visible');
    });
  });

  it('shows the host completion state when everyone has checked in', () => {
    const party = buildParty({
      id: 931,
      hostId: 123,
      currentParticipants: 2,
      status: 'CHECKED_IN',
    });

    cy.intercept('GET', '**/api/parties/931*', {
      statusCode: 200,
      body: party,
    }).as('getCompleteParty');

    cy.intercept('GET', '**/api/checkin/party/931*', {
      statusCode: 200,
      body: [
        {
          id: 11,
          partyId: 931,
          userId: 123,
          userName: 'TestUser',
          location: '잠실야구장',
          checkedInAt: '2026-03-21T09:05:00Z',
        },
        {
          id: 12,
          partyId: 931,
          userId: 3001,
          userName: '동행 참여자',
          location: '잠실야구장',
          checkedInAt: '2026-03-21T09:06:00Z',
        },
      ],
    }).as('getCompleteCheckIns');

    cy.visit('/mate/931/checkin');
    cy.wait('@getCompleteParty');
    cy.wait('@getCompleteCheckIns');

    cy.contains('호스트 모드').should('be.visible');
    cy.contains('전원 도착 완료').should('be.visible');
    cy.contains('지금 해야 할 일').should('be.visible');
    cy.contains('동행 참여자').should('be.visible');
  });

  it('reuses the cached party across detail, manage, chat, and check-in routes', () => {
    const party = buildParty({
      id: 940,
      hostId: 123,
      currentParticipants: 2,
      status: 'MATCHED',
    });
    const pendingApplication = buildApplication({
      id: 601,
      partyId: 940,
      applicantName: '대기 신청자',
      isApproved: false,
      isRejected: false,
    });
    const approvedApplication = buildApplication({
      id: 602,
      partyId: 940,
      applicantName: '승인 참여자',
      isApproved: true,
      isRejected: false,
      responseDeadline: undefined,
    });

    cy.intercept('GET', '**/api/parties/940*', {
      statusCode: 200,
      body: party,
    }).as('getRouteParty');
    cy.intercept('GET', '**/api/applications/party/940/mine', {
      statusCode: 404,
      body: {},
    }).as('getMyApplication');
    cy.intercept('GET', '**/api/applications/party/940*', {
      statusCode: 200,
      body: [pendingApplication, approvedApplication],
    }).as('getPartyApplications');
    cy.intercept('GET', '**/api/chat/party/940*', {
      statusCode: 200,
      body: [],
    }).as('getChatMessages');
    cy.intercept('POST', '**/api/chat/party/940/read', {
      statusCode: 200,
      body: {},
    }).as('markChatRead');
    cy.intercept('GET', '**/api/checkin/party/940*', {
      statusCode: 200,
      body: [],
    }).as('getCheckIns');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');

    let baselinePartyRequestCount = 0;

    cy.visit('/mate/940');
    cy.wait('@getRouteParty');
    cy.contains('button', '체크인 QR 보기').should('be.visible');
    cy.get('@getRouteParty.all').then((calls) => {
      baselinePartyRequestCount = calls.length;
      expect(baselinePartyRequestCount).to.be.greaterThan(0);
    });

    revealDeferredMateDetailContent();
    cy.contains('button', '신청 관리 (1)').should('be.visible').click();
    cy.contains('Host Control').should('be.visible');
    cy.get('@getRouteParty.all').should((calls) => {
      expect(calls).to.have.length(baselinePartyRequestCount);
    });

    cy.contains('button', '채팅방 입장').first().click();
    cy.wait('@getChatMessages');
    cy.contains('채팅과 체크인 조율').should('be.visible');
    cy.get('@getRouteParty.all').should((calls) => {
      expect(calls).to.have.length(baselinePartyRequestCount);
    });

    cy.contains('button', '체크인').click();
    cy.wait('@getCheckIns');
    cy.contains('Arrival Status').should('be.visible');
    cy.get('@getRouteParty.all').should((calls) => {
      expect(calls).to.have.length(baselinePartyRequestCount);
    });
  });

  it('loads the chat route directly and recovers after refresh without router state', () => {
    const party = buildParty({
      id: 941,
      hostId: 123,
      currentParticipants: 2,
      status: 'MATCHED',
    });

    cy.intercept('GET', '**/api/parties/941*', {
      statusCode: 200,
      body: party,
    }).as('getDirectChatParty');
    cy.intercept('GET', '**/api/chat/party/941*', {
      statusCode: 200,
      body: [],
    }).as('getDirectChatMessages');
    cy.intercept('POST', '**/api/chat/party/941/read', {
      statusCode: 200,
      body: {},
    }).as('markDirectChatRead');

    cy.visit('/mate/941/chat');
    cy.wait('@getDirectChatParty');
    cy.wait('@getDirectChatMessages');
    cy.contains('채팅과 체크인 조율').should('be.visible');

    cy.reload();
    cy.wait('@getDirectChatParty');
    cy.wait('@getDirectChatMessages');
    cy.contains('채팅과 체크인 조율').should('be.visible');
  });

  it('loads the manage route directly and recovers after refresh without router state', () => {
    const party = buildParty({
      id: 942,
      hostId: 123,
      currentParticipants: 2,
      status: 'MATCHED',
    });
    const pendingApplication = buildApplication({
      id: 701,
      partyId: 942,
      applicantName: '직접 진입 신청자',
      isApproved: false,
      isRejected: false,
    });

    cy.intercept('GET', '**/api/parties/942*', {
      statusCode: 200,
      body: party,
    }).as('getDirectManageParty');
    cy.intercept('GET', '**/api/applications/party/942*', {
      statusCode: 200,
      body: [pendingApplication],
    }).as('getDirectManageApplications');

    cy.visit('/mate/942/manage');
    cy.wait('@getDirectManageParty');
    cy.wait('@getDirectManageApplications');
    cy.contains('Host Control').should('be.visible');

    cy.reload();
    cy.wait('@getDirectManageParty');
    cy.wait('@getDirectManageApplications');
    cy.contains('Host Control').should('be.visible');
  });

  it('loads the check-in route directly and recovers after refresh without router state', () => {
    const party = buildParty({
      id: 943,
      hostId: 123,
      currentParticipants: 2,
      status: 'CHECKED_IN',
    });

    cy.intercept('GET', '**/api/parties/943*', {
      statusCode: 200,
      body: party,
    }).as('getDirectCheckInParty');
    cy.intercept('GET', '**/api/checkin/party/943*', {
      statusCode: 200,
      body: [],
    }).as('getDirectCheckIns');

    cy.visit('/mate/943/checkin?sessionId=session-943');
    cy.wait('@getDirectCheckInParty');
    cy.wait('@getDirectCheckIns');
    cy.contains('Arrival Status').should('be.visible');

    cy.reload();
    cy.wait('@getDirectCheckInParty');
    cy.wait('@getDirectCheckIns');
    cy.contains('Arrival Status').should('be.visible');
  });
});
