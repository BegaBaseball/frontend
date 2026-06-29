import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasSameMateUserIdentity,
  isPartyHostedByUser,
  mapBackendPartyToFrontend,
} from './mate';

test('mapBackendPartyToFrontend tolerates public party payload without hostId', () => {
  const party = mapBackendPartyToFrontend({
    id: 1,
    hostHandle: 'host',
    hostName: 'Host',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 12,
    teamId: 'LG',
    gameDate: '2026-03-09',
    gameTime: '18:30:00',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    seatDetail: '305블록 12열 15번',
    maxParticipants: 4,
    currentParticipants: 2,
    description: '같이 갑니다',
    ticketVerified: true,
    status: 'PENDING',
    favorited: true,
    members: [{ initial: 'H', role: '호스트', host: true }],
    createdAt: '2026-03-09T00:00:00Z',
  });

  assert.equal(party.hostId, undefined);
  assert.equal(party.hostHandle, 'host');
  assert.equal(party.hostAverageRating, 4.8);
  assert.equal(party.hostReviewCount, 12);
  assert.equal(party.seatDetail, '305블록 12열 15번');
  assert.equal(party.favorited, true);
  assert.deepEqual(party.members, [{ initial: 'H', role: '호스트', host: true }]);
});

test('hasSameMateUserIdentity prefers handle matching over numeric ids', () => {
  assert.equal(
    hasSameMateUserIdentity(
      { id: 1, handle: '@host' },
      { id: 999, handle: '@host' },
    ),
    true,
  );
});

test('hasSameMateUserIdentity matches handles with or without at-prefix', () => {
  assert.equal(
    hasSameMateUserIdentity(
      { handle: 'testuser' },
      { handle: '@testuser' },
    ),
    true,
  );
});

test('hasSameMateUserIdentity matches handles case-insensitively', () => {
  assert.equal(
    hasSameMateUserIdentity(
      { handle: 'TestUser' },
      { handle: '@testuser' },
    ),
    true,
  );
});

test('hasSameMateUserIdentity treats conflicting handles as different even when ids match', () => {
  assert.equal(
    hasSameMateUserIdentity(
      { id: 1, handle: '@host' },
      { id: 1, handle: '@otherhost' },
    ),
    false,
  );
});

test('isPartyHostedByUser matches public party host with current user handle', () => {
  assert.equal(
    isPartyHostedByUser(
      { hostHandle: 'testuser' },
      { id: 77, handle: '@testuser' },
    ),
    true,
  );
});
