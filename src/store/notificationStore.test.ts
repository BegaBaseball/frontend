import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationData } from '../types/notification';
import { useNotificationStore } from './notificationStore';

const notification = (overrides: Partial<NotificationData> = {}): NotificationData => ({
  id: 10,
  type: 'APPLICATION_APPROVED',
  title: '승인됨',
  message: '신청이 승인되었습니다.',
  relatedId: 100,
  isRead: false,
  createdAt: '2026-07-18T00:00:00Z',
  ...overrides,
});

test('addNotification upserts duplicate domain IDs instead of increasing unread count', () => {
  useNotificationStore.getState().reset();

  useNotificationStore.getState().addNotification(notification());
  useNotificationStore.getState().addNotification(notification({ title: '최신 승인 알림' }));

  const notifications = useNotificationStore.getState().notifications;
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.title, '최신 승인 알림');
  assert.equal(notifications.filter((item) => !item.isRead).length, 1);
});

test('addNotification does not turn an already-read notification back into unread', () => {
  useNotificationStore.getState().reset();

  useNotificationStore.getState().addNotification(notification({ isRead: true }));
  useNotificationStore.getState().addNotification(notification({ isRead: false }));

  assert.equal(useNotificationStore.getState().notifications[0]?.isRead, true);
});

test('setNotifications removes duplicate IDs from authoritative reloads', () => {
  useNotificationStore.getState().reset();

  useNotificationStore.getState().setNotifications([
    notification({ title: '최신 값' }),
    notification({ title: '중복 값' }),
    notification({ id: 11, title: '다른 알림' }),
  ]);

  assert.deepEqual(
    useNotificationStore.getState().notifications.map((item) => item.id),
    [10, 11],
  );
  assert.equal(useNotificationStore.getState().notifications[0]?.title, '최신 값');
});

test('setNotifications does not roll back a local read made while the snapshot was loading', () => {
  useNotificationStore.getState().reset();
  useNotificationStore.getState().setNotifications([notification()]);

  useNotificationStore.getState().markAsRead(10);
  useNotificationStore.getState().setNotifications([notification({ isRead: false })]);

  assert.equal(useNotificationStore.getState().notifications[0]?.isRead, true);
});

test('stale snapshots and duplicate events do not restore a locally deleted notification', () => {
  useNotificationStore.getState().reset();
  useNotificationStore.getState().setNotifications([notification()]);

  useNotificationStore.getState().removeNotification(10);
  useNotificationStore.getState().setNotifications([notification()]);
  useNotificationStore.getState().addNotification(notification());

  assert.deepEqual(useNotificationStore.getState().notifications, []);
});

test('an older snapshot cannot roll back a server-observed read notification', () => {
  useNotificationStore.getState().reset();

  useNotificationStore.getState().setNotifications([notification({ isRead: true })]);
  useNotificationStore.getState().setNotifications([notification({ isRead: false })]);

  assert.equal(useNotificationStore.getState().notifications[0]?.isRead, true);
});

test('markAllAsRead protects older notifications that arrive in an in-flight snapshot', () => {
  useNotificationStore.getState().reset();
  useNotificationStore.getState().setNotifications([notification()]);

  useNotificationStore.getState().markAllAsRead();
  useNotificationStore.getState().setNotifications([
    notification(),
    notification({
      id: 11,
      createdAt: '2026-07-17T23:59:00Z',
      isRead: false,
    }),
  ]);

  assert.equal(
    useNotificationStore.getState().notifications.every((item) => item.isRead),
    true,
  );
});

test('markAllAsRead keeps notifications created after the request boundary unread', () => {
  useNotificationStore.getState().reset();
  const requestStartedAt = Date.parse('2026-07-18T00:00:00Z');

  useNotificationStore.getState().markAllAsRead(requestStartedAt);
  useNotificationStore.getState().setNotifications([
    notification({ id: 10, createdAt: '2026-07-17T23:59:59Z' }),
    notification({ id: 11, createdAt: '2026-07-18T00:00:01Z' }),
  ]);

  assert.deepEqual(
    useNotificationStore.getState().notifications.map((item) => item.isRead),
    [true, false],
  );
});
