/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const getPublicNavbarChunkCounts = (win: Window) => {
  const resourceEntries = win.performance.getEntriesByType('resource');
  const countChunkLoads = (chunkName: string) => (
    resourceEntries.filter((entry) => entry.name.includes(chunkName)).length
  );

  return {
    menuPanel: countChunkLoads('/PublicNavbarMenuPanel.tsx') + countChunkLoads('PublicNavbarMenuPanel-'),
    desktopAuth: countChunkLoads('/PublicNavbarDesktopAuthControls.tsx') + countChunkLoads('PublicNavbarDesktopAuthControls-'),
  };
};

describe('Public navbar deferred loading', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
  });

  it('keeps mobile menu panel out of the initial public shell until the menu opens', () => {
    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.contains('KBO LEAGUE', { timeout: 10000 }).should('be.visible');

    cy.window().then((win) => {
      const chunkCounts = getPublicNavbarChunkCounts(win);
      expect(chunkCounts.menuPanel).to.eq(0);
      expect(chunkCounts.desktopAuth).to.eq(0);
    });

    cy.get('button[aria-label="메뉴 열기"]').click();
    cy.contains('메뉴').should('be.visible');

    cy.window().then((win) => {
      const chunkCounts = getPublicNavbarChunkCounts(win);
      expect(chunkCounts.menuPanel).to.be.greaterThan(0);
      expect(chunkCounts.desktopAuth).to.eq(0);
    });
  });
});
