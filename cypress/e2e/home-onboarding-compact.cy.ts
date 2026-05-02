/// <reference types="cypress" />

export {};

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

const visitFirstHome = () => {
  cy.visit('/home', {
    onBeforeLoad: (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
    },
  });
};

describe('Home compact onboarding', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse(),
    }).as('getHomeBootstrap');
    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');
  });

  it('shows a compact first-run entry and closes through the primary CTA', () => {
    cy.viewport(390, 844);
    visitFirstHome();
    cy.wait('@getHomeBootstrap');
    cy.tick(2000);

    cy.get('[data-testid="home-onboarding-compact"]')
      .should('be.visible')
      .then(($modal) => {
        const rect = $modal[0].getBoundingClientRect();

        expect(rect.width, 'compact modal width').to.be.at.most(420);
        expect(rect.height, 'compact modal height').to.be.lessThan(520);
      })
      .within(() => {
        cy.contains('BEGA 시작하기').should('be.visible');
        cy.contains('오늘 경기').should('be.visible');
        cy.contains('전력분석실').should('be.visible');
        cy.contains('응원과 같이가요').should('be.visible');
        cy.contains('button', '다음').should('not.exist');
        cy.get('[data-testid="home-onboarding-start-cta"]').then(($button) => {
          const rect = $button[0].getBoundingClientRect();

          expect(rect.height, 'start CTA height').to.be.at.least(44);
        });
      });

    cy.get('[data-testid="home-onboarding-start-cta"]').click();
    cy.get('[data-testid="home-onboarding-compact"]').should('not.exist');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('bega_has_visited')).to.equal('true');
    });
  });
});
