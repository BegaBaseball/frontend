import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl } from './apiBase';

type WindowStub = Window & {
  location: Pick<Location, 'hostname'>;
  dispatchEvent: (event: Event) => boolean;
};

const originalWindow = (globalThis as typeof globalThis & { window?: WindowStub }).window;
const originalCustomEvent = globalThis.CustomEvent;

const setCustomEvent = (value: typeof CustomEvent | undefined): void => {
  if (value) {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value,
    });
    return;
  }

  delete (globalThis as typeof globalThis & { CustomEvent?: typeof CustomEvent }).CustomEvent;
};

const installWindow = (hostname: string, onDispatch?: (event: Event) => void): void => {
  (globalThis as typeof globalThis & { window?: WindowStub }).window = {
    location: { hostname },
    dispatchEvent: (event: Event) => {
      onDispatch?.(event);
      return true;
    },
  } as WindowStub;
};

const restoreWindow = (): void => {
  if (originalWindow) {
    (globalThis as typeof globalThis & { window?: WindowStub }).window = originalWindow;
    return;
  }

  delete (globalThis as typeof globalThis & { window?: WindowStub }).window;
};

afterEach(() => {
  restoreWindow();
  setCustomEvent(originalCustomEvent);
});

test('공개 호스트에서 VITE_API_BASE_URL이 비어 있으면 진단 이벤트를 남기고 /api fallback을 사용한다', (t) => {
  if (!globalThis.CustomEvent) {
    setCustomEvent(class<T> extends Event {
      detail: T;

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail as T;
      }
    } as typeof CustomEvent);
  }

  let dispatchedEvent: Event | null = null;
  installWindow('www.begabaseball.xyz', (event) => {
    dispatchedEvent = event;
  });

  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('');

  assert.equal(apiBaseUrl, '/api');
  assert.equal(consoleError.mock.callCount(), 1);
  assert.ok(dispatchedEvent instanceof Event);
  assert.equal(dispatchedEvent?.type, 'bega:api-base-diagnostic');
});

test('공개 호스트에서 상대 VITE_API_BASE_URL은 진단 이벤트와 함께 정규화된 /api 경로를 반환한다', (t) => {
  if (!globalThis.CustomEvent) {
    setCustomEvent(class<T> extends Event {
      detail: T;

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail as T;
      }
    } as typeof CustomEvent);
  }

  let dispatchedEvent: Event | null = null;
  installWindow('preview.begabaseball.xyz', (event) => {
    dispatchedEvent = event;
  });

  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('api');

  assert.equal(apiBaseUrl, '/api');
  assert.equal(consoleError.mock.callCount(), 1);
  assert.equal(dispatchedEvent?.type, 'bega:api-base-diagnostic');
});

test('공개 호스트에서 절대 API base가 주어지면 외부 API origin을 유지한다', (t) => {
  installWindow('www.begabaseball.xyz');
  const consoleError = t.mock.method(console, 'error', () => {});

  const apiBaseUrl = getApiBaseUrl('https://api.begabaseball.xyz');

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
