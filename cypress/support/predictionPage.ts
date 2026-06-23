export interface PredictionPathGame {
  gameId: string;
  gameDate: string;
}

export type PredictionBootstrapFixtureGame = PredictionPathGame & Record<string, unknown>;

interface PredictionAuthBootstrapMetaSeed {
  version?: number;
  lastSuccessAt?: number | null;
  lastFailureAt?: number | null;
}

type PredictionBootstrapFixtureValue<T = unknown> = T | {
  ok: boolean;
  data: T | null;
  error: {
    message: string;
    status?: number | null;
    code?: string;
  } | null;
};

interface PredictionBootstrapInterceptOptions {
  alias?: string;
  games?: PredictionBootstrapFixtureGame[] | ((url: URL) => PredictionBootstrapFixtureGame[]);
  detailByGameId?: Record<string, PredictionBootstrapFixtureValue> | ((gameId: string | null, url: URL) => PredictionBootstrapFixtureValue | undefined);
  voteStatusByGameId?: Record<string, PredictionBootstrapFixtureValue> | ((gameId: string | null, url: URL) => PredictionBootstrapFixtureValue | undefined);
  statusCode?: number | (() => number);
  errorBody?: unknown | (() => unknown);
  unknownDateStatusCode?: number;
  selectedGameId?: string | ((url: URL, games: PredictionBootstrapFixtureGame[]) => string | null);
  selectedGameFound?: boolean | ((selectedGameId: string | null, games: PredictionBootstrapFixtureGame[]) => boolean);
}

interface PredictionVoteBootstrapWaitOptions {
  waitForVoteStatus?: boolean;
  waitForUserVotes?: boolean;
  voteStatusAlias?: string;
  userVotesAlias?: string;
  legacyUserVoteAlias?: string;
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

const resolveFixtureValue = <T,>(value: T | (() => T)): T => (
  typeof value === 'function' ? (value as () => T)() : value
);

const groupPredictionBootstrapGamesByDate = (games: PredictionBootstrapFixtureGame[]) => (
  games.reduce<Record<string, PredictionBootstrapFixtureGame[]>>((acc, game) => {
    const date = game.gameDate?.trim();
    if (!date) {
      return acc;
    }

    acc[date] = [...(acc[date] || []), game];
    return acc;
  }, {})
);

const normalizePredictionBootstrapResource = (
  value: PredictionBootstrapFixtureValue | undefined
) => {
  if (value === undefined) {
    return null;
  }

  if (
    value
    && typeof value === 'object'
    && 'ok' in value
    && 'data' in value
    && 'error' in value
  ) {
    return value;
  }

  return {
    ok: true,
    data: value ?? null,
    error: null,
  };
};

export const installPredictionBootstrapIntercept = ({
  alias = 'getPredictionBootstrap',
  games = [],
  detailByGameId = {},
  voteStatusByGameId = {},
  statusCode = 200,
  errorBody = { message: 'prediction bootstrap fixture failed' },
  unknownDateStatusCode = 404,
  selectedGameId,
  selectedGameFound,
}: PredictionBootstrapInterceptOptions = {}) => {
  cy.intercept('GET', '**/api/predictions/bootstrap*', (req) => {
    const resolvedStatusCode = resolveFixtureValue(statusCode);
    if (resolvedStatusCode !== 200) {
      req.reply({
        statusCode: resolvedStatusCode,
        body: resolveFixtureValue(errorBody),
      });
      return;
    }

    const url = new URL(req.url);
    const requestedDate = url.searchParams.get('date')?.trim() || '';
    const fixtureGames = typeof games === 'function' ? games(url) : games;
    const gamesByDate = groupPredictionBootstrapGamesByDate(fixtureGames);
    const dates = Object.keys(gamesByDate).sort();
    const date = requestedDate || dates[0] || '';
    const dayGames = gamesByDate[date];

    if (!dayGames) {
      req.reply({
        statusCode: unknownDateStatusCode,
        body: {
          message: `No prediction bootstrap fixture for ${date || 'unknown date'}`,
        },
      });
      return;
    }

    const requestedGameId = url.searchParams.get('gameId')?.trim() || null;
    const resolvedSelectedGameId = typeof selectedGameId === 'function'
      ? selectedGameId(url, dayGames)
      : (selectedGameId || requestedGameId || dayGames[0]?.gameId || null);
    const resolvedSelectedGameFound = typeof selectedGameFound === 'function'
      ? selectedGameFound(resolvedSelectedGameId, dayGames)
      : (selectedGameFound ?? Boolean(
        resolvedSelectedGameId
        && dayGames.some((game) => game.gameId === resolvedSelectedGameId)
      ));
    const selectedDetail = resolvedSelectedGameFound && resolvedSelectedGameId
      ? (typeof detailByGameId === 'function'
        ? detailByGameId(resolvedSelectedGameId, url)
        : detailByGameId[resolvedSelectedGameId])
      : undefined;
    const selectedVoteStatus = resolvedSelectedGameFound && resolvedSelectedGameId
      ? (typeof voteStatusByGameId === 'function'
        ? voteStatusByGameId(resolvedSelectedGameId, url)
        : voteStatusByGameId[resolvedSelectedGameId])
      : undefined;
    const currentDateIndex = dates.indexOf(date);

    req.reply({
      statusCode: 200,
      body: {
        schedule: {
          date,
          games: dayGames,
          prevDate: currentDateIndex > 0 ? dates[currentDateIndex - 1] : null,
          nextDate: currentDateIndex >= 0 && currentDateIndex < dates.length - 1 ? dates[currentDateIndex + 1] : null,
          hasPrev: currentDateIndex > 0,
          hasNext: currentDateIndex >= 0 && currentDateIndex < dates.length - 1,
        },
        selectedGameId: resolvedSelectedGameId,
        selectedGameFound: resolvedSelectedGameFound,
        detail: normalizePredictionBootstrapResource(selectedDetail),
        voteStatus: normalizePredictionBootstrapResource(selectedVoteStatus),
      },
    });
  }).as(alias);
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
  skipPublicAuthBootstrap = false,
) => {
  (win as PredictionWindowWithAuthProfile).__BEGA_TEST_AUTH_PROFILE__ = defaultPredictionAuthProfile;
  if (skipPublicAuthBootstrap) {
    win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
  } else {
    win.sessionStorage.removeItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY);
  }
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
        seedPredictionAuthState(win, token, persistedAuthHint, authBootstrapMeta, skipPublicAuthBootstrap);
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
      seedPredictionAuthState(win, token, persistedAuthHint, authBootstrapMeta, skipPublicAuthBootstrap);
    });
    cy.setCookie('Authorization', token);
  }
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

export const waitForPredictionVoteBootstrap = ({
  waitForVoteStatus = true,
  waitForUserVotes = true,
  voteStatusAlias = 'getVoteStatus',
  userVotesAlias = 'getUserVotes',
  legacyUserVoteAlias = 'getUserVote',
}: PredictionVoteBootstrapWaitOptions = {}) => {
  const aliases: string[] = [];
  if (waitForVoteStatus) {
    aliases.push(`@${voteStatusAlias}`);
  }
  if (waitForUserVotes) {
    aliases.push(`@${userVotesAlias}`);
  }

  if (aliases.length === 1) {
    cy.wait(aliases[0]);
  } else if (aliases.length > 1) {
    cy.wait(aliases);
  }

  cy.get(`@${legacyUserVoteAlias}.all`).should('have.length', 0);
};
