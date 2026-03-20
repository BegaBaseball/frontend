/// <reference types="cypress" />

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

const visitLanding = (options?: { reducedMotion?: boolean }) => {
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

      if (!options?.reducedMotion) {
        return;
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
    },
  });

  cy.getBySel('landing-page').should('be.visible');
  cy.contains('야구를 더').should('be.visible');
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
      cy.getBySel('landing-features').should('be.visible');
      cy.getBySel('landing-cta').should('be.visible');

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

  it('keeps feature accordion and scroll mockup behavior intact on desktop', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-feature-card-0')
      .should('have.attr', 'aria-expanded', 'false')
      .focus()
      .should('have.focus')
      .click()
      .should('have.attr', 'aria-expanded', 'true');

    cy.contains('사용 가이드').should('be.visible');

    cy.getBySel('landing-feature-card-3').click().should('have.attr', 'aria-expanded', 'true');
    cy.getBySel('landing-feature-card-0').should('have.attr', 'aria-expanded', 'false');
    cy.contains('전력분석실').scrollIntoView();

    let initialOffsetStyle = '';
    cy.getBySel('landing-laptop-mockup')
      .invoke('attr', 'style')
      .then((style) => {
        initialOffsetStyle = style ?? '';
      });

    cy.contains('같이가요').scrollIntoView();
    cy.wait(250);

    cy.getBySel('landing-laptop-mockup')
      .invoke('attr', 'style')
      .should((style) => {
        expect(style).to.not.equal(initialOffsetStyle);
        expect(style ?? '').to.match(/--landing-scroll-offset:\s*(?!0px\b)\d+/);
      });
  });

  it('disables landing motion when reduced motion is requested', () => {
    cy.viewport(1280, 900);
    visitLanding({ reducedMotion: true });

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
