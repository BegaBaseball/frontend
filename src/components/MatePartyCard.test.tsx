import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Party } from '../types/mate';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/test-team-logo.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const { default: MatePartyCard, PartyCompact, PartyRow } = await import('./MatePartyCard');

const noop = () => undefined;

const createParty = (overrides: Partial<Party> = {}): Party => ({
  id: 7,
  hostId: 1,
  hostHandle: '@host',
  hostName: '호스트',
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.8,
  hostReviewCount: 3,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-03-28',
  gameTime: '18:30',
  stadium: '잠실',
  homeTeam: 'LG',
  awayTeam: 'OB',
  section: '1루 내야',
  maxParticipants: 2,
  currentParticipants: 1,
  description: '같이 응원해요',
  ticketVerified: true,
  status: 'PENDING',
  reservationDepositAmount: null,
  hostTrustMetrics: null,
  createdAt: '2026-03-01T00:00:00',
  ...overrides,
});

test('MatePartyCard exposes favorite toggle state separately from detail navigation', () => {
  const party = createParty({ favorited: true });
  const html = renderToStaticMarkup(createElement(MatePartyCard, {
    party,
    todayKey: '2026-03-28',
    onClick: noop,
    onFavoriteToggle: noop,
  }));

  assert.match(html, /aria-label="찜 해제"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /파티 상세 보기/);
});

test('PartyRow and PartyCompact expose disabled favorite buttons while updating', () => {
  const party = createParty({ favorited: false });
  const rowHtml = renderToStaticMarkup(createElement(PartyRow, {
    party,
    todayKey: '2026-03-28',
    onClick: noop,
    onFavoriteToggle: noop,
    favoriteUpdating: true,
  }));
  const compactHtml = renderToStaticMarkup(createElement(PartyCompact, {
    party,
    todayKey: '2026-03-28',
    onClick: noop,
    onFavoriteToggle: noop,
    favoriteUpdating: true,
  }));

  assert.match(rowHtml, /aria-label="찜하기"/);
  assert.match(rowHtml, /disabled=""/);
  assert.match(compactHtml, /aria-label="찜하기"/);
  assert.match(compactHtml, /disabled=""/);
});
