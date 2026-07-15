/// <reference types="cypress" />

import { getHomeAuthRequestTraces, installHomeAuthRequestTrace } from '../support/homePage';

interface VisitLandingOptions {
  reducedMotion?: boolean;
}

const visitLanding = ({ reducedMotion = false }: VisitLandingOptions = {}) => {
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

      if (reducedMotion) {
        win.matchMedia = (query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        });
      }
    },
  });

  cy.getBySel('landing-page').should('be.visible');
  cy.contains('10개 구단').should('be.visible');
  cy.contains('720경기의 시즌').should('be.visible');
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

describe('Landing hero and ticker foundation', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('renders the CTA-free season hero and score ticker', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-score-ticker').should('be.visible');
    cy.getBySel('landing-team-row').find('img').should('have.length', 10);
    assertNoHorizontalOverflow();
  });

  it('lets visitors pause and resume the score ticker', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-ticker-toggle').should('have.text', '티커 일시정지');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running');
    cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'false').click();
    cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'true').and('contain', '재생');
    cy.getBySel('landing-ticker-toggle').should('have.text', '티커 재생');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'paused');

    cy.getBySel('landing-ticker-toggle').click();
    cy.getBySel('landing-ticker-toggle')
      .should('have.attr', 'aria-pressed', 'false')
      .and('have.text', '티커 일시정지');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running');
  });

  it('aligns the duplicated ticker groups at the loop endpoint', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-ticker-track').should(($track) => {
      const [animation] = $track[0].getAnimations();
      const keyframes = (animation.effect as KeyframeEffect).getKeyframes();
      expect(keyframes[keyframes.length - 1].transform).to.equal(
        'translateX(calc(-50% - 22px))',
      );
    });
  });

  it('omits navigation and calls to action', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('[data-testid^="landing-header-"]').should('not.exist');
    cy.get('[data-testid*="cta"]').should('not.exist');
    cy.get('footer').should('not.exist');
  });

  it('renders the app preview as a code-rendered phone', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-app-preview').scrollIntoView().should('be.visible');
    cy.getBySel('landing-phone').should('be.visible');
    cy.getBySel('landing-phone').contains('오늘의 승리 확률').should('be.visible');
    cy.getBySel('landing-phone').contains('같이가요').should('be.visible');
    cy.getBySel('landing-page').find('img[src*="landing-showcase-"]').should('not.exist');
  });

  it('shows the final state and disables looping motion for reduced-motion visitors', () => {
    cy.viewport(1280, 900);
    visitLanding({ reducedMotion: true });

    cy.get('[data-motion-loop]').should(($node) => {
      expect(getComputedStyle($node[0]).animationName).to.equal('none');
    });
    cy.get('[data-reveal]').should('have.css', 'opacity', '1');
  });
});
