import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { DiaryEntry, DiaryFormData } from '../../types/diary';
import type { Party } from '../../types/mate';
import {
  buildMateShareActions,
  canShareDiaryToCheer,
  canSharePartyToCheer,
  createCheerLinkedEntryAction,
} from './CheerLinkedEntryActions';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) {
      return { format: 'module', shortCircuit: true, source: 'export default {};' };
    }
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/task-9-test-image.png";',
      };
    }
    return nextLoad(url, context);
  },
});

const noop = () => undefined;
const failOnError = (error: unknown): never => {
  throw error instanceof Error ? error : new Error(String(error));
};

const createDiary = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 73,
  date: '2026-07-15',
  type: 'attended',
  emoji: '/task-9-test-image.png',
  emojiName: '즐거움',
  winningName: 'WIN',
  gameId: 8,
  memo: '좋은 경기',
  photos: ['private-diary-photo.jpg'],
  team: '홈팀',
  stadium: '테스트 구장',
  ticketVerified: true,
  ...overrides,
});

const createDiaryForm = (diary: DiaryEntry): DiaryFormData => ({
  type: diary.type,
  emoji: diary.emoji,
  emojiName: diary.emojiName,
  winningName: diary.winningName,
  gameId: diary.gameId,
  memo: diary.memo,
  photos: diary.photos,
  photoStoragePaths: ['private/storage/path.jpg'],
  photoFiles: [],
  ticketVerificationToken: 'private-ticket-token',
  ticketVerified: diary.ticketVerified,
});

const createParty = (overrides: Partial<Party> = {}): Party => ({
  id: 44,
  hostId: 1,
  hostHandle: '@host',
  hostName: '호스트',
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.8,
  hostReviewCount: 3,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-07-20',
  gameTime: '18:30',
  stadium: '테스트 구장',
  homeTeam: '홈팀',
  awayTeam: '원정팀',
  section: '1루 내야',
  maxParticipants: 2,
  currentParticipants: 1,
  description: '같이 응원해요',
  ticketVerified: true,
  ticketImageUrl: 'private-party-ticket.jpg',
  status: 'PENDING',
  reservationDepositAmount: null,
  hostTrustMetrics: null,
  createdAt: '2026-07-01T00:00:00',
  ...overrides,
});

test('diary and party share eligibility follows the exact domain casing matrix', () => {
  assert.equal(canShareDiaryToCheer({ type: 'attended', ticketVerified: true }), true);
  assert.equal(canShareDiaryToCheer({ type: 'scheduled', ticketVerified: true }), false);
  assert.equal(canShareDiaryToCheer({ type: 'attended', ticketVerified: false }), false);
  assert.equal(canShareDiaryToCheer({ type: 'attended' }), false);

  assert.equal(canSharePartyToCheer({ isHost: true, status: 'PENDING' }), true);
  assert.equal(canSharePartyToCheer({ isHost: false, status: 'PENDING' }), false);
  assert.equal(canSharePartyToCheer({ isHost: true, status: 'MATCHED' }), false);
});

test('lookup-first diary action navigates to the exact existing post with ID-only input', async () => {
  const action = createCheerLinkedEntryAction();
  const lookups: unknown[] = [];
  const navigations: string[] = [];

  await action.run({
    target: { kind: 'diary', id: 73 },
    lookup: async (params) => {
      lookups.push(params);
      return { postId: 91 };
    },
    navigate: (path) => navigations.push(path),
    onLoadingChange: noop,
    onError: failOnError,
  });

  assert.deepEqual(lookups, [{ diaryId: 73 }]);
  assert.deepEqual(Object.keys(lookups[0] as object), ['diaryId']);
  assert.deepEqual(navigations, ['/cheer/91']);
});

test('new diary and party actions use the canonical Task 8 write routes', async () => {
  const diaryNavigations: string[] = [];
  const partyNavigations: string[] = [];

  await createCheerLinkedEntryAction().run({
    target: { kind: 'diary', id: 73 },
    lookup: async () => ({ postId: null }),
    navigate: (path) => diaryNavigations.push(path),
    onLoadingChange: noop,
    onError: failOnError,
  });
  await createCheerLinkedEntryAction().run({
    target: { kind: 'party', id: 44 },
    lookup: async (params) => {
      assert.deepEqual(params, { partyId: 44 });
      assert.deepEqual(Object.keys(params), ['partyId']);
      return {};
    },
    navigate: (path) => partyNavigations.push(path),
    onLoadingChange: noop,
    onError: failOnError,
  });

  assert.deepEqual(diaryNavigations, ['/cheer/write?postType=CHECKIN&diaryId=73']);
  assert.deepEqual(partyNavigations, ['/cheer/write?postType=RECRUITMENT&partyId=44']);
});

test('invalid or missing IDs fail before lookup and navigation', async () => {
  for (const id of [undefined, null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    let lookupCalls = 0;
    const navigations: string[] = [];
    const errors: unknown[] = [];
    const loading: boolean[] = [];

    await createCheerLinkedEntryAction().run({
      target: { kind: 'diary', id },
      lookup: async () => {
        lookupCalls += 1;
        return {};
      },
      navigate: (path) => navigations.push(path),
      onLoadingChange: (value) => loading.push(value),
      onError: (error) => errors.push(error),
    });

    assert.equal(lookupCalls, 0);
    assert.deepEqual(navigations, []);
    assert.equal(errors.length, 1);
    assert.deepEqual(loading, []);
  }
});

test('double activation performs one lookup and one navigation with accessible loading state', async () => {
  const action = createCheerLinkedEntryAction();
  const loading: boolean[] = [];
  const navigations: string[] = [];
  let lookupCalls = 0;
  let resolveLookup!: (value: { postId: number }) => void;
  const lookupResult = new Promise<{ postId: number }>((resolve) => { resolveLookup = resolve; });
  const input = {
    target: { kind: 'party' as const, id: 44 },
    lookup: async () => {
      lookupCalls += 1;
      return lookupResult;
    },
    navigate: (path: string) => navigations.push(path),
    onLoadingChange: (value: boolean) => loading.push(value),
    onError: failOnError,
  };

  const first = action.run(input);
  const second = action.run(input);
  resolveLookup({ postId: 92 });
  await Promise.all([first, second]);

  assert.equal(lookupCalls, 1);
  assert.deepEqual(navigations, ['/cheer/92']);
  assert.deepEqual(loading, [true, false]);
});

test('lookup error is surfaced without navigation and permits a later retry', async () => {
  const action = createCheerLinkedEntryAction();
  const errors: unknown[] = [];
  const navigations: string[] = [];
  const loading: boolean[] = [];
  const lookupError = new Error('LOOKUP_FAILED');

  await action.run({
    target: { kind: 'party', id: 44 },
    lookup: async () => { throw lookupError; },
    navigate: (path) => navigations.push(path),
    onLoadingChange: (value) => loading.push(value),
    onError: (error) => errors.push(error),
  });
  await action.run({
    target: { kind: 'party', id: 44 },
    lookup: async () => ({ postId: 93 }),
    navigate: (path) => navigations.push(path),
    onLoadingChange: (value) => loading.push(value),
    onError: (error) => errors.push(error),
  });

  assert.deepEqual(errors, [lookupError]);
  assert.deepEqual(navigations, ['/cheer/93']);
  assert.deepEqual(loading, [true, false, true, false]);
});

test('invalidation makes a late lookup result inert and allows the new target to navigate', async () => {
  const action = createCheerLinkedEntryAction();
  const loading: boolean[] = [];
  const errors: unknown[] = [];
  const navigations: string[] = [];
  let resolveOldLookup!: (value: { postId: number }) => void;
  const oldLookup = new Promise<{ postId: number }>((resolve) => { resolveOldLookup = resolve; });

  const staleRun = action.run({
    target: { kind: 'diary', id: 73 },
    lookup: async () => oldLookup,
    navigate: (path) => navigations.push(path),
    onLoadingChange: (value) => loading.push(value),
    onError: (error) => errors.push(error),
  });
  action.invalidate();
  const currentRun = action.run({
    target: { kind: 'diary', id: 74 },
    lookup: async () => ({ postId: 94 }),
    navigate: (path) => navigations.push(path),
    onLoadingChange: (value) => loading.push(value),
    onError: (error) => errors.push(error),
  });

  await currentRun;
  resolveOldLookup({ postId: 93 });
  await staleRun;

  assert.deepEqual(navigations, ['/cheer/94']);
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, true, false]);
});

test('mate friend share remains independently wired from the conditional cheer action', () => {
  let friendShares = 0;
  let cheerShares = 0;
  const actions = buildMateShareActions({
    isHost: true,
    status: 'PENDING',
    onShare: () => { friendShares += 1; },
    onShareToCheer: () => { cheerShares += 1; },
  });

  actions.friend.onClick();
  assert.equal(friendShares, 1);
  assert.equal(cheerShares, 0);
  assert.equal(actions.friend.label, '친구에게 공유');
  assert.equal(actions.cheer?.label, '응원석에 공유');

  const nonHostActions = buildMateShareActions({
    isHost: false,
    status: 'PENDING',
    onShare: noop,
    onShareToCheer: noop,
  });
  assert.equal(nonHostActions.cheer, null);
});

test('Diary read mode keeps edit/delete and renders a reasoned disabled cheer control', async () => {
  const { DiaryReadMode } = await import('../mypage/DiaryformRuntime');
  const scheduledDiary = createDiary({ type: 'scheduled', ticketVerified: true });
  const html = renderToStaticMarkup(createElement(DiaryReadMode, {
    diaryForm: createDiaryForm(scheduledDiary),
    selectedDiary: scheduledDiary,
    setIsEditMode: noop,
    handleDeleteDiary: noop,
    deleteMutation: { isPending: false } as never,
    onShareToCheer: noop,
    isShareToCheerPending: false,
  }));

  assert.match(html, /수정하기/);
  assert.match(html, />삭제</);
  assert.match(html, /data-testid="share-diary-to-cheer-btn"/);
  assert.match(html, /응원석에 공유/);
  assert.match(html, /직관 완료와 티켓 인증 후 응원석에 공유할 수 있습니다/);
  assert.match(html, /disabled=""/);
});

test('eligible Diary read mode enables the cheer control and exposes loading semantics', async () => {
  const { DiaryReadMode } = await import('../mypage/DiaryformRuntime');
  const diary = createDiary();
  const enabledHtml = renderToStaticMarkup(createElement(DiaryReadMode, {
    diaryForm: createDiaryForm(diary),
    selectedDiary: diary,
    setIsEditMode: noop,
    handleDeleteDiary: noop,
    deleteMutation: { isPending: false } as never,
    onShareToCheer: noop,
    isShareToCheerPending: false,
  }));
  const loadingHtml = renderToStaticMarkup(createElement(DiaryReadMode, {
    diaryForm: createDiaryForm(diary),
    selectedDiary: diary,
    setIsEditMode: noop,
    handleDeleteDiary: noop,
    deleteMutation: { isPending: false } as never,
    onShareToCheer: noop,
    isShareToCheerPending: true,
  }));

  assert.doesNotMatch(enabledHtml, /data-testid="share-diary-to-cheer-btn"[^>]*disabled/);
  assert.match(loadingHtml, /data-testid="share-diary-to-cheer-btn"[^>]*disabled/);
  assert.match(loadingHtml, /aria-busy="true"/);
  assert.match(loadingHtml, /공유 확인 중/);
});

test('Mate action section shows separate friend and host-pending cheer controls only', async () => {
  const { default: MateDetailActionSection } = await import('../MateDetailActionSection');
  const baseProps = {
    party: createParty(),
    actionContext: { eyebrow: '호스트 모드', title: '관리', detail: '상세' },
    actionButtons: [],
    isAwaitingApproval: false,
    primaryMobileAction: null,
    canAccessCheckIn: false,
    onOpenQrPanel: noop,
    onShare: noop,
    onShareToCheer: noop,
    isShareToCheerPending: false,
    onBrowsePartyList: noop,
  };
  const hostPendingHtml = renderToStaticMarkup(createElement(MateDetailActionSection, {
    ...baseProps,
    isHost: true,
  }));
  const nonHostHtml = renderToStaticMarkup(createElement(MateDetailActionSection, {
    ...baseProps,
    isHost: false,
  }));
  const matchedHostHtml = renderToStaticMarkup(createElement(MateDetailActionSection, {
    ...baseProps,
    party: createParty({ status: 'MATCHED' }),
    isHost: true,
  }));

  assert.match(hostPendingHtml, /친구에게 공유/);
  assert.match(hostPendingHtml, /data-testid="share-party-to-cheer-btn"/);
  assert.match(hostPendingHtml, /응원석에 공유/);
  assert.match(nonHostHtml, /친구에게 공유/);
  assert.doesNotMatch(nonHostHtml, /share-party-to-cheer-btn/);
  assert.match(matchedHostHtml, /친구에게 공유/);
  assert.doesNotMatch(matchedHostHtml, /share-party-to-cheer-btn/);
});
