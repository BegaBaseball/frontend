/// <reference types="cypress" />

import { interceptBaseApis, interceptGuestSession } from '../support/stadiumSeatmap';

describe('Stadium SeatMap — Split Spec Smoke', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('split stadium seatmap specs keep the default Jamsil seatmap smoke green', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="jamsil-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('be.visible');
  });
});
