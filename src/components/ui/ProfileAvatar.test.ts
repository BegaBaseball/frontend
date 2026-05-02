import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProfileAvatar } from './ProfileAvatar';

test('cheer 아바타는 고정 크기 img 속성과 원형 렌더링을 유지한다', () => {
  const html = renderToStaticMarkup(createElement(ProfileAvatar, {
    src: 'https://example.com/avatar.webp',
    alt: '프로필',
    fallbackName: '프로필',
    width: 40,
    height: 40,
    showRing: true,
    ringVariant: 'cheerFeed',
  }));

  assert.match(html, /data-testid="profile-avatar-frame"/);
  assert.match(html, /data-testid="profile-avatar-image"/);
  assert.match(html, /width="40"/);
  assert.match(html, /height="40"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /object-cover/);
  assert.match(html, /rounded-full/);
  assert.match(html, /overflow-hidden/);
  assert.doesNotMatch(html, /avatar-circle-mask/);
});

test('cheer 아바타 fallback도 동일한 원형 프레임을 유지한다', () => {
  const html = renderToStaticMarkup(createElement(ProfileAvatar, {
    alt: '홍길동',
    fallbackName: '홍길동',
    width: 48,
    height: 48,
    showRing: true,
    ringVariant: 'cheerFeed',
  }));

  assert.match(html, /data-testid="profile-avatar-frame"/);
  assert.match(html, /data-testid="profile-avatar-fallback"/);
  assert.match(html, /rounded-full/);
  assert.match(html, /overflow-hidden/);
  assert.doesNotMatch(html, /avatar-circle-mask/);
  assert.match(html, /width:48px/);
  assert.match(html, /height:48px/);
});

test('ring 없는 아바타는 클래스 크기를 유지하고 부모 폭으로 늘어나지 않는다', () => {
  const html = renderToStaticMarkup(createElement(ProfileAvatar, {
    src: 'https://example.com/avatar.webp',
    alt: '테스트 유저',
    fallbackName: '테스트 유저',
    className: 'w-20 h-20 md:w-24 md:h-24',
  }));

  assert.match(html, /data-testid="profile-avatar-image"/);
  assert.match(html, /w-20 h-20 md:w-24 md:h-24/);
  assert.doesNotMatch(html, /width:100%/);
  assert.doesNotMatch(html, /height:100%/);
});
