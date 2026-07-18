/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const desktopBoundaryWidths = [768, 820, 920];
const spaciousDesktopWidths = [1280, 1440];
const NAVBAR_READY_TIMEOUT_MS = 20000;
const NAVBAR_MODULE_PREWARM_TIMEOUT_MS = 10000;
const NAVBAR_PREWARM_POLL_MS = 100;

const visibleDirectChildren = ($capsule: JQuery<HTMLElement>) => (
  [...$capsule[0].children].filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || '1') > 0.01
      && rect.width > 0
      && rect.height > 0;
  })
);

const assertNavbarCapsuleContainsChrome = (label: string) => {
  cy.get('[data-testid="navbar-capsule"]')
    .should('be.visible')
    .then(($capsule) => {
      const capsuleRect = $capsule[0].getBoundingClientRect();
      const overflowLabels = visibleDirectChildren($capsule)
        .filter((element) => {
          const rect = element.getBoundingClientRect();

          return rect.left < capsuleRect.left - 0.5
            || rect.right > capsuleRect.right + 0.5
            || rect.top < capsuleRect.top - 0.5
            || rect.bottom > capsuleRect.bottom + 0.5;
        })
        .map((element) => (
          element.getAttribute('aria-label')
          || element.textContent?.replace(/\s+/g, ' ').trim()
          || element.tagName
        ));

      expect(overflowLabels, `${label} direct child overflow`).to.deep.equal([]);

      const desktopNav = $capsule[0].querySelector('nav[aria-label="주 메뉴"]');
      const rightControls = $capsule[0].lastElementChild;
      if (desktopNav && rightControls) {
        const navRect = desktopNav.getBoundingClientRect();
        const rightControlsRect = rightControls.getBoundingClientRect();

        expect(navRect.right, `${label} desktop nav/right controls overlap`)
          .to.be.at.most(rightControlsRect.left + 0.5);
      }
    });
};

const assertNavbarReadableAtSpaciousWidth = (label: string) => {
  cy.contains('[data-testid="navbar-capsule"] p', 'BASEBALL GUIDE')
    .should('be.visible')
    .then(($subtitle) => {
      const element = $subtitle[0];

      expect(element.scrollHeight, `${label} logo subtitle is not clipped`)
        .to.be.at.most(element.clientHeight + 1);
    });

  cy.get('[data-testid="navbar-capsule"] nav[aria-label="주 메뉴"] button')
    .should('have.length.at.least', 4)
    .each(($button) => {
      const fontSize = parseFloat(getComputedStyle($button[0]).fontSize);

      expect(fontSize, `${label} menu font size`).to.be.at.least(15);
    });
};

const assertLogoutIconCentered = (label: string) => {
  cy.get('button[aria-label="로그아웃"]')
    .should('be.visible')
    .then(($button) => {
      const buttonRect = $button[0].getBoundingClientRect();
      const icon = $button[0].querySelector('svg');
      expect(icon, `${label} logout icon`).to.exist;

      const iconRect = icon!.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + (buttonRect.width / 2);
      const buttonCenterY = buttonRect.top + (buttonRect.height / 2);
      const iconCenterX = iconRect.left + (iconRect.width / 2);
      const iconCenterY = iconRect.top + (iconRect.height / 2);

      expect(Math.abs(buttonCenterX - iconCenterX), `${label} logout icon x-center delta`)
        .to.be.at.most(1);
      expect(Math.abs(buttonCenterY - iconCenterY), `${label} logout icon y-center delta`)
        .to.be.at.most(1);
    });
};

const assertLogoutIconVerticallyCentered = (label: string) => {
  cy.get('button[aria-label="로그아웃"]')
    .should('be.visible')
    .then(($button) => {
      const buttonRect = $button[0].getBoundingClientRect();
      const icon = $button[0].querySelector('svg');
      expect(icon, `${label} logout icon`).to.exist;

      const iconRect = icon!.getBoundingClientRect();
      const buttonCenterY = buttonRect.top + (buttonRect.height / 2);
      const iconCenterY = iconRect.top + (iconRect.height / 2);

      expect(Math.abs(buttonCenterY - iconCenterY), `${label} logout icon y-center delta`)
        .to.be.at.most(1);
    });
};

const assertLogoutButtonVerticallyCenteredInCapsule = (label: string) => {
  cy.get('[data-testid="navbar-capsule"]').then(($capsule) => {
    const capsuleRect = $capsule[0].getBoundingClientRect();
    const capsuleCenterY = capsuleRect.top + (capsuleRect.height / 2);

    cy.get('button[aria-label="로그아웃"]')
      .should('be.visible')
      .then(($button) => {
        const buttonRect = $button[0].getBoundingClientRect();
        const buttonCenterY = buttonRect.top + (buttonRect.height / 2);

        expect(Math.abs(capsuleCenterY - buttonCenterY), `${label} logout button y-center delta`)
          .to.be.at.most(1);
      });
  });
};

const waitForNavbarReady = ({ authenticated }: { authenticated: boolean }) => {
  waitForNavbarCapsuleOrLoadingShell().then(($body) => {
    if ($body.find('[data-testid="navbar-capsule"]').length === 0) {
      cy.reload();
    }
  });

  cy.get('[data-testid="navbar-capsule"]', { timeout: NAVBAR_READY_TIMEOUT_MS }).should('be.visible');

  if (authenticated) {
    cy.get('button[aria-label="로그아웃"]', { timeout: NAVBAR_READY_TIMEOUT_MS }).should('be.visible');
    return;
  }

  cy.contains('[data-testid="navbar-auth-controls"] button', '로그인', { timeout: NAVBAR_READY_TIMEOUT_MS })
    .should('be.visible');
};

const hasKnownNavbarLoadingShell = ($body: JQuery<HTMLElement>) => (
  ($body[0].textContent || '').includes('페이지를 준비하고 있습니다.')
  || [...$body[0].querySelectorAll('div')].some((element) => (
    element.classList.contains('h-16')
    && element.classList.contains('border-b')
    && element.classList.contains('backdrop-blur-md')
  ))
);

const waitForNavbarCapsuleOrLoadingShell = (
  startedAt = Date.now(),
): Cypress.Chainable<JQuery<HTMLElement>> => (
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    if ($body.find('[data-testid="navbar-capsule"]').length > 0) {
      return cy.wrap($body, { log: false });
    }

    const hasLoadingShell = hasKnownNavbarLoadingShell($body);
    const elapsedMs = Date.now() - startedAt;
    if (hasLoadingShell && elapsedMs >= NAVBAR_MODULE_PREWARM_TIMEOUT_MS) {
      return cy.wrap($body, { log: false });
    }

    if (elapsedMs >= NAVBAR_MODULE_PREWARM_TIMEOUT_MS) {
      return cy.wrap($body, { log: false });
    }

    return cy.wait(NAVBAR_PREWARM_POLL_MS).then(
      (): Cypress.Chainable<JQuery<HTMLElement>> => waitForNavbarCapsuleOrLoadingShell(startedAt)
    );
  })
);

const warmNavbarRouteModules = () => {
  cy.viewport(1024, 720);
  cy.mockAPI();
  visitHomePage({
    path: '/home',
    authenticated: true,
    resetStorage: true,
  });

  waitForNavbarReady({ authenticated: true });
};

const waitForScrolledNavbarLayout = () => {
  cy.get('[data-testid="navbar-capsule"]', { timeout: 5000 }).should(($capsule) => {
    const capsuleRect = $capsule[0].getBoundingClientRect();

    expect(capsuleRect.height, 'scrolled navbar capsule height')
      .to.be.at.most(58);
  });
};

const scrollNavbarToCompact = () => {
  cy.document().then((document) => {
    document.documentElement.style.minHeight = '1800px';
    document.body.style.minHeight = '1800px';
  });

  cy.scrollTo(0, 0, { duration: 0 });
  cy.window().its('scrollY').should('equal', 0);
  cy.wait(50);
  cy.scrollTo(0, 720, { duration: 0 });
  cy.window().its('scrollY').should('be.gte', 180);
  waitForScrolledNavbarLayout();
};

const assertCapsuleShrinksOnScroll = (label: string) => {
  cy.scrollTo(0, 0, { duration: 0 });
  cy.window().its('scrollY').should('equal', 0);

  cy.get('[data-testid="navbar-capsule"]')
    .should('be.visible')
    .then(($capsule) => {
      const initialWidth = $capsule[0].getBoundingClientRect().width;

      scrollNavbarToCompact();

      cy.get('[data-testid="navbar-capsule"]').then(($scrolledCapsule) => {
        const scrolledWidth = $scrolledCapsule[0].getBoundingClientRect().width;

        expect(initialWidth - scrolledWidth, `${label} capsule width reduction`)
          .to.be.at.least(120);
      });
    });
};

const assertScrolledNavbarMenuBalanced = (label: string) => {
  scrollNavbarToCompact();

  cy.get('[data-testid="navbar-capsule"]').should(($capsule) => {
    const capsuleRect = $capsule[0].getBoundingClientRect();
    const capsuleCenterX = capsuleRect.left + (capsuleRect.width / 2);
    const navSegment = $capsule[0].querySelector<HTMLElement>('nav[aria-label="주 메뉴"] > div');
    expect(navSegment, `${label} nav segment`).to.exist;

    const navSegmentRect = navSegment!.getBoundingClientRect();
    const navSegmentCenterX = navSegmentRect.left + (navSegmentRect.width / 2);

    expect(navSegmentRect.top, `${label} nav segment top inside capsule`)
      .to.be.at.least(capsuleRect.top + 1);
    expect(navSegmentRect.bottom, `${label} nav segment bottom inside capsule`)
      .to.be.at.most(capsuleRect.bottom - 1);
    expect(navSegmentRect.height / capsuleRect.height, `${label} nav segment height ratio`)
      .to.be.at.most(0.72);
    expect(Math.abs(navSegmentCenterX - capsuleCenterX), `${label} nav segment center delta`)
      .to.be.at.most(2);
  });
};

const assertScrolledLoggedInAuthControlsContained = (label: string) => {
  scrollNavbarToCompact();

  cy.get('[data-testid="navbar-capsule"]').should(($capsule) => {
    const capsuleRect = $capsule[0].getBoundingClientRect();
    const authControls = $capsule[0].querySelector<HTMLElement>('[data-testid="navbar-auth-controls"]');
    const logoutButton = $capsule[0].querySelector<HTMLElement>('button[aria-label="로그아웃"]');

    expect(capsuleRect.width, `${label} compact logged-in capsule reserved width`)
      .to.be.at.least(1030);
    expect(authControls, `${label} auth controls`).to.exist;
    expect(logoutButton, `${label} logout button`).to.exist;

    [authControls!, logoutButton!].forEach((element) => {
      const rect = element.getBoundingClientRect();
      const name = element.getAttribute('data-testid') || element.getAttribute('aria-label') || element.tagName;

      expect(rect.left, `${label} ${name} left inside capsule`)
        .to.be.at.least(capsuleRect.left - 0.5);
      expect(rect.right, `${label} ${name} right inside capsule`)
        .to.be.at.most(capsuleRect.right + 0.5);
      expect(rect.top, `${label} ${name} top inside capsule`)
        .to.be.at.least(capsuleRect.top - 0.5);
      expect(rect.bottom, `${label} ${name} bottom inside capsule`)
        .to.be.at.most(capsuleRect.bottom + 0.5);
    });
  });
};

const assertAuthenticatedNavbarAnimationHooks = (label: string) => {
  cy.get('[data-testid="navbar-capsule"]')
    .should('be.visible')
    .then(($capsule) => {
      const durationMs = getComputedStyle($capsule[0]).transitionDuration
        .split(',')
        .map((duration) => duration.trim())
        .map((duration) => (duration.endsWith('ms')
          ? parseFloat(duration)
          : parseFloat(duration) * 1000));

      expect(Math.max(...durationMs), `${label} capsule transition duration`)
        .to.be.at.least(220);
    });

  cy.contains('[data-testid="navbar-capsule"] nav[aria-label="주 메뉴"] button', '같이가요')
    .should('have.attr', 'aria-current', 'page')
    .then(($activeButton) => {
      cy.get('[data-testid="navbar-active-pill"]')
        .should(($pill) => {
          const pillRect = $pill[0].getBoundingClientRect();
          const buttonRect = $activeButton[0].getBoundingClientRect();
          const pillOpacity = parseFloat(getComputedStyle($pill[0]).opacity);

          expect(pillOpacity, `${label} active pill opacity`).to.be.at.least(0.99);
          expect(pillRect.width, `${label} active pill width`).to.be.greaterThan(1);
          expect(Math.abs(pillRect.left - buttonRect.left), `${label} active pill left delta`)
            .to.be.at.most(1);
          expect(Math.abs(pillRect.width - buttonRect.width), `${label} active pill width delta`)
            .to.be.at.most(1);
        });
    });
};

describe('navbar responsive desktop boundary', () => {
  before(() => {
    warmNavbarRouteModules();
  });

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
  });

  desktopBoundaryWidths.forEach((width) => {
    it(`keeps logged-out public navbar chrome inside the capsule at ${width}px`, () => {
      cy.viewport(width, 720);
      visitHomePage({
        path: '/home',
        authenticated: false,
        resetStorage: true,
      });
      waitForNavbarReady({ authenticated: false });

      assertNavbarCapsuleContainsChrome(`logged-out ${width}px`);
    });

    it(`keeps logged-in public navbar chrome inside the capsule at ${width}px`, () => {
      cy.viewport(width, 720);
      visitHomePage({
        path: '/home',
        authenticated: true,
        resetStorage: true,
        user: {
          name: 'VeryLongAdminUserName',
          handle: 'verylongadminuser',
          role: 'ROLE_ADMIN',
        },
      });
      waitForNavbarReady({ authenticated: true });

      assertNavbarCapsuleContainsChrome(`logged-in ${width}px`);
    });
  });

  spaciousDesktopWidths.forEach((width) => {
    it(`keeps logged-in navbar logo and menu readable at ${width}px`, () => {
      cy.viewport(width, 720);
      visitHomePage({
        path: '/home',
        authenticated: true,
        resetStorage: true,
      });
      waitForNavbarReady({ authenticated: true });

      assertNavbarReadableAtSpaciousWidth(`logged-in ${width}px`);
    });
  });

  it('keeps compact logout icon centered in its button at the desktop boundary', () => {
    cy.viewport(768, 720);
    visitHomePage({
      path: '/home',
      authenticated: true,
      resetStorage: true,
      user: {
        name: 'VeryLongAdminUserName',
        handle: 'verylongadminuser',
        role: 'ROLE_ADMIN',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertLogoutIconCentered('logged-in 768px');
  });

  it('keeps expanded logout button vertically centered in the capsule', () => {
    cy.viewport(1440, 720);
    visitHomePage({
      path: '/home',
      authenticated: true,
      resetStorage: true,
      user: {
        name: '테스트',
        handle: 'testuser',
        role: 'ROLE_USER',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertLogoutButtonVerticallyCenteredInCapsule('expanded 1440px');
    assertLogoutIconVerticallyCentered('expanded 1440px');
  });

  it('keeps the logged-in navbar capsule width animation visible on scroll', () => {
    cy.viewport(1440, 720);
    visitHomePage({
      path: '/home',
      authenticated: true,
      resetStorage: true,
      user: {
        name: '테스트',
        handle: 'testuser',
        role: 'ROLE_USER',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertCapsuleShrinksOnScroll('logged-in 1440px');
  });

  it('keeps the scrolled logged-in navbar menu balanced inside the capsule', () => {
    cy.viewport(1440, 720);
    visitHomePage({
      path: '/home',
      authenticated: true,
      resetStorage: true,
      user: {
        name: '테스트',
        handle: 'testuser',
        role: 'ROLE_USER',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertScrolledNavbarMenuBalanced('scrolled logged-in 1440px');
  });

  it('keeps scrolled logged-in auth controls inside the reserved capsule width', () => {
    cy.viewport(1440, 720);
    visitHomePage({
      path: '/home',
      authenticated: true,
      resetStorage: true,
      user: {
        name: 'VeryLongAdminUserName',
        handle: 'verylongadminuser',
        role: 'ROLE_ADMIN',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertScrolledLoggedInAuthControlsContained('scrolled logged-in 1440px');
  });

  it('renders authenticated navbar motion hooks for the active desktop menu', () => {
    cy.viewport(1440, 720);
    visitHomePage({
      path: '/mate/create',
      authenticated: true,
      resetStorage: true,
      user: {
        name: '테스트',
        handle: 'testuser',
        role: 'ROLE_USER',
      },
    });
    waitForNavbarReady({ authenticated: true });

    assertAuthenticatedNavbarAnimationHooks('authenticated mate');
  });
});
