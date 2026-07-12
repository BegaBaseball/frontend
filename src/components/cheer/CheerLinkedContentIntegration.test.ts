import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readComponent = (name: string) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('CheerCard uses original type/content for simple reposts and renders linked cards on feed and HOT surfaces', async () => {
  const source = await readComponent('CheerCard.tsx');

  assert.match(source, /effectivePostType/);
  assert.match(source, /post\.originalPost\.postType/);
  assert.match(source, /effectiveLinkedContent/);
  assert.match(source, /post\.originalPost\.linkedContent/);
  assert.ok((source.match(/<CheerLinkedContentCard/g) ?? []).length >= 2);
  assert.match(source, /CHECKIN:[\s\S]*직관 인증/);
  assert.match(source, /RECRUITMENT:[\s\S]*동행 모집/);
  assert.match(source, /if \(isHotItem\)[\s\S]{0,900}target\?\.closest\?\.\('\[data-skip-cheer-card-nav\]'\)/);
});

test('detail renders the effective simple-repost linked content with the detail variant', async () => {
  const source = await readComponent('CheerDetailArticleRuntime.tsx');

  assert.match(source, /effectivePostType/);
  assert.match(source, /selectedPost\.originalPost\.postType/);
  assert.match(source, /effectiveLinkedContent/);
  assert.match(source, /selectedPost\.originalPost\.linkedContent/);
  assert.match(source, /<CheerLinkedContentCard linkedContent=\{effectiveLinkedContent\} variant="detail"/);
});

test('embedded originals render their own badge and compact linked content', async () => {
  const [embeddedSource, detailRuntimeSource] = await Promise.all([
    readComponent('EmbeddedPost.tsx'),
    readComponent('CheerDetailEmbeddedPostRuntime.tsx'),
  ]);

  assert.match(embeddedSource, /post\.postType/);
  assert.match(embeddedSource, /post\.linkedContent/);
  assert.match(embeddedSource, /<CheerLinkedContentCard/);
  assert.match(detailRuntimeSource, /linkedContentVariant="compact"/);
});

test('embedded post navigation yields to linked recruitment CTAs', async () => {
  const embeddedModule = await import('../EmbeddedPost');
  const shouldSkipEmbeddedPostNavigation = (
    embeddedModule as typeof embeddedModule & {
      shouldSkipEmbeddedPostNavigation?: (target: EventTarget | null) => boolean;
    }
  ).shouldSkipEmbeddedPostNavigation;
  const linkedCta = {
    closest: (selector: string) => selector === '[data-skip-cheer-card-nav]' ? linkedCta : null,
  } as unknown as EventTarget;

  assert.equal(typeof shouldSkipEmbeddedPostNavigation, 'function');
  assert.equal(shouldSkipEmbeddedPostNavigation?.(linkedCta), true);
  assert.equal(shouldSkipEmbeddedPostNavigation?.({ closest: () => null } as unknown as EventTarget), false);
});
