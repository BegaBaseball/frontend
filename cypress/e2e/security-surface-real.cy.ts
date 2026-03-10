describe('Security surface real smoke', () => {
  const fallbackLoginPassword = 'Test1234!';
  const fallbackFavoriteTeam = 'LG';

  type RequiredPolicy = {
    policyType?: string;
    version?: string;
    required?: boolean;
  };

  const stripTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');

  const normalizeBackendBaseUrl = (value: string | undefined) => {
    if (!value) return undefined;
    const candidate = stripTrailingSlash(value);
    if (!candidate || !/^https?:\/\//i.test(candidate)) return undefined;

    try {
      const parsed = new URL(candidate);
      const trimmedPath = parsed.pathname.replace(/\/api\/?$/i, '');
      const resolvedPath = trimmedPath === '/' ? '' : trimmedPath;
      return `${parsed.origin}${resolvedPath}`;
    } catch {
      return undefined;
    }
  };

  const resolveBackendBaseUrl = () =>
    cy.env(['BACKEND_BASE_URL', 'SMOKE_API_BASE_URL', 'VITE_API_BASE_URL']).then((envVars) => {
      const backendBaseUrl =
        normalizeBackendBaseUrl(envVars.BACKEND_BASE_URL as string | undefined)
        || normalizeBackendBaseUrl(envVars.SMOKE_API_BASE_URL as string | undefined)
        || normalizeBackendBaseUrl(envVars.VITE_API_BASE_URL as string | undefined);

      if (!backendBaseUrl) {
        return undefined;
      }
      return backendBaseUrl;
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
      .then((backendBaseUrl: any) => {
        if (!backendBaseUrl) {
          cy.log('Skipping security-surface-real: BACKEND_BASE_URL is not available or backend is not reachable.');
          cy.log('Set BACKEND_BASE_URL, SMOKE_API_BASE_URL, or VITE_API_BASE_URL for execution.');
          this.skip();
          return;
        }

        return cy.request({
          method: 'GET',
          url: `${backendBaseUrl}/actuator/health`,
          failOnStatusCode: false,
        }).then((response) => {
          if (!isBackendHealthResponse(response)) {
            cy.log('Skipping security-surface-real: /actuator/health did not return backend JSON payload.');
            this.skip();
          }
        });
      });
  });

  const requestBlocked = (method: 'GET' | 'POST', url: string) =>
    resolveBackendBaseUrl().then((backendBaseUrl: any) => {
      if (!backendBaseUrl) return;
      return cy.request({
        method,
        url: `${backendBaseUrl}${url}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403, 404]).to.include(response.status);
      });
    });

  const loginWithCredentials = (email: string, password: string) => {
    return resolveBackendBaseUrl().then((backendBaseUrl: any) => {
      if (!backendBaseUrl) return;
      return cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/api/auth/login`,
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
    return resolveBackendBaseUrl().then((backendBaseUrl: any) => {
      if (!backendBaseUrl) return [];
      return cy.request({
        method: 'GET',
        url: `${backendBaseUrl}/api/auth/policies/required`,
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
      .then((policyConsents) => resolveBackendBaseUrl().then((backendBaseUrl: any) => {
        if (!backendBaseUrl) return;
        return cy.request({
          method: 'POST',
          url: `${backendBaseUrl}/api/auth/signup`,
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

  const loginAsNormalUser = () => {
    return cy.env(['SMOKE_LOGIN_EMAIL', 'SMOKE_LOGIN_PASSWORD']).then((envVars) => {
      const configuredEmail = envVars.SMOKE_LOGIN_EMAIL;
      const configuredPassword = envVars.SMOKE_LOGIN_PASSWORD;

      if (configuredEmail && configuredPassword) {
        return loginWithCredentials(configuredEmail, configuredPassword);
      }

      const uniqueSuffix = Date.now().toString().slice(-8);
      return createAccountAndLogin(
        `it_security_${uniqueSuffix}@example.com`,
        fallbackLoginPassword,
        `its${uniqueSuffix}`
      );
    });
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
        url: `${backendBaseUrl}/dashboard`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 404]).to.include(response.status);
      });

      cy.request({
        method: 'POST',
        url: `${backendBaseUrl}/api/leaderboard/seed-test-data`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 404]).to.include(response.status);
      });

      cy.request({
        method: 'GET',
        url: `${backendBaseUrl}/api/ai/release-decision/presets`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 404]).to.include(response.status);
      });
    });
  });
});
