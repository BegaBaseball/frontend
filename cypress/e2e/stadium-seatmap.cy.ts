/// <reference types="cypress" />

import {
  ALL_STADIUMS,
  visitStadiumGuide,
  withinVisibleStadiumSeatMap,
} from '../support/stadiumSeatmap';

const STADIUM_PLACE_ALIASES: Record<string, string> = {
  JAMSIL: '@getJamsilPlaces',
  INCHEON: '@getIncheonPlaces',
  DAEGU: '@getDaeguPlaces',
  DAEJEON: '@getDaejeonPlaces',
  GOCHEOK: '@getGocheokPlaces',
  GWANGJU: '@getGwangjuPlaces',
  CHANGWON: '@getChangwonPlaces',
  SAJIK: '@getSajikPlaces',
  SUWON: '@getSuwonPlaces',
};

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

  it('9개 공식 구장은 좌석도 fallback 없이 렌더되어야 한다', () => {
    visitStadiumGuide();

    let isFirstIteration = true;

    ALL_STADIUMS.forEach((stadium) => {
      cy.get('#stadium-guide-select').select(stadium.stadiumId);

      const placeAlias = STADIUM_PLACE_ALIASES[stadium.stadiumId];
      if (!isFirstIteration && placeAlias) {
        cy.wait(placeAlias);
      }
      isFirstIteration = false;

      const venueKey = stadium.stadiumId.toLowerCase();
      withinVisibleStadiumSeatMap(() => {
        cy.get(`[data-testid="${venueKey}-seatmap-transform-layer"]`, { timeout: 12000 })
          .filter(':visible')
          .should('have.length.greaterThan', 0);

        cy.get('[data-testid="stadium-seatmap-loading"]', { timeout: 2000 }).should('not.exist');
        cy.get('[data-testid="stadium-seatmap-manual-required"]').should('not.exist');
        cy.get('[data-testid="stadium-seatmap-error"]').should('not.exist');
      });
    });
  });
});
