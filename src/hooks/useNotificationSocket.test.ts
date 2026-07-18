import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationData } from '../types/notification';
import { reloadNotificationSnapshot } from './useNotificationSocket';

const notification: NotificationData = {
  id: 41,
  type: 'NEW_FOLLOWER',
  title: '새 팔로워',
  message: '새 팔로워가 있습니다.',
  relatedId: 7,
  isRead: false,
  createdAt: '2026-07-18T01:00:00.000Z',
};

test('reloadNotificationSnapshot replaces local state with the authoritative server snapshot', async () => {
  const snapshots: NotificationData[][] = [];

  await reloadNotificationSnapshot(
    async () => [notification],
    (notifications) => snapshots.push(notifications),
  );

  assert.deepEqual(snapshots, [[notification]]);
});

test('reloadNotificationSnapshot discards a response after its connection generation is stale', async () => {
  let resolveFetch: ((notifications: NotificationData[]) => void) | undefined;
  let isCurrent = true;
  const snapshots: NotificationData[][] = [];

  const reload = reloadNotificationSnapshot(
    () => new Promise<NotificationData[]>((resolve) => {
      resolveFetch = resolve;
    }),
    (notifications) => snapshots.push(notifications),
    () => isCurrent,
  );

  isCurrent = false;
  resolveFetch?.([notification]);
  await reload;

  assert.deepEqual(snapshots, []);
});
