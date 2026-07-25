import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AchievementCelebrationOverlay from './AchievementCelebrationOverlay';
import type { AchievementDto } from '../types/diary';

const noop = () => undefined;

const buildAchievement = (overrides: Partial<AchievementDto> = {}): AchievementDto => ({
  id: 1,
  code: 'FIRST_ATTENDANCE',
  name: '첫 직관',
  description: '처음으로 직관 기록을 남겼습니다!',
  iconUrl: null,
  rarity: 'COMMON',
  rarityKo: '일반',
  rarityColor: '#8a8a8a',
  pointsRequired: 0,
  earned: true,
  earnedAt: '2026-03-23T00:00:00',
  ...overrides,
});

test('achievement이 있으면 배지 획득 태그와 제목/설명을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(AchievementCelebrationOverlay, {
    achievement: buildAchievement(),
    onClose: noop,
  }));

  assert.match(html, /배지 획득/);
  assert.match(html, /첫 직관/);
  assert.match(html, /처음으로 직관 기록을 남겼습니다/);
});

test('achievement이 null이면 아무것도 렌더링하지 않는다', () => {
  const html = renderToStaticMarkup(createElement(AchievementCelebrationOverlay, {
    achievement: null,
    onClose: noop,
  }));

  assert.equal(html, '');
});

test('description이 없으면 설명 문단을 생략한다', () => {
  const html = renderToStaticMarkup(createElement(AchievementCelebrationOverlay, {
    achievement: buildAchievement({ description: null }),
    onClose: noop,
  }));

  assert.match(html, /첫 직관/);
  assert.doesNotMatch(html, /<p[^>]*>처음으로/);
});
