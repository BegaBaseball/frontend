export interface PredictionPathGame {
  gameId: string;
  gameDate: string;
}

interface PredictionAuthBootstrapMetaSeed {
  version?: number;
  lastSuccessAt?: number | null;
  lastFailureAt?: number | null;
}

interface PredictionVisitOptions {
  path?: string;
  token?: string;
  authenticated?: boolean;
  clearAuthState?: boolean;
  persistedAuthHint?: boolean;
  authBootstrapMeta?: PredictionAuthBootstrapMetaSeed | null;
  skipPublicAuthBootstrap?: boolean;
  resetStorage?: boolean;
  onBeforeLoad?: (win: Window) => void;
}

type PredictionWindowWithAuthProfile = Window & {
  __BEGA_TEST_AUTH_PROFILE__?: {
    success: boolean;
    data: {
      id: number;
      email: string;
      name: string;
      handle: string;
      favoriteTeam: string;
      role: string;
      hasPassword: boolean;
      profileImageUrl: null;
      cheerPoints: number;
    };
  };
  __predictionAuthRequestTraces?: Array<{
    transport: 'xhr' | 'fetch';
    method?: string;
    url: string;
    stack?: string;
  }>;
};

const AUTH_BOOTSTRAP_META_KEY = 'auth-bootstrap-meta';
const CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY = 'cypress:skip-public-auth-bootstrap';
const DEFAULT_PREDICTION_SESSION_ALIAS = 'getPredictionSessionProfile';
const DEFAULT_PREDICTION_GUEST_SESSION_ALIAS = 'getPredictionGuestSessionProfile';
const PREDICTION_SESSION_URL_MATCHER = /\/api\/auth\/mypage(?:\?.*)?$/;

const defaultPredictionAuthProfile = {
  success: true,
  data: {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: 'testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
    cheerPoints: 0,
  },
};

const defaultPredictionAuthState = {
  state: {
    user: {
      id: 123,
      email: 'test@example.com',
      name: 'TestUser',
      handle: 'testuser',
      favoriteTeam: 'HH',
      role: 'ROLE_USER',
      hasPassword: true,
      profileImageUrl: null,
    },
    isLoggedIn: true,
    isAdmin: false,
  },
  version: 0,
};

export const buildDefaultPredictionPath = (games: PredictionPathGame[]): string => {
  const firstGame = games[0];
  if (!firstGame) {
    return '/prediction';
  }

  const params = new URLSearchParams({
    gameId: firstGame.gameId,
    date: firstGame.gameDate,
  });

  return `/prediction?${params.toString()}`;
};

const seedPredictionAuthBootstrapMeta = (
  win: Window,
  authBootstrapMeta?: PredictionAuthBootstrapMetaSeed | null,
) => {
  if (!authBootstrapMeta) {
    win.localStorage.removeItem(AUTH_BOOTSTRAP_META_KEY);
    return;
  }

  win.localStorage.setItem(AUTH_BOOTSTRAP_META_KEY, JSON.stringify({
    version: authBootstrapMeta.version ?? 1,
    lastSuccessAt: authBootstrapMeta.lastSuccessAt ?? null,
    lastFailureAt: authBootstrapMeta.lastFailureAt ?? null,
  }));
};

const seedPredictionAuthState = (
  win: Window,
  token: string,
  persistedAuthHint: boolean,
  authBootstrapMeta?: PredictionAuthBootstrapMetaSeed | null,
) => {
  (win as PredictionWindowWithAuthProfile).__BEGA_TEST_AUTH_PROFILE__ = defaultPredictionAuthProfile;
  win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
  win.localStorage.setItem('auth-storage', JSON.stringify(defaultPredictionAuthState));
  win.localStorage.setItem('accessToken', token);
  if (persistedAuthHint) {
    win.localStorage.setItem('auth-bootstrap-hint', '1');
  } else {
    win.localStorage.removeItem('auth-bootstrap-hint');
  }
  seedPredictionAuthBootstrapMeta(win, authBootstrapMeta);
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
};

const seedPredictionGuestState = (
  win: Window,
  clearAuthState: boolean,
  persistedAuthHint: boolean,
  skipPublicAuthBootstrap: boolean,
  authBootstrapMeta?: PredictionAuthBootstrapMetaSeed | null,
) => {
  if (clearAuthState) {
    win.sessionStorage.clear();
  }
  delete (win as PredictionWindowWithAuthProfile).__BEGA_TEST_AUTH_PROFILE__;
  if (skipPublicAuthBootstrap) {
    win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
  } else {
    win.sessionStorage.removeItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY);
  }
  win.localStorage.removeItem('auth-storage');
  win.localStorage.removeItem('accessToken');
  if (persistedAuthHint) {
    win.localStorage.setItem('auth-bootstrap-hint', '1');
  } else {
    win.localStorage.removeItem('auth-bootstrap-hint');
  }
  seedPredictionAuthBootstrapMeta(win, authBootstrapMeta);
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
};

const installPredictionAuthRequestTrace = (win: Window) => {
  const typedWin = win as PredictionWindowWithAuthProfile;
  const typedGlobalWin = win as Window & typeof globalThis;
  type XhrOpen = (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) => void;
  if (typedWin.__predictionAuthRequestTraces) {
    return;
  }

  typedWin.__predictionAuthRequestTraces = [];

  const originalFetch = win.fetch.bind(win);
  win.fetch = async (...args) => {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (url.includes('/api/auth/mypage')) {
      typedWin.__predictionAuthRequestTraces?.push({
        transport: 'fetch',
        method: init?.method ?? (input instanceof Request ? input.method : undefined),
        url,
        stack: new Error().stack,
      });
    }
    return originalFetch(...args);
  };

  const xhrPrototype = typedGlobalWin.XMLHttpRequest.prototype as typeof globalThis.XMLHttpRequest.prototype & {
    __predictionAuthTraceInstalled?: boolean;
    __predictionAuthTraceOriginalOpen?: XhrOpen;
  };

  if (xhrPrototype.__predictionAuthTraceInstalled) {
    return;
  }

  xhrPrototype.__predictionAuthTraceInstalled = true;
  xhrPrototype.__predictionAuthTraceOriginalOpen = xhrPrototype.open as XhrOpen;
  xhrPrototype.open = function patchedPredictionAuthOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const normalizedUrl = typeof url === 'string' ? url : url.toString();
    if (normalizedUrl.includes('/api/auth/mypage')) {
      typedWin.__predictionAuthRequestTraces?.push({
        transport: 'xhr',
        method,
        url: normalizedUrl,
        stack: new Error().stack,
      });
    }
    if (typeof async === 'boolean') {
      return xhrPrototype.__predictionAuthTraceOriginalOpen!.call(this, method, url, async, username, password);
    }

    return xhrPrototype.__predictionAuthTraceOriginalOpen!.call(this, method, url);
  };
};

export const visitPredictionPage = ({
  path = '/prediction',
  token = 'prediction-test-token',
  authenticated = true,
  clearAuthState = false,
  persistedAuthHint = false,
  authBootstrapMeta = null,
  skipPublicAuthBootstrap = false,
  resetStorage = false,
  onBeforeLoad,
}: PredictionVisitOptions = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      if (resetStorage) {
        win.sessionStorage.clear();
        win.localStorage.clear();
      }

      if (authenticated) {
        seedPredictionAuthState(win, token, persistedAuthHint, authBootstrapMeta);
      } else {
        seedPredictionGuestState(win, clearAuthState, persistedAuthHint, skipPublicAuthBootstrap, authBootstrapMeta);
      }

      installPredictionAuthRequestTrace(win);

      onBeforeLoad?.(win);

      win.addEventListener('auth-session-expired', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    },
  });

  if (authenticated) {
    cy.window().then((win) => {
      seedPredictionAuthState(win, token, persistedAuthHint, authBootstrapMeta);
    });
    cy.setCookie('Authorization', token);
    return;
  }

  cy.window().then((win) => {
    seedPredictionGuestState(win, clearAuthState, persistedAuthHint, skipPublicAuthBootstrap, authBootstrapMeta);
  });
};

export const visitPredictionPublicPage = ({
  path = '/prediction',
  persistedAuthHint = false,
  authBootstrapMeta = null,
  skipPublicAuthBootstrap = false,
  resetStorage = false,
  onBeforeLoad,
}: Omit<PredictionVisitOptions, 'authenticated' | 'clearAuthState' | 'token'> = {}) => (
  visitPredictionPage({
    path,
    authenticated: false,
    clearAuthState: true,
    persistedAuthHint,
    authBootstrapMeta,
    skipPublicAuthBootstrap,
    resetStorage,
    onBeforeLoad,
  })
);

export const installPredictionAuthenticatedSessionIntercept = (
  alias = DEFAULT_PREDICTION_SESSION_ALIAS,
) => {
  cy.intercept(PREDICTION_SESSION_URL_MATCHER, {
    statusCode: 200,
    body: defaultPredictionAuthProfile,
  }).as(alias);
};

export const installPredictionGuestSessionIntercept = (
  alias = DEFAULT_PREDICTION_GUEST_SESSION_ALIAS,
) => {
  cy.intercept(PREDICTION_SESSION_URL_MATCHER, {
    statusCode: 401,
    body: {
      message: 'Unauthorized',
    },
  }).as(alias);
};

export const getPredictionAuthRequestTraces = () => (
  cy.window().then((win) => (
    ((win as PredictionWindowWithAuthProfile).__predictionAuthRequestTraces ?? []).map((trace) => ({
      transport: trace.transport,
      method: trace.method,
      url: trace.url,
      stack: trace.stack,
    }))
  ))
);

export const ensureCoachBriefingVisible = () => {
  const advanceTime = (ms: number) => {
    cy.window().then((win) => {
      const hasFakeClock = Boolean((win.setTimeout as typeof win.setTimeout & { clock?: unknown }).clock);
      if (hasFakeClock) {
        cy.tick(ms, { log: false });
        cy.wait(200, { log: false });
        return;
      }
      cy.wait(ms, { log: false });
    });
  };

  const probeCoachBriefing = (remainingAttempts = 20): Cypress.Chainable => {
    return cy.get('body', { timeout: 20000 }).then(($body) => {
      const coachBriefingCard = $body.find('[data-testid="coach-briefing-card"]').first();
      if (coachBriefingCard.length > 0) {
        return cy.wrap(coachBriefingCard).scrollIntoView().should('be.visible');
      }

      const detailButton = [...$body.find('button')].find((button) => (
        button.textContent?.includes('경기 상세 보기')
      ));

      if (detailButton) {
        cy.wrap(detailButton).click({ force: true });
      }

      if (remainingAttempts <= 0) {
        return;
      }

      advanceTime(detailButton ? 1800 : 1000);
      return probeCoachBriefing(remainingAttempts - 1);
    });
  };

  advanceTime(100);
  probeCoachBriefing();
  cy.get('body', { timeout: 20000 }).should('not.contain.text', '경기 카드를 준비하고 있습니다.');
  return cy.get('[data-testid="coach-briefing-card"]', { timeout: 20000 }).scrollIntoView().should('be.visible');
};

export const waitForPredictionVoteBootstrap = () => {
  cy.wait(['@getVoteStatus', '@getUserVotes']);
  cy.get('@getUserVote.all').should('have.length', 0);
};
