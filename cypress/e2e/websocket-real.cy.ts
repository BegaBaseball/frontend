import { Client } from '@stomp/stompjs';

describe('WebSocket real integration smoke', () => {
  const fallbackLoginPassword = 'Test1234!';
  const fallbackFavoriteTeam = 'LG';

  type RequiredPolicy = {
    policyType?: string;
    version?: string;
    required?: boolean;
  };

  const loginWithCredentials = (email: string, password: string) => {
    return cy.request({
      method: 'POST',
      url: '/api/auth/login',
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
      url: '/api/auth/policies/required',
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
        url: '/api/auth/signup',
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
    return [
      requestedBrokerURL,
      `${protocol}//${win.location.host}/ws`,
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

    cy.env(['WS_BROKER_URL']).then((envVars: any) => {
      requestedBrokerURL = envVars.WS_BROKER_URL;
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

    cy.env(['SMOKE_LOGIN_EMAIL', 'SMOKE_LOGIN_PASSWORD', 'WS_BROKER_URL']).then((envVars: any) => {
      requestedBrokerURL = envVars.WS_BROKER_URL;
      const configuredEmail = envVars.SMOKE_LOGIN_EMAIL;
      const configuredPassword = envVars.SMOKE_LOGIN_PASSWORD;

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
