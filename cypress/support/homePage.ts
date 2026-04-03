type HomeUserState = {
  id: number;
  email: string;
  name: string;
  handle: string;
  favoriteTeam: string;
  role: string;
  hasPassword: boolean;
  profileImageUrl: string | null;
};

interface HomeAuthBootstrapMetaSeed {
  version?: number;
  lastSuccessAt?: number | null;
  lastFailureAt?: number | null;
}

interface HomeVisitOptions {
  path?: string;
  token?: string;
  authenticated?: boolean;
  resetStorage?: boolean;
  user?: Partial<HomeUserState>;
  persistedAuthHint?: boolean;
  authBootstrapMeta?: HomeAuthBootstrapMetaSeed | null;
}

type HomeWindowWithAuthTrace = Window & {
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
      profileImageUrl: string | null;
      cheerPoints: number;
    };
  };
  __homeAuthRequestTraces?: Array<{
    transport: 'xhr' | 'fetch';
    method?: string;
    url: string;
    stack?: string;
  }>;
};

const AUTH_BOOTSTRAP_META_KEY = 'auth-bootstrap-meta';
const CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY = 'cypress:skip-public-auth-bootstrap';

const defaultHomeUserState: HomeUserState = {
  id: 123,
  email: 'test@example.com',
  name: 'TestUser',
  handle: 'testuser',
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
};

const buildInjectedAuthProfile = (user?: Partial<HomeUserState>) => ({
  success: true,
  data: {
    id: user?.id ?? defaultHomeUserState.id,
    email: user?.email ?? defaultHomeUserState.email,
    name: user?.name ?? defaultHomeUserState.name,
    handle: (user?.handle ?? defaultHomeUserState.handle).replace(/^@/, ''),
    favoriteTeam: user?.favoriteTeam ?? defaultHomeUserState.favoriteTeam,
    role: user?.role ?? defaultHomeUserState.role,
    hasPassword: user?.hasPassword ?? defaultHomeUserState.hasPassword,
    profileImageUrl: user?.profileImageUrl ?? defaultHomeUserState.profileImageUrl,
    cheerPoints: 0,
  },
});

const seedAuthenticatedHomeState = (
  win: Window,
  token: string,
  user?: Partial<HomeUserState>,
) => {
  (win as HomeWindowWithAuthTrace).__BEGA_TEST_AUTH_PROFILE__ = buildInjectedAuthProfile(user);
  win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
  win.localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: {
        ...defaultHomeUserState,
        ...(user || {}),
      },
      isLoggedIn: true,
      isAdmin: false,
    },
    version: 0,
  }));
  win.localStorage.setItem('accessToken', token);
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
};

const seedHomeAuthBootstrapMeta = (
  win: Window,
  authBootstrapMeta?: HomeAuthBootstrapMetaSeed | null,
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

const seedAnonymousHomeState = (
  win: Window,
  persistedAuthHint = false,
  authBootstrapMeta?: HomeAuthBootstrapMetaSeed | null,
) => {
  delete (win as HomeWindowWithAuthTrace).__BEGA_TEST_AUTH_PROFILE__;
  win.sessionStorage.removeItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY);
  win.localStorage.setItem('auth-storage', JSON.stringify({
    state: {},
    version: 0,
  }));
  win.localStorage.removeItem('accessToken');
  if (persistedAuthHint) {
    win.localStorage.setItem('auth-bootstrap-hint', '1');
  } else {
    win.localStorage.removeItem('auth-bootstrap-hint');
  }
  seedHomeAuthBootstrapMeta(win, authBootstrapMeta);
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
};

export const installHomeAuthRequestTrace = (win: Window) => {
  const typedWin = win as HomeWindowWithAuthTrace;
  if (typedWin.__homeAuthRequestTraces) {
    return;
  }

  typedWin.__homeAuthRequestTraces = [];

  const originalFetch = win.fetch.bind(win);
  win.fetch = async (...args) => {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (url.includes('/api/auth/mypage')) {
      typedWin.__homeAuthRequestTraces?.push({
        transport: 'fetch',
        method: init?.method ?? (input instanceof Request ? input.method : undefined),
        url,
        stack: new Error().stack,
      });
    }
    return originalFetch(...args);
  };

  const xhrPrototype = win.XMLHttpRequest.prototype as XMLHttpRequest['prototype'] & {
    __homeAuthTraceInstalled?: boolean;
    __homeAuthTraceOriginalOpen?: XMLHttpRequest['open'];
  };

  if (xhrPrototype.__homeAuthTraceInstalled) {
    return;
  }

  xhrPrototype.__homeAuthTraceInstalled = true;
  xhrPrototype.__homeAuthTraceOriginalOpen = xhrPrototype.open;
  xhrPrototype.open = function patchedHomeAuthOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: [boolean | undefined, string | undefined, string | undefined]
  ) {
    const normalizedUrl = typeof url === 'string' ? url : url.toString();
    if (normalizedUrl.includes('/api/auth/mypage')) {
      typedWin.__homeAuthRequestTraces?.push({
        transport: 'xhr',
        method,
        url: normalizedUrl,
        stack: new Error().stack,
      });
    }
    return xhrPrototype.__homeAuthTraceOriginalOpen!.call(this, method, url, ...rest);
  };
};

export const visitHomePage = ({
  path = '/home',
  token = 'home-test-token',
  authenticated = true,
  resetStorage = false,
  user,
  persistedAuthHint = false,
  authBootstrapMeta = null,
}: HomeVisitOptions = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      if (resetStorage) {
        win.sessionStorage.clear();
        win.localStorage.clear();
      }

      if (authenticated) {
        seedAuthenticatedHomeState(win, token, user);
      } else {
        seedAnonymousHomeState(win, persistedAuthHint, authBootstrapMeta);
      }

      installHomeAuthRequestTrace(win);
    },
  });

  if (authenticated) {
    cy.setCookie('Authorization', token);
  }
};

export const getHomeAuthRequestTraces = () => (
  cy.window().then((win) => (
    ((win as HomeWindowWithAuthTrace).__homeAuthRequestTraces ?? []).map((trace) => ({
      transport: trace.transport,
      method: trace.method,
      url: trace.url,
      stack: trace.stack,
    }))
  ))
);
