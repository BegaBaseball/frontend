import { Client } from '@stomp/stompjs';

describe('WebSocket real integration smoke', () => {
  const fallbackLoginEmail = 'it_17722980@example.com';
  const fallbackLoginPassword = 'Test1234!';

  it('connects to STOMP broker over /ws with authenticated session', () => {
    cy.env(['SMOKE_LOGIN_EMAIL', 'SMOKE_LOGIN_PASSWORD']).then((envVars) => {
      const loginEmail = envVars.SMOKE_LOGIN_EMAIL || fallbackLoginEmail;
      const loginPassword = envVars.SMOKE_LOGIN_PASSWORD || fallbackLoginPassword;
      return cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: loginEmail,
          password: loginPassword,
        },
      });
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body?.success).to.eq(true);
    });

    cy.visit('/home');

    cy.window().then((win) => (
      new Cypress.Promise<void>((resolve, reject) => {
        const protocol = win.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const brokerURL = `${protocol}//${win.location.host}/ws`;
        let settled = false;

        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        const timeout = win.setTimeout(() => {
          finish(() => {
            client.deactivate();
            reject(new Error('STOMP connection timeout'));
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
              reject(new Error(frame.headers.message || 'STOMP broker error'));
            });
          },
          onWebSocketError: () => {
            win.clearTimeout(timeout);
            finish(() => {
              client.deactivate();
              reject(new Error('WebSocket transport error'));
            });
          },
        });

        client.activate();
      })
    ));
  });
});
