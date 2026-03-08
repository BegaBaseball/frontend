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
            policy.required === true &&
            typeof policy.policyType === 'string' &&
            policy.policyType.length > 0 &&
            typeof policy.version === 'string' &&
            policy.version.length > 0
        )
        .map((policy) => ({
          policyType: policy.policyType as string,
          version: policy.version as string,
          agreed: true,
        }));
      expect(requiredConsents.length).to.be.greaterThan(0);
      return requiredConsents;
    });
  };

  const createAccountAndLogin = (email: string, password: string, handle: string) => {
    return resolveRequiredPolicyConsents()
      .then((policyConsents) => {
        return cy.request({
          method: 'POST',
          url: '/api/auth/signup',
          body: {
            name: 'WebSocket E2E',
            handle,
            email,
            password,
            confirmPassword: password,
            favoriteTeam: fallbackFavoriteTeam,
            policyConsents,
          },
        });
      })
      .then((signupResponse) => {
        expect(signupResponse.status).to.eq(201);
        return loginWithCredentials(email, password);
      });
  };

  it('connects to STOMP broker over /ws with authenticated session', () => {
    let requestedBrokerURL: string | undefined;

    cy.env(['SMOKE_LOGIN_EMAIL', 'SMOKE_LOGIN_PASSWORD', 'WS_BROKER_URL']).then((envVars) => {
      requestedBrokerURL = envVars.WS_BROKER_URL;
      const configuredEmail = envVars.SMOKE_LOGIN_EMAIL;
      const configuredPassword = envVars.SMOKE_LOGIN_PASSWORD;
      if (configuredEmail && configuredPassword) {
        return loginWithCredentials(configuredEmail, configuredPassword);
      }

      const uniqueSuffix = Date.now().toString().slice(-8);
      const fallbackLoginEmail = `it_ws_${uniqueSuffix}@example.com`;
      const fallbackLoginHandle = `itws${uniqueSuffix}`;
      return createAccountAndLogin(
        fallbackLoginEmail,
        fallbackLoginPassword,
        fallbackLoginHandle
      );
    });

    cy.visit('/home');

    cy.window().then((win) => {
      const protocol = win.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const candidateBrokerURLs = [
        requestedBrokerURL,
        `${protocol}//${win.location.host}/ws`,
        `${protocol}//host.docker.internal:8080/ws`,
      ].filter(
        (value, index, list): value is string =>
          typeof value === 'string' && value.length > 0 && list.indexOf(value) === index
      );

      const connectToBroker = (brokerURL: string) =>
        new Cypress.Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
          };

          const timeout = win.setTimeout(() => {
            finish(() => {
              client.deactivate();
              reject(new Error(`STOMP connection timeout (${brokerURL})`));
            });
          }, 10000);

          const client = new Client({
            brokerURL,
            reconnectDelay: 0,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 0,
            onConnect: () => {
              win.clearTimeout(timeout);
              finish(() => {
                client.deactivate();
                resolve();
              });
            },
            onStompError: (frame) => {
              win.clearTimeout(timeout);
              finish(() => {
                client.deactivate();
                reject(new Error(frame.headers.message || `STOMP broker error (${brokerURL})`));
              });
            },
            onWebSocketError: () => {
              win.clearTimeout(timeout);
              finish(() => {
                client.deactivate();
                reject(new Error(`WebSocket transport error (${brokerURL})`));
              });
            },
          });

          client.activate();
        });

      const tryConnect = (index: number): Cypress.Promise<void> => {
        const brokerURL = candidateBrokerURLs[index];
        if (!brokerURL) {
          return Cypress.Promise.reject(
            new Error(`All broker URLs failed: ${candidateBrokerURLs.join(', ')}`)
          );
        }
        return connectToBroker(brokerURL).catch(() => tryConnect(index + 1));
      };

      return tryConnect(0);
    });
  });
});
