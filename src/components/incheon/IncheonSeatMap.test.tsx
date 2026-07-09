import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_VIEW_INFO,
  getIncheonDecisionTags,
  getIncheonFanRoleLabel,
  getIncheonSeatViewAliases,
  getIncheonSideLabel,
  getIncheonSourceLabel,
  type IncheonBlock,
} from '../../data/incheonSeatData';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import IncheonSeatMap, { IncheonOperatorVisitGuidePanel } from './IncheonSeatMap';

const incheonSectionAdapter: SeatMapSectionAdapter<IncheonBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getIncheonSideLabel(section.side),
  getFanRoleLabel: (section) => getIncheonFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getIncheonSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => getIncheonSeatViewAliases(section),
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).distance,
  getNotes: (section) => (INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).notes,
  getTags: (section) => getIncheonDecisionTags(section),
};

test('IncheonSeatMap은 공식 인천 좌석도와 표준 좌석도 markup을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(IncheonSeatMap)));

  assert.match(html, /data-testid="stadium-seat-map"/);
  assert.match(html, /인천SSG랜더스필드/);
  assert.match(html, /인천 SSG 공식 좌석도/);
  assert.match(html, /좌석 배치 기준:/);
  assert.match(html, /홈 응원/);
  assert.match(html, /원정 응원/);
  assert.match(html, /외야/);
  assert.match(html, /휠체어석/);
  assert.match(html, /SSG 랜더스 공식 티켓 안내 2026 좌석도/);
  assert.match(html, /incheon-ssg-seatmap-official-2026\.webp/);
  assert.match(html, /처음 인천 가이드/);
  assert.match(html, /블록\/좌석 검색/);
  assert.match(html, /블록 검색/);
  assert.match(html, /후보 비교/);
  assert.match(html, /비교에 추가/);
  assert.match(html, /data-testid="incheon-first-visit-guide"/);
  assert.match(html, /data-testid="incheon-section-finder"/);
  assert.match(html, /data-testid="incheon-compare-tray"/);
  assert.doesNotMatch(html, /사진은 데모 상태/);
  assert.doesNotMatch(html, /incheon-operator-visit-check/);
  assert.doesNotMatch(html, /data-testid="incheon-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});

test('IncheonSeatMap detail panel은 운영자 직관 안내와 direct 시야 사진 업로드 CTA를 사용한다', () => {
  const selectedBlock = INCHEON_BLOCKS.find((block) => block.block === '101B');
  assert.ok(selectedBlock);
  const IncheonDetailPanel = SeatMapDetailPanel<IncheonBlock>;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sectionQueries = Array.from(new Set(
    [selectedBlock.name, ...getIncheonSeatViewAliases(selectedBlock)]
      .map((value) => value.trim())
      .filter(Boolean),
  ));
  queryClient.setQueryData(['seat-views', 'INCHEON', sectionQueries], []);

  const html = renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(IncheonDetailPanel, {
        section: selectedBlock,
        mode: 'light',
        categories: INCHEON_CATEGORIES,
        adapter: incheonSectionAdapter,
        stadiumKey: 'INCHEON',
        onClose: () => undefined,
        onUpload: () => undefined,
        copy: { uploadLabel: '시야 사진 올리기' },
        extraMeta: (section, accent) => createElement(IncheonOperatorVisitGuidePanel, { section, accent }),
        searchAction: {
          label: '구역 검색',
          ariaLabel: '인천 구역 검색 열기',
          onClick: () => undefined,
          testId: 'incheon-seatmap-search-open',
        },
      }),
    ),
  ));
  queryClient.clear();

  assert.match(html, /직관 동선 안내/);
  assert.match(html, /data-testid="incheon-operator-visit-guide"/);
  assert.match(html, /data-testid="incheon-operator-data-status"/);
  assert.match(html, /data-testid="incheon-operator-row-entrance"/);
  assert.match(html, /data-testid="incheon-operator-row-facilities"/);
  assert.match(html, /data-testid="incheon-operator-row-notice"/);
  assert.match(html, /data-testid="incheon-operator-row-updated"/);
  assert.match(html, /운영자 제공 출입구\/매점\/동선 자료 필요/);
  assert.match(html, /운영자 제공 자료 필요/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(html, /시야 사진 올리기/);
  assert.match(html, /data-testid="incheon-seatmap-search-open"/);
  assert.match(html, /구역 검색/);
  assert.doesNotMatch(html, /사진은 데모 상태/);
});

test('SeatMapBottomSheet는 searchAction 전달 시 구역 검색 버튼을 렌더링한다', () => {
  const selectedBlock = INCHEON_BLOCKS.find((block) => block.block === '101B');
  assert.ok(selectedBlock);
  const IncheonBottomSheet = SeatMapBottomSheet<IncheonBlock>;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sectionQueries = Array.from(new Set(
    [selectedBlock.name, ...getIncheonSeatViewAliases(selectedBlock)]
      .map((value) => value.trim())
      .filter(Boolean),
  ));
  queryClient.setQueryData(['seat-views', 'INCHEON', sectionQueries], []);

  const html = renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(IncheonBottomSheet, {
        section: selectedBlock,
        mode: 'light',
        categories: INCHEON_CATEGORIES,
        adapter: incheonSectionAdapter,
        stadiumKey: 'INCHEON',
        onClose: () => undefined,
        onUpload: () => undefined,
        searchAction: {
          label: '구역 검색',
          ariaLabel: '인천 구역 검색 열기',
          onClick: () => undefined,
          testId: 'incheon-seatmap-mobile-search-open',
        },
      }),
    ),
  ));
  queryClient.clear();

  assert.match(html, /data-testid="incheon-seatmap-mobile-search-open"/);
  assert.match(html, /구역 검색/);
});
