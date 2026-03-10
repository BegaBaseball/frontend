import test from 'node:test';
import assert from 'node:assert/strict';

import { hasSameMateUserIdentity, isPartyHostedByUser, mapBackendPartyToFrontend } from './mate';

test('mapBackendPartyToFrontend tolerates public party payload without hostId', () => {
  const party = mapBackendPartyToFrontend({
    id: 1,
    hostHandle: '@host',
    hostName: 'Host',
    hostBadge: 'VERIFIED',
    hostRating: 4.8,
    teamId: 'LG',
    gameDate: '2026-03-09',
    gameTime: '18:30:00',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    maxParticipants: 4,
    currentParticipants: 2,
    description: '같이 갑니다',
    ticketVerified: true,
    status: 'PENDING',
    createdAt: '2026-03-09T00:00:00Z',
  });

  assert.equal(party.hostId, undefined);
  assert.equal(party.hostHandle, '@host');
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

test('isPartyHostedByUser matches public party host with current user handle', () => {
  assert.equal(
    isPartyHostedByUser(
      { hostHandle: '@host' },
      { id: 77, handle: '@host' },
    ),
    true,
  );
});
