/// <reference types="cypress" />

import { getHomeAuthRequestTraces, installHomeAuthRequestTrace } from '../support/homePage';

type ViewportCase = {
  label: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  heroFontSize: string;
  visiblePanels: number;
};

const viewportCases: ViewportCase[] = [
  { label: 'mobile', width: 375, height: 812, heroFontSize: '40px', visiblePanels: 1 },
  { label: 'tablet', width: 768, height: 1024, heroFontSize: '48px', visiblePanels: 1 },
  { label: 'desktop', width: 1280, height: 900, heroFontSize: '56px', visiblePanels: 2 },
];

const createMediaQueryList = (query: string, matches: boolean): MediaQueryList =>
  ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

const visitLanding = (options?: { reducedMotion?: boolean; holdDeferredSections?: boolean }) => {
  cy.intercept('GET', '**/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      message: 'Unauthorized',
    },
  }).as('getSessionProfile');

  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      installHomeAuthRequestTrace(win);

      if (!options?.reducedMotion) {
        if (!options?.holdDeferredSections) {
          return;
        }
      }

      const nativeMatchMedia = typeof win.matchMedia === 'function'
        ? win.matchMedia.bind(win)
        : null;

      win.matchMedia = (query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return createMediaQueryList(query, true);
        }

        return nativeMatchMedia
          ? nativeMatchMedia(query)
          : createMediaQueryList(query, false);
      };

      if (options?.holdDeferredSections) {
        class FrozenIntersectionObserver implements IntersectionObserver {
          readonly root = null;
          readonly rootMargin = '0px';
          readonly thresholds = [0];

          disconnect() {}
          observe() {}
          takeRecords() {
            return [];
          }
          unobserve() {}
        }

        win.IntersectionObserver = FrozenIntersectionObserver as unknown as typeof IntersectionObserver;
      }
    },
  });

  cy.getBySel('landing-page').should('be.visible');
  cy.contains('경기 전부터 기록까지 한 번에').should('be.visible');
  cy.get('@getSessionProfile.all').should('have.length', 0);
  getHomeAuthRequestTraces().should('deep.equal', []);
};

const assertNoHorizontalOverflow = () => {
  cy.window().then((win) => {
    const { document } = win;
    expect(document.documentElement.scrollWidth).to.be.at.most(win.innerWidth + 1);
    expect(document.body.scrollWidth).to.be.at.most(win.innerWidth + 1);
  });
};

const assertMinimumTapTarget = (selector: string) => {
  cy.getBySel(selector).should(($button) => {
    const height = $button.outerHeight() ?? 0;
    expect(height).to.be.at.least(44);
  });
};

describe('Landing design system pilot QA', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  viewportCases.forEach(({ label, width, height, heroFontSize, visiblePanels }) => {
    it(`keeps the landing layout stable at ${label}`, () => {
      cy.viewport(width, height);
      visitLanding();

      cy.getBySel('landing-hero').should('be.visible');
      cy.getBySel('landing-capability-showcase').should('exist');
      cy.getBySel('landing-capability-grid').should('exist');
      cy.getBySel('landing-features-deferred').scrollIntoView({ duration: 0 });
      cy.getBySel('landing-features').should('be.visible');
      cy.getBySel('landing-cta').should('be.visible');
      cy.window().then((win) => {
        win.scrollTo(0, 0);
      });

      cy.get('.ds-hero-title').should(($title) => {
        expect(getComputedStyle($title[0]).fontSize).to.equal(heroFontSize);
      });

      cy.getBySel('landing-feature-layout')
        .children(':visible')
        .should('have.length', visiblePanels);

      if (label === 'desktop') {
        cy.getBySel('landing-laptop-mockup').scrollIntoView().should('be.visible');
      } else {
        cy.getBySel('landing-laptop-mockup').should('not.be.visible');
      }

      assertMinimumTapTarget('landing-header-login');
      assertMinimumTapTarget('landing-header-cta');
      assertMinimumTapTarget('landing-hero-cta-primary');
      assertMinimumTapTarget('landing-hero-cta-secondary');
      assertMinimumTapTarget('landing-cta-button');
      assertNoHorizontalOverflow();

      cy.screenshot(`landing-visual-${label}`);
    });
  });

  it('keeps the hero value proposition and product preview inside the first mobile viewport', () => {
    cy.viewport(375, 812);
    visitLanding();

    cy.getBySel('landing-hero').within(() => {
      cy.contains('BEGA').should('be.visible');
      cy.get('.ds-hero-title').should('be.visible');
      cy.get('.ds-section-copy').should('be.visible');
      cy.getBySel('landing-hero-cta-primary').should('be.visible');
      cy.get('.landing-product-showcase').should('be.visible');
    });

    cy.window().then((win) => {
      const viewportBottom = win.innerHeight;

      cy.get('.landing-hero-context').first().should(($kicker) => {
        expect($kicker[0].getBoundingClientRect().top).to.be.lessThan(128);
      });

      cy.get('.landing-hero-panel').should(($preview) => {
        expect($preview[0].getBoundingClientRect().bottom).to.be.at.most(viewportBottom - 12);
      });
    });
  });

  it('uses dark product screenshots across six feature areas', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-capability-showcase').scrollIntoView({ duration: 0 });
    cy.getBySel('landing-capability-grid').find('img').should('have.length', 6);
    cy.getBySel('landing-capability-grid').contains('오늘 경기').should('be.visible');
    cy.getBySel('landing-capability-grid').contains('전력분석실').should('be.visible');
    cy.getBySel('landing-capability-grid').contains('같이가요').should('be.visible');
    cy.getBySel('landing-capability-grid').contains('응원석').should('be.visible');
    cy.getBySel('landing-capability-grid').contains('구장 가이드').should('be.visible');
    cy.getBySel('landing-capability-grid').contains('다이어리').should('be.visible');
  });

  it('uses one primary CTA and sends the secondary CTA to feature exploration', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('[data-cta-priority="primary"]').should('have.length', 1);
    cy.getBySel('landing-hero-cta-secondary')
      .should('contain', '기능 흐름 보기')
      .click();

    cy.location('pathname').should('eq', '/');
    cy.window().its('scrollY').should('be.greaterThan', 120);
    cy.getBySel('landing-features').should('be.visible');
  });

  it('uses a compact skeleton while feature runtime is deferred', () => {
    cy.viewport(375, 812);
    visitLanding({ holdDeferredSections: true });

    cy.getBySel('landing-features-placeholder').should(($placeholder) => {
      expect($placeholder.outerHeight() ?? 0).to.be.at.most(420);
    });
    cy.getBySel('landing-features-placeholder-card').should('have.length.at.least', 3);
  });

  it('keeps feature accordion and preview behavior intact on desktop', () => {
    cy.viewport(1280, 900);
    visitLanding();
    cy.getBySel('landing-features-deferred').scrollIntoView({ duration: 0 });
    cy.getBySel('landing-features').should('be.visible');

    cy.getBySel('landing-laptop-mockup')
      .find('img')
      .should('have.attr', 'alt', '오늘 경기 보드');

    cy.getBySel('landing-feature-card-0')
      .should('have.attr', 'aria-expanded', 'false')
      .focus()
      .should('have.focus')
      .click()
      .should('have.attr', 'aria-expanded', 'true');

    cy.contains('사용 가이드').should('be.visible');

    cy.getBySel('landing-feature-card-3').click().should('have.attr', 'aria-expanded', 'true');
    cy.getBySel('landing-feature-card-0').should('have.attr', 'aria-expanded', 'false');

    cy.getBySel('landing-laptop-mockup')
      .find('img')
      .should('have.attr', 'alt', '전력분석실');
  });

  it('disables landing motion when reduced motion is requested', () => {
    cy.viewport(1280, 900);
    visitLanding({ reducedMotion: true });
    cy.getBySel('landing-features-deferred').scrollIntoView({ duration: 0 });
    cy.getBySel('landing-features').should('be.visible');

    cy.getBySel('landing-laptop-mockup').should(($mockup) => {
      expect(getComputedStyle($mockup[0]).transitionDuration).to.equal('0s');
    });

    cy.getBySel('landing-feature-card-0').focus().click();

    cy.get('.animate-fade-in').first().should(($panel) => {
      expect(getComputedStyle($panel[0]).animationName).to.equal('none');
    });

    cy.getBySel('landing-hero-cta-primary').should(($button) => {
      expect(getComputedStyle($button[0]).transitionDuration).to.equal('0s');
    });
  });
});
