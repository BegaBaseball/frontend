import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { createElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';
import { createServer, type ViteDevServer } from 'vite';

import type { CheerPost, EmbeddedPost, LinkedContent } from '../../api/cheerApi';

type CheerCardComponent = ComponentType<{ post: CheerPost; isHotItem?: boolean }>;
type DetailComponent = ComponentType<Record<string, unknown>>;
type ConfirmDialogProviderComponent = ComponentType<{ children?: ReactNode }>;

let viteServer: ViteDevServer;
let CheerCard: CheerCardComponent;
let CheerDetailArticleRuntime: DetailComponent;
let ConfirmDialogProvider: ConfirmDialogProviderComponent;

test.before(async () => {
  viteServer = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: {
        '@': path.resolve('src'),
        sonner: path.resolve('src/shims/sonner.tsx'),
      },
    },
    server: { hmr: false, middlewareMode: true },
  });
  const [cardModule, detailModule, confirmDialogModule] = await Promise.all([
    viteServer.ssrLoadModule('/src/components/CheerCard.tsx'),
    viteServer.ssrLoadModule('/src/components/CheerDetailArticleRuntime.tsx'),
    viteServer.ssrLoadModule('/src/components/contexts/ConfirmDialogContext.tsx'),
  ]);
  CheerCard = cardModule.default as CheerCardComponent;
  CheerDetailArticleRuntime = detailModule.default as DetailComponent;
  ConfirmDialogProvider = confirmDialogModule.ConfirmDialogProvider as ConfirmDialogProviderComponent;
});

test.after(async () => {
  await viteServer.close();
});

const recruitmentLinkedContent: LinkedContent = {
  kind: 'RECRUITMENT',
  available: true,
  checkin: null,
  unavailableReason: null,
  recruitment: {
    partyId: 42,
    gameDate: '2026-07-20',
    homeTeam: 'LG',
    awayTeam: '두산',
    status: 'PENDING',
    recruiting: true,
    description: '원본 모집 설명',
  },
};

const checkinLinkedContent: LinkedContent = {
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

const buildEmbeddedPost = (overrides: Partial<EmbeddedPost> = {}): EmbeddedPost => ({
  id: 99,
  teamId: 'LG',
  teamColor: '#C30452',
  postType: 'RECRUITMENT',
  content: '원본 모집 본문',
  author: '원글 작성자',
  authorHandle: '@original',
  createdAt: '2026-07-13T09:00:00Z',
  imageUrls: [],
  deleted: false,
  linkedContent: recruitmentLinkedContent,
  ...overrides,
});

const buildPost = (overrides: Partial<CheerPost> = {}): CheerPost => ({
  id: 7,
  teamId: 'LG',
  team: 'LG 트윈스',
  postType: 'CHECKIN',
  author: '작성자',
  authorHandle: '@writer',
  content: '상단 게시글 본문',
  timeAgo: '방금 전',
  teamColor: '#C30452',
  likeCount: 0,
  commentCount: 0,
  bookmarkCount: 0,
  repostCount: 0,
  views: 1,
  isHot: false,
  createdAt: '2026-07-14T09:00:00Z',
  updatedAt: '2026-07-14T09:00:00Z',
  liked: false,
  bookmarked: false,
  isOwner: false,
  repostedByMe: false,
  imageUrls: [],
  linkedContent: checkinLinkedContent,
  ...overrides,
});

const renderWithProviders = (element: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderToStaticMarkup(createElement(
    StaticRouter,
    { location: '/cheer' },
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ConfirmDialogProvider, null, element),
    ),
  ));
};

const renderCard = (post: CheerPost, isHotItem = false) => renderWithProviders(
  createElement(CheerCard, { post, isHotItem }),
);

const noop = () => {};

const renderDetail = (selectedPost: CheerPost) => renderWithProviders(createElement(
  CheerDetailArticleRuntime,
  {
    selectedPost,
    authUserId: null,
    authUserHandle: null,
    isLoggedIn: false,
    isOwnerMenuOpen: false,
    isRepostMenuOpen: false,
    interactionBookmarked: false,
    interactionBookmarkCount: 0,
    interactionLikeCount: 0,
    interactionLikedByMe: false,
    interactionRepostCount: 0,
    interactionRepostedByMe: false,
    commentCount: 0,
    detailAccent: '#C30452',
    teamName: 'LG 트윈스',
    primaryBorderStyle: {},
    softBadgeStyle: {},
    surfaceTintStyle: {},
    onDeleteRequested: noop,
    onDisplayEdit: noop,
    onGoBack: noop,
    onNavigateToProfile: noop,
    onOwnerMenuOpenChange: noop,
    onQuoteRepost: noop,
    onRedirectToLogin: noop,
    onReportModalOpenChange: noop,
    onRepostMenuOpenChange: noop,
    onSimpleRepost: noop,
    onToggleBookmark: noop,
    onToggleLike: noop,
    onCancelRepost: noop,
  },
));

test('renders a normal top-level linked post with its compact badge and content', () => {
  const html = renderCard(buildPost());

  assert.match(html, /직관 인증/);
  assert.match(html, /상단 게시글 본문/);
  assert.match(html, /인증 완료/);
  assert.match(html, /class="[^"]*\bp-3\b[^"]*"/);
});

test('renders SIMPLE from the original type, content, and compact linked content', () => {
  const html = renderCard(buildPost({
    postType: 'NORMAL',
    content: '리포스트 래퍼 본문',
    linkedContent: undefined,
    repostType: 'SIMPLE',
    originalPost: buildEmbeddedPost(),
  }));

  assert.match(html, /동행 모집/);
  assert.match(html, /원본 모집 본문/);
  assert.match(html, /원본 모집 설명/);
  assert.match(html, /line-clamp-2/);
  assert.doesNotMatch(html, /리포스트 래퍼 본문/);
});

test('renders QUOTE with the outer content and the embedded original compact card', () => {
  const html = renderCard(buildPost({
    postType: 'NORMAL',
    linkedContent: undefined,
    repostType: 'QUOTE',
    originalPost: buildEmbeddedPost(),
  }));

  assert.match(html, /응원/);
  assert.match(html, /상단 게시글 본문/);
  assert.match(html, /동행 모집/);
  assert.match(html, /원본 모집 본문/);
  assert.match(html, /원본 모집 설명/);
  assert.match(html, /line-clamp-2/);
});

test('renders HOT using the effective linked badge and compact card', () => {
  const html = renderCard(buildPost({ isHot: true }), true);

  assert.match(html, /직관 인증/);
  assert.match(html, /인증 완료/);
  assert.match(html, /class="[^"]*\bp-3\b[^"]*"/);
});

test('renders detail with the effective badge and unclamped detail linked card', () => {
  const html = renderDetail(buildPost({
    postType: 'RECRUITMENT',
    linkedContent: recruitmentLinkedContent,
  }));

  assert.match(html, /동행 모집/);
  assert.match(html, /상단 게시글 본문/);
  assert.match(html, /원본 모집 설명/);
  assert.match(html, /class="[^"]*\bp-4\b[^"]*\bsm:p-5\b[^"]*"/);
  assert.doesNotMatch(html, /line-clamp-2/);
});
