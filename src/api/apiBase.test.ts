import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl } from './apiBase';

type GlobalWithTestWindow = typeof globalThis & {
  window?: WindowStub;
  CustomEvent?: typeof CustomEvent;
};

type WindowStub = Window & {
  location: Pick<Location, 'hostname'>;
  dispatchEvent: (event: Event) => boolean;
};

const originalWindow = (globalThis as GlobalWithTestWindow).window;
const originalCustomEvent = (globalThis as GlobalWithTestWindow).CustomEvent;

const TestCustomEvent = class<T> extends Event {
  detail: T;

  constructor(type: string, init?: CustomEventInit<T>) {
    super(type);
    this.detail = init?.detail as T;
  }
} as unknown as typeof CustomEvent;

const setCustomEvent = (value: typeof CustomEvent | undefined): void => {
  if (value) {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      writable: true,
      value,
    });
    return;
  }

  Reflect.deleteProperty(globalThis, 'CustomEvent');
};

const installWindow = (hostname: string, onDispatch?: (event: Event) => void): void => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: { hostname },
      dispatchEvent: (event: Event) => {
        onDispatch?.(event);
        return true;
      },
    } as WindowStub,
  });
};

const restoreWindow = (): void => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    });
    return;
  }

  Reflect.deleteProperty(globalThis, 'window');
};

afterEach(() => {
  restoreWindow();
  setCustomEvent(originalCustomEvent);
});

test('공개 호스트에서 VITE_API_BASE_URL이 비어 있으면 진단 이벤트를 남기고 /api fallback을 사용한다', (t) => {
  if (!globalThis.CustomEvent) {
    setCustomEvent(TestCustomEvent);
  }

  let dispatchedEvent: Event | null = null;
  installWindow('www.begabaseball.xyz', (event) => {
    dispatchedEvent = event;
  });

  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('');

  assert.equal(apiBaseUrl, '/api');
  assert.equal(consoleError.mock.callCount(), 1);
  const receivedEvent = dispatchedEvent as Event | null;
  if (!receivedEvent) {
    throw new Error('Expected diagnostic event');
  }
  assert.equal(receivedEvent.type, 'bega:api-base-diagnostic');
});

test('공개 호스트에서 상대 VITE_API_BASE_URL은 진단 이벤트와 함께 정규화된 /api 경로를 반환한다', (t) => {
  if (!globalThis.CustomEvent) {
    setCustomEvent(TestCustomEvent);
  }

  let dispatchedEvent: Event | null = null;
  installWindow('preview.begabaseball.xyz', (event) => {
    dispatchedEvent = event;
  });

  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('api');

  assert.equal(apiBaseUrl, '/api');
  assert.equal(consoleError.mock.callCount(), 1);
  const receivedEvent = dispatchedEvent as Event | null;
  if (!receivedEvent) {
    throw new Error('Expected diagnostic event');
  }
  assert.equal(receivedEvent.type, 'bega:api-base-diagnostic');
});

test('공개 호스트에서 절대 API base가 주어지면 외부 API origin을 유지한다', (t) => {
  installWindow('www.begabaseball.xyz');
  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('https://api.begabaseball.xyz');

  assert.equal(apiBaseUrl, 'https://api.begabaseball.xyz/api');
  assert.equal(consoleError.mock.callCount(), 0);
});

test('공개 호스트에서 /api가 포함된 절대 API base는 중복 없이 유지한다', (t) => {
  installWindow('www.begabaseball.xyz');
  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('https://api.begabaseball.xyz/api');

  assert.equal(apiBaseUrl, 'https://api.begabaseball.xyz/api');
  assert.equal(consoleError.mock.callCount(), 0);
});

test('loopback 호스트에서는 동일 origin 절대 API base를 /api로 축약한다', (t) => {
  installWindow('127.0.0.1');
  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('http://localhost:8080/api');

  assert.equal(apiBaseUrl, '/api');
  assert.equal(consoleError.mock.callCount(), 0);
});
