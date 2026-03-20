describe('Security surface real smoke', () => {
  const fallbackLoginPassword = 'Test1234!';
  const fallbackFavoriteTeam = 'LG';
  type EnvVars = Record<string, unknown>;

  type RequiredPolicy = {
    policyType?: string;
    version?: string;
    required?: boolean;
  };

  const stripTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');
  const getEnvString = (envVars: EnvVars, key: string) => {
    const value = envVars[key];
    return typeof value === 'string' ? value : undefined;
  };
  const getConfiguredEnvVars = (): Cypress.Chainable<EnvVars> => {
    const config = Cypress.config() as unknown as { env?: EnvVars };
    const configuredEnv =
      config.env && typeof config.env === 'object' ? config.env : {};
    return cy.env<EnvVars>([
      'BACKEND_BASE_URL',
      'SMOKE_API_BASE_URL',
      'CYPRESS_BASE_URL',
      'CYPRESS_BACKEND_BASE_URL',
      'VITE_API_BASE_URL',
      'FRONTEND_API_BASE_URL',
      'SMOKE_LOGIN_EMAIL',
      'SMOKE_LOGIN_PASSWORD',
    ]).then((runtimeEnv) => ({
      ...configuredEnv,
      ...(runtimeEnv && typeof runtimeEnv === 'object' ? runtimeEnv : {}),
    }));
  };

  const resolveBaseOrigin = () => {
    const baseUrl = Cypress.config('baseUrl');
    if (!baseUrl) {
      return undefined;
    }

    try {
      return new URL(baseUrl).origin;
    } catch {
      return undefined;
    }
  };

  const normalizeBackendBaseUrl = (value: string | undefined) => {
    if (!value) return undefined;
    const candidate = stripTrailingSlash(value);
    if (!candidate) {
      return undefined;
    }

    const normalizedInput = (() => {
      if (/^https?:\/\//i.test(candidate)) {
        return candidate;
      }

      if (candidate.startsWith('/')) {
        const baseOrigin = resolveBaseOrigin();
        if (!baseOrigin) {
          return undefined;
        }
        return `${baseOrigin}${candidate}`;
      }

      return `http://${candidate}`;
    })();

    if (!normalizedInput) {
      return undefined;
    }

    try {
      const parsed = new URL(normalizedInput);
      const trimmedPath = parsed.pathname.replace(/\/api\/?$/i, '');
      const resolvedPath = trimmedPath === '/' ? '' : trimmedPath;
      return `${parsed.origin}${resolvedPath}`;
    } catch {
      return undefined;
    }
  };

  const buildBackendUrl = (backendBaseUrl: string, path: string) => {
    const safePath = path.startsWith('/') ? path : `/${path}`;
    return `${backendBaseUrl}${safePath}`;
  };

  const resolveBackendBaseUrl = (): Cypress.Chainable<string | undefined> =>
    getConfiguredEnvVars().then((envVars) => {
      const backendBaseUrl =
        normalizeBackendBaseUrl(getEnvString(envVars, 'BACKEND_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'SMOKE_API_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'CYPRESS_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'CYPRESS_BACKEND_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'VITE_API_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'FRONTEND_API_BASE_URL'));

      return cy.wrap(backendBaseUrl, { log: false });
    });

  const isBackendHealthResponse = (response: Cypress.Response<unknown>) => {
    if (![200, 503].includes(response.status)) {
      return false;
    }

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('text/html')) {
      return false;
    }

    const body = response.body;
    if (!body || typeof body !== 'object') {
      return false;
    }

    return typeof (body as { status?: unknown }).status === 'string';
  };

  before(function () {
    return resolveBackendBaseUrl()
      .then(function (backendBaseUrl) {
        if (!backendBaseUrl) {
          cy.log('Skipping security-surface-real: BACKEND_BASE_URL is not available or backend is not reachable.');
          cy.log('Set BACKEND_BASE_URL, CYPRESS_BACKEND_BASE_URL, SMOKE_API_BASE_URL, VITE_API_BASE_URL, or FRONTEND_API_BASE_URL for execution.');
          this.skip();
          return;
        }

        const healthUrl = buildBackendUrl(backendBaseUrl, '/actuator/health');
        return cy.request({
          method: 'GET',
          url: healthUrl,
          failOnStatusCode: false,
        }).then((response) => {
          if (!isBackendHealthResponse(response)) {
            const contentType = String(response.headers['content-type'] || 'unknown');
            throw new Error(`backend health endpoint did not return JSON payload (status=${response.status}, content-type=${contentType}, url=${healthUrl})`);
          }
        });
      });
  });

  const requestBlocked = (method: 'GET' | 'POST', url: string) =>
    resolveBackendBaseUrl().then((backendBaseUrl) => {
      if (!backendBaseUrl) return;
      return cy.request({
        method,
        url: buildBackendUrl(backendBaseUrl, url),
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });
    });

  const loginWithCredentials = (email: string, password: string) => {
    return resolveBackendBaseUrl().then((backendBaseUrl) => {
      if (!backendBaseUrl) return;
      return cy.request({
        method: 'POST',
        url: buildBackendUrl(backendBaseUrl, '/api/auth/login'),
        failOnStatusCode: false,
        body: {
          email,
          password,
        },
      }).then((response) => {
        if (response.status !== 200) {
          return false;
        }

        expect(response.body?.success).to.eq(true);
        return true;
      });
    });
  };

  const resolveRequiredPolicyConsents = () => {
    return resolveBackendBaseUrl().then((backendBaseUrl) => {
      if (!backendBaseUrl) return [];
      return cy.request({
        method: 'GET',
        url: buildBackendUrl(backendBaseUrl, '/api/auth/policies/required'),
      }).then((response) => {
        expect(response.status).to.eq(200);
        const policies = (response.body?.data?.policies || []) as RequiredPolicy[];
        const requiredConsents = policies
          .filter(
            (policy) =>
              policy.required === true
              && typeof policy.policyType === 'string'
              && policy.policyType.length > 0
              && typeof policy.version === 'string'
              && policy.version.length > 0
          )
          .map((policy) => ({
            policyType: policy.policyType as string,
            version: policy.version as string,
            agreed: true,
          }));
        return requiredConsents;
      });
    });
  };

  const createAccountAndLogin = (email: string, password: string, handle: string) => {
    return resolveRequiredPolicyConsents()
      .then((policyConsents) => resolveBackendBaseUrl().then((backendBaseUrl) => {
        if (!backendBaseUrl) return;
        return cy.request({
          method: 'POST',
          url: buildBackendUrl(backendBaseUrl, '/api/auth/signup'),
          failOnStatusCode: false,
          body: {
            name: 'Security Surface E2E',
            handle,
            email,
            password,
            confirmPassword: password,
            favoriteTeam: fallbackFavoriteTeam,
            policyConsents,
          },
        });
      }))
      .then((signupResponse: any) => {
        if (!signupResponse || !signupResponse.status) return;
        if (signupResponse.status === 429) {
          return false;
        }

        expect(signupResponse.status).to.eq(201);
        return loginWithCredentials(email, password);
      });
  };

  const loginAsNormalUser = (): Cypress.Chainable<boolean | undefined> => {
    return getConfiguredEnvVars().then((envVars) => {
      const configuredEmail = getEnvString(envVars, 'SMOKE_LOGIN_EMAIL');
      const configuredPassword = getEnvString(envVars, 'SMOKE_LOGIN_PASSWORD');

      if (configuredEmail && configuredPassword) {
        return loginWithCredentials(configuredEmail, configuredPassword);
      }

      const uniqueSuffix = Date.now().toString().slice(-8);
      return createAccountAndLogin(
        `it_security_${uniqueSuffix}@example.com`,
        fallbackLoginPassword,
        `its${uniqueSuffix}`
      );
    }) as unknown as Cypress.Chainable<boolean | undefined>;
  };

  it('blocks unauthenticated access to dashboard and leaderboard seed route', () => {
    requestBlocked('GET', '/dashboard');
    requestBlocked('POST', '/api/leaderboard/seed-test-data');
    requestBlocked('GET', '/api/ai/release-decision/presets');
  });

  it('keeps privileged routes unavailable to a normal authenticated user', function () {
    let hasAuthenticatedSession = false;

    loginAsNormalUser().then((created) => {
      if (created === true) {
        hasAuthenticatedSession = true;
      }
    });

    cy.then(function () {
      if (!hasAuthenticatedSession) {
        this.skip();
      }
    });

    resolveBackendBaseUrl().then((backendBaseUrl) => {
      if (!backendBaseUrl) return;
      cy.request({
        method: 'GET',
        url: buildBackendUrl(backendBaseUrl, '/dashboard'),
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });

      cy.request({
        method: 'POST',
        url: buildBackendUrl(backendBaseUrl, '/api/leaderboard/seed-test-data'),
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });

      cy.request({
        method: 'GET',
        url: buildBackendUrl(backendBaseUrl, '/api/ai/release-decision/presets'),
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });
    });
  });
});
