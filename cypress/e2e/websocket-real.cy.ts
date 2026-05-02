import { Client } from '@stomp/stompjs';

describe('WebSocket real integration smoke', () => {
  const fallbackLoginPassword = 'Test1234!';
  const fallbackFavoriteTeam = 'LG';
  let backendBaseUrl: string | undefined;
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
  const getConfiguredEnvVars = (): EnvVars => {
    const config = Cypress.config() as unknown as { env?: EnvVars };
    return config.env && typeof config.env === 'object' ? config.env : {};
  };
  const asPromiseLike = <T,>(chainable: Cypress.Chainable<T>): PromiseLike<T> =>
    chainable as unknown as PromiseLike<T>;

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
    if (!value) {
      return undefined;
    }

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

  const resolveBackendBaseUrl = (): Cypress.Chainable<string | undefined> =>
    cy.wrap(null, { log: false }).then(() => {
      const envVars = getConfiguredEnvVars();
      const resolvedBackendBaseUrl =
        normalizeBackendBaseUrl(getEnvString(envVars, 'BACKEND_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'SMOKE_API_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'CYPRESS_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'CYPRESS_BACKEND_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'VITE_API_BASE_URL'))
        || normalizeBackendBaseUrl(getEnvString(envVars, 'FRONTEND_API_BASE_URL'));

      return cy.wrap(resolvedBackendBaseUrl, { log: false });
    });

  const buildApiUrl = (path: string) => {
    const safePath = path.startsWith('/') ? path : `/${path}`;
    if (!backendBaseUrl) {
      return path;
    }
    return `${backendBaseUrl}${safePath}`;
  };

  const isBackendReadinessResponse = (response: Cypress.Response<unknown>) => {
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
      .then((resolvedBackendBaseUrl) => {
        backendBaseUrl = resolvedBackendBaseUrl;

        if (!backendBaseUrl) {
          cy.log('Skipping websocket-real: BACKEND_BASE_URL is not available.');
          this.skip();
          return;
        }

        return asPromiseLike(
          cy.request({
            method: 'GET',
            url: `${backendBaseUrl}/actuator/health/readiness`,
            failOnStatusCode: false,
          })
        ).then((response) => {
          if (!isBackendReadinessResponse(response)) {
            const contentType = String(response.headers['content-type'] || 'unknown');
            throw new Error(`websocket-real backend readiness did not return JSON payload (status=${response.status}, content-type=${contentType})`);
          }

          const status = (response.body as { status?: unknown }).status;
          if (response.status !== 200 || status !== 'UP') {
            throw new Error(`websocket-real backend readiness is not UP (http=${response.status}, status=${String(status || 'empty')})`);
          }
        }, (error: Error) => {
          throw new Error(`websocket-real backend readiness check failed (${error.message})`);
        });
      });
  });

  const loginWithCredentials = (email: string, password: string) => {
    return cy.request({
      method: 'POST',
      url: buildApiUrl('/api/auth/login'),
      body: {
        email,
        password,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body?.success).to.eq(true);
      return true;
    });
  };

  const resolveRequiredPolicyConsents = () => {
    return cy.request({
      method: 'GET',
      url: buildApiUrl('/api/auth/policies/required'),
    }).then((response) => {
      expect(response.status).to.eq(200);
      const policies = (response.body?.data?.policies || []) as RequiredPolicy[];
      expect(Array.isArray(policies)).to.eq(true);
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
  };

  const createAccountAndLogin = (email: string, password: string, handle: string) => {
    return resolveRequiredPolicyConsents()
      .then((policyConsents) => cy.request({
        method: 'POST',
        url: buildApiUrl('/api/auth/signup'),
        failOnStatusCode: false,
        body: {
          name: 'WebSocket E2E',
          handle,
          email,
          password,
          confirmPassword: password,
          favoriteTeam: fallbackFavoriteTeam,
          policyConsents,
        },
      }))
      .then((signupResponse) => {
        if (signupResponse.status === 429) {
          return cy.wrap(false);
        }

        expect(signupResponse.status).to.eq(201);
        return loginWithCredentials(email, password);
      });
  };

  const resolvePrimaryBrokerURL = (win: Window, requestedBrokerURL?: string) => {
    if (requestedBrokerURL) {
      return requestedBrokerURL;
    }

    const protocol = win.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${win.location.host}/ws`;
  };

  const resolveCandidateBrokerURLs = (win: Window, requestedBrokerURL?: string) => {
    const protocol = win.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerHostFromBackend = (() => {
      if (!backendBaseUrl) {
        return undefined;
      }

      try {
        return new URL(backendBaseUrl).host;
      } catch {
        return undefined;
      }
    })();

    return [
      requestedBrokerURL,
      `${protocol}//${win.location.host}/ws`,
      brokerHostFromBackend ? `${protocol}//${brokerHostFromBackend}/ws` : undefined,
      `${protocol}//host.docker.internal:8080/ws`,
    ].filter(
      (value, index, list): value is string =>
        typeof value === 'string' && value.length > 0 && list.indexOf(value) === index
    );
  };

  const connectToBroker = (win: Window, brokerURL: string) =>
    new Cypress.Promise<void>((resolve, reject) => {
      let settled = false;
      let client: Client | null = null;

      const finish = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        fn();
      };

      const timeout = win.setTimeout(() => {
        finish(() => {
          client?.deactivate();
          reject(new Error(`STOMP connection timeout (${brokerURL})`));
        });
      }, 10000);

      client = new Client({
        brokerURL,
        reconnectDelay: 0,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          win.clearTimeout(timeout);
          finish(() => {
            client?.deactivate();
            resolve();
          });
        },
        onStompError: (frame) => {
          win.clearTimeout(timeout);
          finish(() => {
            client?.deactivate();
            reject(new Error(frame.headers.message || `STOMP broker error (${brokerURL})`));
          });
        },
        onWebSocketError: () => {
          win.clearTimeout(timeout);
          finish(() => {
            client?.deactivate();
            reject(new Error(`WebSocket transport error (${brokerURL})`));
          });
        },
      });

      client.activate();
    });

  const expectBrokerConnectionFailure = (win: Window, brokerURL: string) =>
    new Cypress.Promise<void>((resolve, reject) => {
      let settled = false;
      let client: Client | null = null;

      const finish = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        fn();
      };

      const timeout = win.setTimeout(() => {
        finish(() => {
          client?.deactivate();
          reject(new Error(`Unauthenticated STOMP connection unexpectedly hung (${brokerURL})`));
        });
      }, 10000);

      const resolveRejectedConnection = () => {
        win.clearTimeout(timeout);
        finish(() => {
          client?.deactivate();
          resolve();
        });
      };

      client = new Client({
        brokerURL,
        reconnectDelay: 0,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          win.clearTimeout(timeout);
          finish(() => {
            client?.deactivate();
            reject(new Error(`Unauthenticated STOMP connection unexpectedly succeeded (${brokerURL})`));
          });
        },
        onStompError: () => {
          resolveRejectedConnection();
        },
        onWebSocketError: () => {
          resolveRejectedConnection();
        },
        onWebSocketClose: () => {
          resolveRejectedConnection();
        },
      });

      client.activate();
    });

  const connectToFirstReachableBroker = (
    win: Window,
    candidateBrokerURLs: string[],
    index = 0
  ): Promise<void> => {
    const brokerURL = candidateBrokerURLs[index];
    if (!brokerURL) {
      return Promise.reject(
        new Error(`All broker URLs failed: ${candidateBrokerURLs.join(', ')}`)
      );
    }

    return connectToBroker(win, brokerURL).catch(() =>
      connectToFirstReachableBroker(win, candidateBrokerURLs, index + 1)
    );
  };

  it('rejects STOMP broker connection over /ws without authenticated session', () => {
    let requestedBrokerURL: string | undefined;

    cy.wrap(null, { log: false }).then(() => {
      const envVars = getConfiguredEnvVars();
      requestedBrokerURL = getEnvString(envVars, 'WS_BROKER_URL');
    });

    cy.visit('/login');

    cy.window().then((win) => {
      const brokerURL = resolvePrimaryBrokerURL(win, requestedBrokerURL);
      return expectBrokerConnectionFailure(win, brokerURL);
    });
  });

  it('connects to STOMP broker over /ws with authenticated session', function () {
    let requestedBrokerURL: string | undefined;
    let hasAuthenticatedSession = false;

    cy.wrap(null, { log: false }).then(() => {
      const envVars = getConfiguredEnvVars();
      requestedBrokerURL = getEnvString(envVars, 'WS_BROKER_URL');
      const configuredEmail = getEnvString(envVars, 'SMOKE_LOGIN_EMAIL');
      const configuredPassword = getEnvString(envVars, 'SMOKE_LOGIN_PASSWORD');

      if (configuredEmail && configuredPassword) {
        return loginWithCredentials(configuredEmail, configuredPassword).then(() => {
          hasAuthenticatedSession = true;
        });
      }

      const uniqueSuffix = Date.now().toString().slice(-8);
      return createAccountAndLogin(
        `it_ws_${uniqueSuffix}@example.com`,
        fallbackLoginPassword,
        `itws${uniqueSuffix}`
      ).then((created) => {
        hasAuthenticatedSession = created === true;
      });
    });

    cy.then(function () {
      if (!hasAuthenticatedSession) {
        this.skip();
      }
    });

    cy.visit('/home');

    cy.window().then((win) => {
      const candidateBrokerURLs = resolveCandidateBrokerURLs(win, requestedBrokerURL);
      return connectToFirstReachableBroker(win, candidateBrokerURLs);
    });
  });
});
