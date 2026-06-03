import test from 'node:test';
import assert from 'node:assert/strict';

import {
  schedulePredictionAdjacentPrefetch,
  shouldPrefetchPredictionDate,
  shouldSchedulePredictionAdjacentPrefetch,
} from './predictionScheduleAdjacentPrefetch';
import type { PredictionDeferredWorkCancel } from '../utils/predictionDeferredWork';

const installAdjacentPrefetchWindow = () => {
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
  (mutableGlobal as { window?: Window }).window = fakeWindow;

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

test('shouldSchedulePredictionAdjacentPrefetch returns true for fresh anchor', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', null, new Set()),
    true,
  );
});

test('shouldSchedulePredictionAdjacentPrefetch blocks pending anchor', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', '2026-04-10', new Set()),
    false,
  );
});

test('shouldSchedulePredictionAdjacentPrefetch blocks completed anchor reuse', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', null, new Set(['2026-04-10'])),
    false,
  );
});

test('shouldPrefetchPredictionDate skips past dates', () => {
  assert.equal(
    shouldPrefetchPredictionDate('2026-04-26', '2026-04-27'),
    false,
  );
});

test('shouldPrefetchPredictionDate allows today and future dates', () => {
  assert.equal(
    shouldPrefetchPredictionDate('2026-04-27', '2026-04-27'),
    true,
  );
  assert.equal(
    shouldPrefetchPredictionDate('2026-04-28', '2026-04-27'),
    true,
  );
});

test('schedulePredictionAdjacentPrefetch waits for post-paint idle before loading adjacent dates', (t) => {
  const fakeWindow = installAdjacentPrefetchWindow();
  t.after(fakeWindow.restore);

  const pendingAnchorDateRef = { current: null as string | null };
  const completedAnchorDatesRef = { current: new Set<string>() };
  const adjacentPrefetchCancelRef = { current: null as PredictionDeferredWorkCancel | null };
  const calls: string[] = [];
  const clearScheduledAdjacentPrefetch = () => {
    adjacentPrefetchCancelRef.current?.();
    adjacentPrefetchCancelRef.current = null;
    pendingAnchorDateRef.current = null;
  };

  schedulePredictionAdjacentPrefetch({
    anchorDate: '2099-05-01',
    pendingAnchorDateRef,
    completedAnchorDatesRef,
    adjacentPrefetchCancelRef,
    clearScheduledAdjacentPrefetch,
    dayNavigationByDateRef: {
      current: {
        '2099-05-01': {
          prevDate: '2099-04-30',
          nextDate: '2099-05-02',
        },
      },
    },
    loadPredictionDay: async (targetDate) => {
      calls.push(targetDate);
    },
  });

  assert.deepEqual(calls, []);
  fakeWindow.flushAnimationFrame();
  fakeWindow.flushAnimationFrame();
  assert.deepEqual(calls, []);
  fakeWindow.flushIdle();

  assert.deepEqual(calls, ['2099-04-30', '2099-05-02']);
  assert.equal(completedAnchorDatesRef.current.has('2099-05-01'), true);
});

test('schedulePredictionAdjacentPrefetch cancel blocks pending load', (t) => {
  const fakeWindow = installAdjacentPrefetchWindow();
  t.after(fakeWindow.restore);

  const pendingAnchorDateRef = { current: null as string | null };
  const completedAnchorDatesRef = { current: new Set<string>() };
  const adjacentPrefetchCancelRef = { current: null as PredictionDeferredWorkCancel | null };
  const calls: string[] = [];
  const clearScheduledAdjacentPrefetch = () => {
    adjacentPrefetchCancelRef.current?.();
    adjacentPrefetchCancelRef.current = null;
    pendingAnchorDateRef.current = null;
  };

  schedulePredictionAdjacentPrefetch({
    anchorDate: '2099-05-01',
    pendingAnchorDateRef,
    completedAnchorDatesRef,
    adjacentPrefetchCancelRef,
    clearScheduledAdjacentPrefetch,
    dayNavigationByDateRef: {
      current: {
        '2099-05-01': {
          prevDate: null,
          nextDate: '2099-05-02',
        },
      },
    },
    loadPredictionDay: async (targetDate) => {
      calls.push(targetDate);
    },
  });

  clearScheduledAdjacentPrefetch();
  fakeWindow.flushAnimationFrame();
  fakeWindow.flushAnimationFrame();
  fakeWindow.flushIdle();

  assert.deepEqual(calls, []);
  assert.equal(completedAnchorDatesRef.current.has('2099-05-01'), false);
});
