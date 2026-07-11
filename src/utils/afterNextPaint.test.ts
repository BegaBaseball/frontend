import test from 'node:test';
import assert from 'node:assert/strict';

import { scheduleAfterNextPaint } from './afterNextPaint';

const installAnimationFrameWindow = () => {
  const mutableGlobal = globalThis as unknown as { window?: Window };
  const originalWindow = mutableGlobal.window;
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  mutableGlobal.window = {
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id: number) => {
      callbacks.delete(id);
    },
  } as unknown as Window;

  return {
    flush: () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(0));
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

test('scheduleAfterNextPaint는 두 animation frame 뒤에 작업을 실행한다', (t) => {
  const fakeWindow = installAnimationFrameWindow();
  t.after(fakeWindow.restore);
  let runCount = 0;

  scheduleAfterNextPaint(() => {
    runCount += 1;
  });

  fakeWindow.flush();
  assert.equal(runCount, 0);
  fakeWindow.flush();
  assert.equal(runCount, 1);
});

test('scheduleAfterNextPaint 취소 함수는 대기 작업을 제거한다', (t) => {
  const fakeWindow = installAnimationFrameWindow();
  t.after(fakeWindow.restore);
  let runCount = 0;

  const cancel = scheduleAfterNextPaint(() => {
    runCount += 1;
  });
  cancel();
  fakeWindow.flush();
  fakeWindow.flush();

  assert.equal(runCount, 0);
});
