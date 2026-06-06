/// <reference types="cypress" />

import { visitStadiumGuide } from '../support/stadiumSeatmap';

describe('Stadium SeatMap — Split Spec Smoke', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('split stadium seatmap specs keep the default Jamsil seatmap smoke green', () => {
    visitStadiumGuide();

    cy.get('[data-testid="jamsil-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible');
  });
});
