import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveStompBrokerUrl } from './stomp';

const originalWindow = globalThis.window;

test.afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
    return;
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: originalWindow,
  });
});

test('resolveStompBrokerUrl uses absolute API base host for production backends', () => {
  const brokerUrl = resolveStompBrokerUrl('https://api.begabaseball.xyz/api');

  assert.equal(brokerUrl, 'wss://api.begabaseball.xyz/ws');
});

test('resolveStompBrokerUrl uses current origin when API base is same-origin relative', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: {
        origin: 'https://www.begabaseball.xyz',
        protocol: 'https:',
        host: 'www.begabaseball.xyz',
      },
    } as Window,
  });

  const brokerUrl = resolveStompBrokerUrl('/api');

  assert.equal(brokerUrl, 'wss://www.begabaseball.xyz/ws');
});

test('resolveStompBrokerUrl keeps localhost websockets for local absolute API bases', () => {
  const brokerUrl = resolveStompBrokerUrl('http://localhost:8080/api');

  assert.equal(brokerUrl, 'ws://localhost:8080/ws');
});
