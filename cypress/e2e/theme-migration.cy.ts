/// <reference types="cypress" />

describe('Theme migration and initialization', () => {
  type ThemeSeedState = {
    kbo?: string | null;
    bega?: string | null;
    legacy?: string | null;
  };

  const seedTheme = (
    win: Window,
    theme: ThemeSeedState,
    prefersDark: boolean,
  ) => {
    if (theme.kbo !== undefined) {
      if (theme.kbo === null) {
        win.localStorage.removeItem('kbo-theme');
      } else {
        win.localStorage.setItem('kbo-theme', theme.kbo);
      }
    } else {
      win.localStorage.removeItem('kbo-theme');
    }

    if (theme.bega !== undefined) {
      if (theme.bega === null) {
        win.localStorage.removeItem('bega-theme');
      } else {
        win.localStorage.setItem('bega-theme', theme.bega);
      }
    } else {
      win.localStorage.removeItem('bega-theme');
    }

    if (theme.legacy !== undefined) {
      if (theme.legacy === null) {
        win.localStorage.removeItem('theme');
      } else {
        win.localStorage.setItem('theme', theme.legacy);
      }
    } else {
      win.localStorage.removeItem('theme');
    }

    Object.defineProperty(win, 'matchMedia', {
      configurable: true,
      writable: true,
      value: ((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
      })) as unknown as MediaQueryList,
    });
  };

  const openHomeWithThemeState = (themeState: ThemeSeedState, prefersDark = false) => {
    cy.visit('/home', {
      onBeforeLoad(win) {
        seedTheme(win, themeState, prefersDark);
      },
    });
  };

  const getHomeSurface = () => cy.get('main').find('div.min-h-screen').first();

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
  });

  it('migrates legacy bega-theme (quoted) and applies light mode', () => {
    openHomeWithThemeState({ bega: '"light"', kbo: null, legacy: null }, false);
    cy.document().its('documentElement.classList').invoke('contains', 'light').should('be.true');
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('be.false');
    cy.window().its('localStorage').invoke('getItem', 'kbo-theme').should('eq', 'light');
  });

  it('migrates legacy theme object and applies dark mode', () => {
    openHomeWithThemeState({ legacy: '{"theme":"dark"}', kbo: null, bega: null }, false);
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('be.true');
    cy.document().its('documentElement.classList').invoke('contains', 'light').should('be.false');
    cy.window().its('localStorage').invoke('getItem', 'kbo-theme').should('eq', 'dark');
  });

  it('falls back to system preference when no valid legacy key exists', () => {
    openHomeWithThemeState({ kbo: 'invalid', bega: null, legacy: null }, false);
    cy.document().its('documentElement.classList').invoke('contains', 'light').should('be.true');
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('be.false');
    cy.window().its('localStorage').invoke('getItem', 'kbo-theme').should('be.null');
    cy.window().its('localStorage').invoke('getItem', 'theme').should('be.null');
  });

  it('falls back to dark when system preference is dark and no stored theme', () => {
    openHomeWithThemeState({ kbo: null, bega: null, legacy: null }, true);
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('be.true');
    cy.document().its('documentElement.classList').invoke('contains', 'light').should('be.false');
  });

  it('cleans legacy keys when kbo-theme is invalid', () => {
    openHomeWithThemeState(
      {
        kbo: 'invalid',
        bega: 'invalid',
        legacy: 'invalid',
      },
      false,
    );

    cy.document().its('documentElement.classList').invoke('contains', 'light').should('be.true');
    cy.window().its('localStorage').invoke('getItem', 'kbo-theme').should('be.null');
    cy.window().its('localStorage').invoke('getItem', 'bega-theme').should('be.null');
    cy.window().its('localStorage').invoke('getItem', 'theme').should('be.null');
  });

  it('applies a light surface on home in light mode and a dark surface on home in dark mode', () => {
    let lightSurfaceColor = '';
    openHomeWithThemeState({ kbo: '"light"', bega: null, legacy: null }, false);
    cy.contains('KBO LEAGUE', { timeout: 20000 }).should('be.visible');
    getHomeSurface()
      .should('have.class', 'bg-gray-50')
      .invoke('css', 'background-color')
      .then((color) => {
        lightSurfaceColor = String(color);
      });

    openHomeWithThemeState({ kbo: '"dark"', bega: null, legacy: null }, false);
    cy.contains('KBO LEAGUE', { timeout: 20000 }).should('be.visible');
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('be.true');
    getHomeSurface()
      .should('have.class', 'bg-gray-50')
      .and('have.class', 'dark:bg-background')
      .invoke('css', 'background-color')
      .should('not.eq', lightSurfaceColor);
  });
});
