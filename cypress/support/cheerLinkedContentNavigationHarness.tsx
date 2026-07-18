import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { CheerPost, EmbeddedPost as EmbeddedPostType } from '../../src/api/cheerApi';
import CheerCard from '../../src/components/CheerCard';
import { ConfirmDialogProvider } from '../../src/components/contexts/ConfirmDialogContext';

const embeddedRecruitment: EmbeddedPostType = {
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
  linkedContent: {
    kind: 'RECRUITMENT',
    available: true,
    checkin: null,
    unavailableReason: null,
    recruitment: {
      partyId: 42,
      status: 'PENDING',
      recruiting: true,
      description: '함께 응원할 분을 찾습니다.',
    },
  },
};

const quotePost: CheerPost = {
  id: 7,
  teamId: 'LG',
  team: 'LG 트윈스',
  postType: 'NORMAL',
  author: '인용 작성자',
  authorHandle: '@quote',
  content: '인용 본문',
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
  repostType: 'QUOTE',
  originalPost: embeddedRecruitment,
};

function LocationProbe() {
  const location = useLocation();
  return createElement('output', { 'data-testid': 'router-location' }, location.pathname);
}

export function mountCheerLinkedContentNavigationHarness(
  container: Element,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(container);
  root.render(createElement(
    MemoryRouter,
    { initialEntries: ['/quote'] },
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        ConfirmDialogProvider,
        null,
        createElement(
          'section',
          { 'data-testid': 'quote-surface' },
          createElement(CheerCard, { post: quotePost }),
          createElement(LocationProbe),
        ),
      ),
    ),
  ));
  return root;
}
