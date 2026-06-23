/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const fixedNow = new Date('2026-03-16T12:00:00').getTime();

const buildBootstrapResponse = () => ({
  selectedDate: '2026-03-16',
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
});

const buildWidgetsResponse = () => ({
  hotCheerPosts: [],
  featuredMates: [],
  rankingSnapshot: {
    rankingSeasonYear: 2025,
    rankingSourceMessage: '2025 시즌 순위 데이터',
    isOffSeason: true,
    rankings: [],
  },
});

const mockGuestAuth = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    },
  }).as('getMeAnonymous');
  cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 }).as('reissueAnonymous');
};

const visitAsGuest = (path: string, options: { skipGuide?: boolean } = {}) => {
  cy.visit(path, {
    onBeforeLoad: (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      if (options.skipGuide) {
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
      }
    },
  });
};

const assertMinTarget = (selector: string, label: string, minSize = 44) => {
  cy.get(selector)
    .first()
    .scrollIntoView()
    .should('be.visible')
    .then(($element) => {
      const rect = $element[0].getBoundingClientRect();

      expect(rect.width, `${label} width`).to.be.at.least(minSize);
      expect(rect.height, `${label} height`).to.be.at.least(minSize);
    });
};

const readLetterSpacing = (element: Element) => {
  const value = getComputedStyle(element).letterSpacing;
  return value === 'normal' ? 0 : parseFloat(value);
};

describe('first-slice mobile UI contracts', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
  });

  it('renders public bottom nav with safe bottom padding on mobile home', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse(),
    }).as('getHomeBootstrap');
    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });
    cy.wait('@getHomeBootstrap');

    cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
    cy.get('main').should(($main) => {
      const paddingBottom = parseFloat(getComputedStyle($main[0]).paddingBottom);
      expect(paddingBottom, 'main mobile safe bottom padding').to.be.at.least(80);
    });
    assertMinTarget('[data-testid="public-mobile-bottom-nav"] button', 'public bottom nav item');
  });

  it('shows first-run onboarding inline without blocking the page', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse(),
    }).as('getHomeBootstrap');
    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitAsGuest('/home');
    cy.wait('@getHomeBootstrap');
    cy.tick(2000);

    cy.get('[data-testid="home-onboarding-inline"]').should('be.visible');
    cy.get('[data-testid="home-onboarding-compact"]').should('not.exist');
    cy.get('body').should(($body) => {
      expect($body.css('overflow')).to.not.equal('hidden');
    });
    assertMinTarget('[data-testid="home-onboarding-start-cta"]', 'inline onboarding start CTA');
  });

  it('shows Mate guest samples and login CTA together', () => {
    visitAsGuest('/mate', { skipGuide: true });

    cy.get('[data-testid="mate-logged-out-entry"]').should('be.visible');
    cy.get('[data-testid="mate-guest-sample-list"]').should('be.visible');
    cy.get('[data-testid="mate-guest-sample-card"]').should('have.length.at.least', 2);
    cy.get('[data-testid="mate-login-cta"]').should('be.visible');
    assertMinTarget('[data-testid="mate-login-cta"]', 'mate login CTA');
  });

  it('keeps Korean landing titles from using negative letter spacing', () => {
    visitAsGuest('/');

    cy.get('.ds-hero-title').should(($title) => {
      expect(readLetterSpacing($title[0]), 'hero title letter spacing').to.be.at.least(0);
    });
    cy.get('.landing-wordmark').first().should(($wordmark) => {
      expect(readLetterSpacing($wordmark[0]), 'wordmark letter spacing').to.be.at.least(0);
    });
  });
});
