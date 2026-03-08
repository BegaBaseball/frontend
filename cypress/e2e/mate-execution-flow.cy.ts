/// <reference types="cypress" />

describe('Mate execution flow UI', () => {
  const buildParty = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 920,
    hostId: 123,
    hostName: '호스트',
    hostBadge: 'VERIFIED',
    hostRating: 4.8,
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
    cy.wait('@getCheckIns');

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
    cy.contains('button', '완료 확인').should('be.visible');
    cy.contains('동행 참여자').should('be.visible');
  });
});
