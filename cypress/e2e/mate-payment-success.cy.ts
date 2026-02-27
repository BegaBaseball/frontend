/// <reference types="cypress" />

describe('Mate Payment Success', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('결제/정산 상태를 표준 라벨로 표시한다', () => {
    cy.intercept('POST', '**/api/payments/toss/confirm', {
      statusCode: 201,
      body: {
        id: 1001,
        partyId: 777,
        applicantId: 123,
        applicantName: '테스터',
        applicantBadge: 'NEW',
        applicantRating: 5,
        message: '신청합니다',
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

    cy.visit('/payment/success?paymentKey=pk-test&orderId=MATE-777-123-1735123456789', {
      onBeforeLoad(win) {
        // TOSS_TEST 모드에서만 결제 승인 콜백 검증
        (win as unknown as { __MATE_PAYMENT_MODE__?: string }).__MATE_PAYMENT_MODE__ = 'TOSS_TEST';
        win.sessionStorage.setItem('toss_payment_pending', JSON.stringify({
          intentId: 11,
          partyId: 777,
          flowType: 'SELLING_FULL',
          policyVersion: 'v1',
          message: '신청합니다',
          verificationToken: null,
          ticketVerified: true,
          ticketImageUrl: null,
          paymentType: 'FULL',
          amount: 50000,
          orderId: 'MATE-777-123-1735123456789',
          orderName: 'KBO 메이트 결제',
        }));
      },
    });

    cy.wait('@confirmPayment');
    cy.contains('결제상태').should('be.visible');
    cy.contains('결제 완료').should('be.visible');
    cy.contains('정산상태').should('be.visible');
    cy.contains('정산 요청').should('be.visible');
  });
});
