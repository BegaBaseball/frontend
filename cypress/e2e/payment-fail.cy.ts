/// <reference types="cypress" />

describe('Payment Fail Page', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('renders encoded percent message without runtime error', () => {
    cy.visit('/payment/fail?message=100%25&code=TEST&orderId=order-123');

    cy.contains('결제에 실패했습니다').should('be.visible');
    cy.contains('100%').should('be.visible');
    cy.contains('오류 코드: TEST').should('be.visible');
  });

  it('renders default message when message query is missing', () => {
    cy.visit('/payment/fail?code=TEST');

    cy.contains('결제가 취소되었거나 오류가 발생했습니다.').should('be.visible');
    cy.contains('오류 코드: TEST').should('be.visible');
  });
});
