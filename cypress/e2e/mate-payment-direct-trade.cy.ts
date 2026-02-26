/// <reference types="cypress" />

describe('Mate Payment Direct Trade Mode', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('DIRECT_TRADE 모드에서는 결제 성공 콜백이 결제 승인 API를 호출하지 않고 안내만 노출한다', () => {
    cy.intercept('POST', '**/api/payments/toss/confirm').as('confirmPayment');

    cy.visit('/payment/success?paymentKey=pk-test&orderId=MATE-777-123-1735123456789', {
      onBeforeLoad(win) {
        (win as unknown as { __MATE_PAYMENT_MODE__?: string }).__MATE_PAYMENT_MODE__ = 'DIRECT_TRADE';
        win.sessionStorage.setItem('toss_payment_pending', JSON.stringify({
          partyId: 777,
          flowType: 'SELLING_FULL',
          paymentType: 'FULL',
          amount: 50000,
          orderId: 'MATE-777-123-1735123456789',
          orderName: 'KBO 메이트 결제',
          message: '신청합니다',
          ticketVerified: true,
          ticketImageUrl: null,
        }));
      },
    });

    cy.contains('직거래 모드 안내').should('be.visible');
    cy.contains('직거래 모드에서는 결제 콜백을 사용하지 않습니다').should('be.visible');
    cy.get('@confirmPayment.all').should('have.length', 0);
  });
});
