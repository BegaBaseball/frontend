/// <reference types="cypress" />

import { getHomeAuthRequestTraces, visitHomePage } from '../support/homePage';

const getHomeChunkResourceCounts = (win: Window) => {
  const resourceEntries = win.performance.getEntriesByType('resource');
  const countChunkLoads = (chunkName: string) => (
    resourceEntries.filter((entry) => entry.name.includes(chunkName)).length
  );

  return {
    secondaryPanels: countChunkLoads('/HomeSecondaryPanels.tsx') + countChunkLoads('HomeSecondaryPanels-'),
    welcomeGuide: countChunkLoads('/WelcomeGuide.tsx') + countChunkLoads('WelcomeGuide-'),
    calendar: countChunkLoads('/ui/calendar.tsx') + countChunkLoads('calendar-'),
  };
};

describe('Home secondary panels deferred loading', () => {
  const selectedDate = '2026-03-16';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();

    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: {
        selectedDate,
        leagueStartDates: {
          regularSeasonStart: '2026-03-22',
          postseasonStart: '2026-10-06',
          koreanSeriesStart: '2026-10-26',
        },
        navigation: {
          hasPrev: true,
          hasNext: true,
          prevGameDate: '2026-03-15',
          nextGameDate: '2026-03-17',
        },
        games: [],
        scheduledGamesWindow: [],
      },
    }).as('getHomeBootstrapDeferred');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      delayMs: 1200,
      body: {
        hotCheerPosts: [],
        featuredMates: [],
        rankingSnapshot: {
          rankingSeasonYear: 2025,
          rankingSourceMessage: '2025 시즌 순위 데이터',
          isOffSeason: false,
          rankings: [],
        },
      },
    }).as('getHomeWidgetsDeferred');
  });

  it('keeps secondary panels out of the initial shell and mounts them after idle work', () => {
    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrapDeferred');
    cy.contains('KBO LEAGUE', { timeout: 10000 }).should('be.visible');
    cy.get('@getMe.all').should('have.length', 0);
    getHomeAuthRequestTraces().should('deep.equal', []);

    cy.window().then((win) => {
      const chunkCounts = getHomeChunkResourceCounts(win);
      expect(chunkCounts.secondaryPanels).to.be.at.most(1);
      expect(chunkCounts.welcomeGuide).to.eq(0);
      expect(chunkCounts.calendar).to.eq(0);
    });

    cy.wait('@getHomeWidgetsDeferred');
    cy.contains('직관 메이트 찾기', { timeout: 5000 }).should('be.visible');
    cy.contains('팀 순위').should('be.visible');

    cy.window().then((win) => {
      const chunkCounts = getHomeChunkResourceCounts(win);
      expect(chunkCounts.secondaryPanels).to.be.greaterThan(0);
    });
  });
});
