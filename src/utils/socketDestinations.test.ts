import test from 'node:test';
import assert from 'node:assert/strict';

import { NOTIFICATION_SOCKET_DESTINATION, buildPartySocketDestination } from './socketDestinations';

test('notification socket destination should use authenticated user queue', () => {
  assert.equal(NOTIFICATION_SOCKET_DESTINATION, '/user/queue/notifications');
});

test('party socket destination should remain topic-based per party', () => {
  assert.equal(buildPartySocketDestination(42), '/topic/party/42');
});
