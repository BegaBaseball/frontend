/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const fixedNow = new Date('2026-03-16T12:00:00').getTime();

const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '1440x1000', width: 1440, height: 1000 },
];

const buildBootstrapResponse = () => ({
  selectedDate: '2026-03-16',
  leagueStartDates: {
    regularSeasonStart: '2026-03-01',
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

const visitAsGuest = (path: string) => {
  cy.visit(path, {
    onBeforeLoad: (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem('bega_has_visited', 'true');
      win.localStorage.setItem('bega_dont_show_guide', 'true');
    },
  });
};

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

const assertNoHorizontalOverflow = () => {
  cy.document().then((doc) => {
    const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
    const viewportWidth = doc.documentElement.clientWidth;

    expect(documentWidth, 'document width').to.be.at.most(viewportWidth + 1);
  });
};

const assertViewportSize = (expectedWidth: number, expectedHeight: number) => {
  cy.window().then((win) => {
    expect(win.innerWidth, 'viewport width').to.equal(expectedWidth);
    expect(win.innerHeight, 'viewport height').to.equal(expectedHeight);
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

const assertCenterReachable = (selector: string, label: string) => {
  cy.get(selector)
    .first()
    .scrollIntoView()
    .should('be.visible')
    .then(($element) => {
      const element = $element[0];
      const rect = element.getBoundingClientRect();
      const ownerWindow = element.ownerDocument.defaultView;
      const viewportWidth = ownerWindow?.innerWidth ?? element.ownerDocument.documentElement.clientWidth;
      const viewportHeight = ownerWindow?.innerHeight ?? element.ownerDocument.documentElement.clientHeight;
      const x = Math.min(Math.max(rect.left + rect.width / 2, 1), viewportWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 1), viewportHeight - 1);
      const hit = element.ownerDocument.elementFromPoint(x, y);

      expect(
        hit === element || Boolean(hit && element.contains(hit)),
        `${label} center is not covered`,
      ).to.equal(true);
    });
};

const screenshotName = (viewportName: string, pageName: string) => (
  `p0-ui-qa/${viewportName}-${pageName}`
);

describe('P0 UI browser QA', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
  });

  viewports.forEach(({ name, width, height }) => {
    context(name, () => {
      beforeEach(() => {
        cy.viewport(width, height);
      });

      it('checks /home layout and primary CTA', () => {
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
        cy.wait('@getHomeWidgets');

        assertViewportSize(width, height);
        cy.get('[data-testid="home-secondary-prediction-cta"]').should('be.visible');
        assertNoHorizontalOverflow();
        assertMinTarget('[data-testid="home-secondary-prediction-cta"]', 'home primary prediction CTA');
        assertMinTarget('[data-testid="home-date-prev"]', 'home previous date');
        assertMinTarget('[data-testid="home-date-next"]', 'home next date');
        assertCenterReachable('[data-testid="home-secondary-prediction-cta"]', 'home primary prediction CTA');

        if (width < 768) {
          assertMinTarget('button[aria-label="메뉴 열기"]', 'mobile menu button');
        }

        cy.screenshot(screenshotName(name, 'home'), { capture: 'fullPage', overwrite: true });
      });

      it('checks /mate logged-out entry without list requests', () => {
        cy.intercept('GET', '**/api/parties*', {
          statusCode: 200,
          body: {
            success: true,
            data: {
              content: [],
              totalPages: 0,
              totalElements: 0,
              size: 10,
              number: 0,
            },
          },
        }).as('getMateList');

        visitAsGuest('/mate');

        assertViewportSize(width, height);
        cy.get('[data-testid="mate-logged-out-entry"]').should('be.visible');
        cy.get('[data-testid="mate-login-cta"]').should('be.visible');
        cy.get('@getMateList.all').should('have.length', 0);
        assertNoHorizontalOverflow();
        assertMinTarget('[data-testid="mate-login-cta"]', 'mate login CTA');
        assertCenterReachable('[data-testid="mate-login-cta"]', 'mate login CTA');

        if (width < 768) {
          assertMinTarget('button[aria-label="메뉴 열기"]', 'mobile menu button');
        }

        cy.screenshot(screenshotName(name, 'mate'), { capture: 'fullPage', overwrite: true });
      });

      it('checks /login touch targets', () => {
        visitAsGuest('/login');

        assertViewportSize(width, height);
        cy.get('[data-testid="login-form"]').should('be.visible');
        assertNoHorizontalOverflow();
        assertMinTarget('[data-testid="login-password-visibility"]', 'password visibility button');
        assertMinTarget('label[for="remember-email"]', 'remember email label');
        cy.get('[data-testid="login-password-visibility"]').click({ scrollBehavior: 'center' });
        cy.get('[data-testid="login-password"]').should('have.attr', 'type', 'text');
        cy.get('[data-testid="login-password-visibility"]').click({ scrollBehavior: 'center' });
        cy.get('[data-testid="login-password"]').should('have.attr', 'type', 'password');

        cy.screenshot(screenshotName(name, 'login'), { capture: 'fullPage', overwrite: true });
      });
    });
  });
});
