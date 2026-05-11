import test from 'node:test';
import assert from 'node:assert/strict';

import { schedulePredictionPostPaintIdleWork } from './predictionDeferredWork';

const installDeferredWorkWindow = () => {
  const mutableGlobal = globalThis as typeof globalThis & { window?: Window };
  const originalWindow = mutableGlobal.window;
  let nextId = 1;
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  const idleCallbacks = new Map<number, IdleRequestCallback>();

  const fakeWindow = {
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const id = nextId;
      nextId += 1;
      rafCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id: number) => {
      rafCallbacks.delete(id);
    },
    requestIdleCallback: (callback: IdleRequestCallback) => {
      const id = nextId;
      nextId += 1;
      idleCallbacks.set(id, callback);
      return id;
    },
    cancelIdleCallback: (id: number) => {
      idleCallbacks.delete(id);
    },
  } as unknown as Window;

  mutableGlobal.window = fakeWindow;

  return {
    flushAnimationFrame: () => {
      const callbacks = [...rafCallbacks.values()];
      rafCallbacks.clear();
      callbacks.forEach((callback) => callback(0));
    },
    flushIdle: () => {
      const callbacks = [...idleCallbacks.values()];
      idleCallbacks.clear();
      callbacks.forEach((callback) => callback({
        didTimeout: false,
        timeRemaining: () => 50,
      }));
    },
    restore: () => {
      if (originalWindow) {
        mutableGlobal.window = originalWindow;
      } else {
        Reflect.deleteProperty(mutableGlobal, 'window');
      }
    },
  };
};

test('schedulePredictionPostPaintIdleWork runs after two animation frames and idle time', (t) => {
  const fakeWindow = installDeferredWorkWindow();
  t.after(fakeWindow.restore);

  let runCount = 0;
  schedulePredictionPostPaintIdleWork(() => {
    runCount += 1;
  });

  assert.equal(runCount, 0);
  fakeWindow.flushAnimationFrame();
  assert.equal(runCount, 0);
  fakeWindow.flushAnimationFrame();
  assert.equal(runCount, 0);
  fakeWindow.flushIdle();
  assert.equal(runCount, 1);
});

test('schedulePredictionPostPaintIdleWork cancel prevents pending work', (t) => {
  const fakeWindow = installDeferredWorkWindow();
  t.after(fakeWindow.restore);

  let runCount = 0;
  const cancel = schedulePredictionPostPaintIdleWork(() => {
    runCount += 1;
  });

  cancel();
  fakeWindow.flushAnimationFrame();
  fakeWindow.flushAnimationFrame();
  fakeWindow.flushIdle();

  assert.equal(runCount, 0);
});
