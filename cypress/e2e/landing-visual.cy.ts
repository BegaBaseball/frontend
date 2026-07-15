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

const contrastAgainstWhite = (color: string) => {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${color}`);

  const luminance = channels
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

  return 1.05 / (luminance + 0.05);
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

  it('renders the first three numbered feature stories and their approved examples', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-feature-01').scrollIntoView();
    cy.getBySel('landing-feature-01').contains('오늘의 KBO').should('be.visible');
    cy.getBySel('landing-feature-02').scrollIntoView();
    cy.getBySel('landing-feature-02').contains('감이 아니라 데이터로').should('be.visible');
    cy.getBySel('landing-feature-03').scrollIntoView();
    cy.getBySel('landing-feature-03').contains('우리 팀의 순간을').should('be.visible');
    cy.get('[data-testid^="landing-feature-0"]')
      .then(($features) => [...$features].map((feature) => feature.dataset.testid))
      .should('deep.equal', [
        'landing-feature-01',
        'landing-feature-02',
        'landing-feature-03',
      ]);
    cy.getBySel('landing-feature-01').contains('LIVE · 7회말 · 잠실').should('be.visible');
    cy.getBySel('landing-feature-02').contains('64%').should('be.visible');
    cy.getBySel('landing-feature-03').contains('직관러버').should('be.visible');
  });

  it('keeps score-card team logos decorative when visible text names each team', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-phone-score-row img').should('have.length', 2).each(($logo) => {
      expect($logo).to.have.attr('alt', '');
    });
  });

  it('keeps inactive fixed-light phone tabs at readable contrast', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-phone-tabs').should('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('.landing-phone-tabs span:not(.landing-phone-tab-active)').each(($tab) => {
      const color = getComputedStyle($tab[0]).color;
      expect(contrastAgainstWhite(color), `${$tab.text()} contrast`).to.be.at.least(4.5);
    });
  });

  it('shows the final state and disables looping motion for reduced-motion visitors', () => {
    cy.viewport(1280, 900);
    visitLanding({ reducedMotion: true });

    cy.get('[data-motion-loop]').should(($node) => {
      expect(getComputedStyle($node[0]).animationName).to.equal('none');
    });
    cy.get('[data-reveal]').should('have.css', 'opacity', '1');
    cy.get('.landing-phone-progress [data-bar]').should(($bar) => {
      const style = getComputedStyle($bar[0]);
      expect(style.transitionDuration).to.equal('0s');
      expect(style.transitionDelay).to.equal('0s');
      expect($bar[0].style.width).to.equal('64%');
    });
  });
});
