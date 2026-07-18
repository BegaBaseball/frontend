import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';

import type { LinkedContent, LinkedPostLookup, ShareMode } from '../../api/cheerApi';
import type { CheerWritePayload } from '../CheerWriteModal';
import {
  type LinkedPostTarget,
} from './CheerPresentation';
import { createLinkedComposerRouteLoader } from './CheerLinkedComposerRoute';

const checkinTarget: LinkedPostTarget = { postType: 'CHECKIN', diaryId: 12 };
const checkinPreview: LinkedContent = {
  kind: 'CHECKIN',
  available: true,
  checkin: {
    gameDate: '2026-07-13',
    homeTeam: 'LG',
    awayTeam: '두산',
    cheeringTeam: 'LG',
    stadium: '잠실',
    verified: true,
  },
  recruitment: null,
  unavailableReason: null,
};
const recruitmentTarget: LinkedPostTarget = { postType: 'RECRUITMENT', partyId: 44 };
const recruitmentPreview: LinkedContent = {
  kind: 'RECRUITMENT',
  available: true,
  checkin: null,
  recruitment: {
    partyId: 44,
    description: '잠실 동행 모집',
    gameDate: '2026-07-14',
    homeTeam: 'LG',
    awayTeam: '두산',
    stadium: '잠실',
    maxParticipants: 4,
    currentParticipants: 1,
    status: 'RECRUITING',
  },
  unavailableReason: null,
};

interface ModalContentProps {
  onClose: () => void;
  onSubmit: (payload: CheerWritePayload) => Promise<void>;
  teamColor: string;
  teamAccent: string;
  teamContrastText: string;
  teamLabel: string;
  teamId?: string;
  linkedContent?: LinkedContent;
  linkedPostType?: 'CHECKIN' | 'RECRUITMENT';
}

interface ModalDraft {
  content: string;
  files: File[];
  shareMode: ShareMode;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceLicense?: string;
  sourceLicenseUrl?: string;
  sourceChangedNote?: string;
  sourceSnapshotType?: string;
}

type SubmitModalDraft = (options: {
  draft: ModalDraft;
  linked: boolean;
  onSubmit: (payload: CheerWritePayload) => Promise<void>;
  onSuccess: () => void;
}) => Promise<'blank' | 'missing-external-source' | 'submitted'>;

let viteServer: ViteDevServer;
let CheerWriteModalContent: ComponentType<ModalContentProps>;
let submitCheerWriteModalDraft: SubmitModalDraft;

test.before(async () => {
  viteServer = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    plugins: [{
      name: 'linked-composer-test-shims',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer?.endsWith('/src/components/CheerWriteModal.tsx')) return null;
        if (source === '../store/authStore') return '\0linked-composer-auth-store';
        if (source === './ui/autosize-textarea') return '\0linked-composer-autosize-textarea';
        return null;
      },
      load(id) {
        if (id === '\0linked-composer-auth-store') {
          return 'export const useAuthProfileSnapshot = () => ({});';
        }
        if (id === '\0linked-composer-autosize-textarea') {
          return [
            "import { createElement } from 'react';",
            'export default function AutosizeTextarea({ minRows, maxRows, ...props }) {',
            "  return createElement('textarea', props);",
            '}',
          ].join('\n');
        }
        return null;
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve('src'),
        sonner: path.resolve('src/shims/sonner.tsx'),
      },
    },
    server: { hmr: false, middlewareMode: true },
  });
  const modalModule = await viteServer.ssrLoadModule('/src/components/CheerWriteModal.tsx');
  CheerWriteModalContent = modalModule.CheerWriteModalContent as ComponentType<ModalContentProps>;
  submitCheerWriteModalDraft = modalModule.submitCheerWriteModalDraft as SubmitModalDraft;
});

test.after(async () => {
  await viteServer.close();
});

const makeCallbacks = () => {
  const loading: boolean[] = [];
  const existingPostIds: number[] = [];
  const previews: LinkedContent[] = [];
  const errors: unknown[] = [];
  let invalidTargets = 0;

  return {
    callbacks: {
      onLoadingChange: (value: boolean) => loading.push(value),
      onExistingPost: (postId: number) => existingPostIds.push(postId),
      onNewPreview: (preview: LinkedContent) => previews.push(preview),
      onInvalidTarget: () => { invalidTargets += 1; },
      onError: (error: unknown) => errors.push(error),
    },
    observed: { loading, existingPostIds, previews, errors, get invalidTargets() { return invalidTargets; } },
  };
};

test('authenticated linked lookup runs once and navigates an existing post without opening a modal', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let lookupCalls = 0;
  const lookup = async (): Promise<LinkedPostLookup> => {
    lookupCalls += 1;
    await Promise.resolve();
    return { postId: 81, preview: checkinPreview };
  };

  await Promise.all([
    loader.load({ requested: true, target: checkinTarget, lookup, ...callbacks }),
    loader.load({ requested: true, target: checkinTarget, lookup, ...callbacks }),
  ]);

  assert.equal(lookupCalls, 1);
  assert.deepEqual(observed.existingPostIds, [81]);
  assert.deepEqual(observed.previews, []);
  assert.deepEqual(observed.loading, [true, false]);
  assert.deepEqual(observed.errors, []);
});

test('a new linked target stores the exact normalized preview and opens once', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let lookupCalls = 0;

  await loader.load({
    requested: true,
    target: checkinTarget,
    lookup: async () => {
      lookupCalls += 1;
      return { preview: checkinPreview };
    },
    ...callbacks,
  });

  assert.equal(lookupCalls, 1);
  assert.equal(observed.previews.length, 1);
  assert.equal(observed.previews[0], checkinPreview);
  assert.deepEqual(observed.existingPostIds, []);
  assert.deepEqual(observed.loading, [true, false]);
});

test('invalid runtime source combinations are rejected before lookup', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let lookupCalls = 0;
  const invalidTarget = {
    postType: 'CHECKIN',
    diaryId: 12,
    partyId: 44,
  } as unknown as LinkedPostTarget;

  await loader.load({
    requested: true,
    target: invalidTarget,
    lookup: async () => {
      lookupCalls += 1;
      return { preview: checkinPreview };
    },
    ...callbacks,
  });

  assert.equal(lookupCalls, 0);
  assert.equal(observed.invalidTargets, 1);
  assert.deepEqual(observed.loading, []);
});

test('lookup errors are surfaced once without navigation or modal state', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  const staleError = new Error('CHECKIN_NOT_SHAREABLE');

  await Promise.all([
    loader.load({
      requested: true,
      target: checkinTarget,
      lookup: async () => { throw staleError; },
      ...callbacks,
    }),
    loader.load({
      requested: true,
      target: checkinTarget,
      lookup: async () => { throw new Error('duplicate lookup'); },
      ...callbacks,
    }),
  ]);

  assert.deepEqual(observed.errors, [staleError]);
  assert.deepEqual(observed.existingPostIds, []);
  assert.deepEqual(observed.previews, []);
  assert.deepEqual(observed.loading, [true, false]);
});

test('a late response from an older target cannot overwrite the active linked target', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let resolveCheckin!: (value: LinkedPostLookup) => void;
  let resolveRecruitment!: (value: LinkedPostLookup) => void;
  const checkinLookup = new Promise<LinkedPostLookup>((resolve) => { resolveCheckin = resolve; });
  const recruitmentLookup = new Promise<LinkedPostLookup>((resolve) => { resolveRecruitment = resolve; });

  const olderLoad = loader.load({
    requested: true,
    target: checkinTarget,
    lookup: async () => checkinLookup,
    ...callbacks,
  });
  const activeLoad = loader.load({
    requested: true,
    target: recruitmentTarget,
    lookup: async () => recruitmentLookup,
    ...callbacks,
  });

  resolveRecruitment({ preview: recruitmentPreview });
  await activeLoad;
  resolveCheckin({ preview: checkinPreview });
  await olderLoad;

  assert.deepEqual(observed.previews, [recruitmentPreview]);
  assert.deepEqual(observed.loading, [true, true, false]);
  assert.deepEqual(observed.errors, []);
});

test('clearing a linked route invalidates a late existing-post response', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let resolveLookup!: (value: LinkedPostLookup) => void;
  const lookupResult = new Promise<LinkedPostLookup>((resolve) => { resolveLookup = resolve; });
  const activeLoad = loader.load({
    requested: true,
    target: checkinTarget,
    lookup: async () => lookupResult,
    ...callbacks,
  });

  await loader.load({
    requested: false,
    target: null,
    lookup: async () => ({ preview: checkinPreview }),
    ...callbacks,
  });
  resolveLookup({ postId: 86, preview: checkinPreview });
  await activeLoad;

  assert.deepEqual(observed.existingPostIds, []);
  assert.deepEqual(observed.previews, []);
  assert.deepEqual(observed.errors, []);
  assert.deepEqual(observed.loading, [true]);
});

test('unmount invalidation makes a late lookup error inert', async () => {
  const loader = createLinkedComposerRouteLoader();
  const { callbacks, observed } = makeCallbacks();
  let rejectLookup!: (error: unknown) => void;
  const lookupResult = new Promise<LinkedPostLookup>((_resolve, reject) => { rejectLookup = reject; });
  const activeLoad = loader.load({
    requested: true,
    target: checkinTarget,
    lookup: async () => lookupResult,
    ...callbacks,
  });

  await loader.load({
    requested: false,
    target: null,
    lookup: async () => ({ preview: checkinPreview }),
    ...callbacks,
  });
  rejectLookup(new Error('LATE_UNMOUNT_ERROR'));
  await activeLoad;

  assert.deepEqual(observed.errors, []);
  assert.deepEqual(observed.loading, [true]);
});

test('linked modal renders the fixed Task 7 preview and only user image attachment controls', () => {
  const previewWithPrivatePhotoFields = {
    ...checkinPreview,
    checkin: {
      ...checkinPreview.checkin,
      memo: '비공개 메모',
      photos: ['diary-private.jpg'],
      ticketPhoto: 'ticket-private.jpg',
    },
  } as unknown as LinkedContent;
  const html = renderToStaticMarkup(createElement(CheerWriteModalContent, {
    onClose: () => {},
    onSubmit: async () => {},
    teamColor: '#C30452',
    teamAccent: '#C30452',
    teamContrastText: '#FFFFFF',
    teamLabel: 'LG',
    teamId: 'LG',
    linkedContent: previewWithPrivatePhotoFields,
    linkedPostType: 'CHECKIN',
  }));

  assert.match(html, /직관 인증/);
  assert.match(html, /인증 완료/);
  assert.doesNotMatch(html, /공유 방식|외부 링크|출처 URL|원문 제목|라이선스 URL|스냅샷 유형/);
  assert.doesNotMatch(html, /비공개 메모|diary-private\.jpg|ticket-private\.jpg/);
  assert.match(html, /type="file"[^>]*accept="image\/\*"[^>]*multiple/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>게시하기<\/button>/);
});

test('linked modal submit trims the body, forces internal repost, and excludes external source fields', async () => {
  const userImage = new File(['user'], 'user-cheer.png', { type: 'image/png' });
  let submittedPayload: unknown;
  let successCalls = 0;

  const result = await submitCheerWriteModalDraft({
    draft: {
      content: '  함께 응원해요  ',
      files: [userImage],
      shareMode: 'EXTERNAL_COPY',
      sourceUrl: 'https://external.invalid/source',
      sourceTitle: '외부 제목',
      sourceAuthor: '외부 작성자',
      sourceLicense: '외부 라이선스',
      sourceLicenseUrl: 'https://external.invalid/license',
      sourceChangedNote: '외부 변경',
      sourceSnapshotType: 'HTML',
    },
    linked: true,
    onSubmit: async (payload) => { submittedPayload = payload; },
    onSuccess: () => { successCalls += 1; },
  });

  assert.equal(result, 'submitted');
  assert.deepEqual(submittedPayload, {
    content: '함께 응원해요',
    files: [userImage],
    shareMode: 'INTERNAL_REPOST',
  });
  assert.equal(successCalls, 1);
});

test('blank linked bodies never submit after trimming', async () => {
  let submitCalls = 0;
  let successCalls = 0;
  const result = await submitCheerWriteModalDraft({
    draft: { content: ' \n\t ', files: [], shareMode: 'INTERNAL_REPOST' },
    linked: true,
    onSubmit: async () => { submitCalls += 1; },
    onSuccess: () => { successCalls += 1; },
  });

  assert.equal(result, 'blank');
  assert.equal(submitCalls, 0);
  assert.equal(successCalls, 0);
});

test('linked stale and manual-data failures preserve the draft and never close the modal', async () => {
  const failureCodes = [
    'CHECKIN_NOT_SHAREABLE',
    'PARTY_NOT_RECRUITING',
    'DIARY_NOT_FOUND',
    'PARTY_NOT_FOUND',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ];

  for (const code of failureCodes) {
    const content = `preserved:${code}`;
    let successCalls = 0;
    await assert.rejects(
      submitCheerWriteModalDraft({
        draft: { content, files: [], shareMode: 'INTERNAL_REPOST' },
        linked: true,
        onSubmit: async () => { throw new Error(code); },
        onSuccess: () => { successCalls += 1; },
      }),
      new RegExp(code),
    );
    assert.equal(content, `preserved:${code}`);
    assert.equal(successCalls, 0, code);
  }
});
