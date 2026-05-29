/// <reference types="cypress" />

import { interceptBaseApis, interceptGuestSession } from '../support/stadiumSeatmap';

// Suite 3-B — Filter Interaction (Jamsil 다차원: level / position / grade)
// -----------------------------------------------------------------
function getJamsilSelectableBlocks() {
  return cy.get('[data-testid="jamsil-seatmap-transform-layer"] path[role="button"][tabindex="0"]', { timeout: 10000 });
}

function getVisibleJamsil(testId: string) {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000 })
    .filter(':visible')
    .first();
}

function getJamsilScrollable(testId: string) {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000 })
    .then(($items) => {
      const visibleItems = $items.filter(':visible');
      return cy.wrap(visibleItems.length > 0 ? visibleItems[0] : $items[0]);
    });
}

function getJamsilOperatorDataStatus() {
  return cy.get('[data-testid="jamsil-operator-data-status"]', { timeout: 10000 })
    .first();
}

function assertJamsilOperatorFallbackFields() {
  [
    'jamsil-operator-entrance',
    'jamsil-operator-facilities',
    'jamsil-operator-notice',
    'jamsil-operator-updated-at',
  ].forEach((testId) => {
    getJamsilScrollable(testId)
      .scrollIntoView()
      .should(($tile) => {
        expect($tile).to.have.attr('data-operator-field-source', 'manual-required');
        expect($tile.text()).to.include('MANUAL_BASEBALL_DATA_REQUIRED');
      });
  });
}

function selectJamsilBlock(query: string, itemTestId: string) {
  getVisibleJamsil('jamsil-block-search')
    .clear();
  getVisibleJamsil('jamsil-block-search')
    .type(query);
  getVisibleJamsil(itemTestId)
    .scrollIntoView()
    .click();
}

describe('Stadium SeatMap — Jamsil Operator Visit UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  afterEach(() => {
    cy.viewport(1280, 720);
  });

  it('101 검색 선택 후 운영자 직관 체크 fallback을 상세 패널에 표시한다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');

    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).filter(':visible').first().scrollIntoView();
    selectJamsilBlock('101', 'jamsil-section-finder-item-block-101');

    cy.contains('h2', '101 블록 1루 레드석', { timeout: 10000 }).should('be.visible');
    getVisibleJamsil('jamsil-operator-visit-check')
      .should('contain', '직관 체크')
      .and('contain', '권장 출입구')
      .and('contain', '가까운 매점/편의시설')
      .and('contain', '오늘의 운영 동선 공지')
      .and('contain', '자료 갱신일')
      .and('contain', '운영자 제공 자료 필요')
      .and('contain', 'MANUAL_BASEBALL_DATA_REQUIRED')
      .and('not.contain', '팬 구분')
      .and('not.contain', '층')
      .and('not.contain', '측');
    assertJamsilOperatorFallbackFields();
    getJamsilOperatorDataStatus()
      .should('exist')
      .should('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
  });

  it('모바일 101B 휠체어석 검색 선택 후 하단 시트에도 fallback을 유지한다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');

    cy.get('[data-testid="stadium-guide-mobile-panels"]', { timeout: 10000 }).should('be.visible');
    selectJamsilBlock('101B', 'jamsil-section-finder-item-accessible-first');

    getVisibleJamsil('jamsil-seatmap-bottom-sheet')
      .should('contain', '1루 휠체어석')
      .and('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
    assertJamsilOperatorFallbackFields();
    getJamsilOperatorDataStatus()
      .should('exist')
      .should('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
  });
});

describe('Stadium SeatMap — Filter Interaction (Jamsil)', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('잠실 1층 필터 클릭 시 선택 가능 블록 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      getJamsilSelectableBlocks()
        .should('have.length.greaterThan', 0)
        .then(($allBlocks) => {
          const allCount = $allBlocks.length;
          // lv-1f는 level(primary) 행 — 토글 없이 바로 클릭
          cy.get('[data-testid="jamsil-filter-lv-1f"]').click();
          getJamsilSelectableBlocks()
            .should('have.length.lessThan', allCount);
        });
    });
  });

  it('잠실 층수 필터 후 전체 클릭 시 선택 가능 블록 수가 복귀한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      getJamsilSelectableBlocks()
        .should('have.length.greaterThan', 0)
        .then(($allBlocks) => {
          const allCount = $allBlocks.length;
          cy.get('[data-testid="jamsil-filter-lv-1f"]').click();
          getJamsilSelectableBlocks()
            .should('have.length.lessThan', allCount);
          // all은 level(primary) 행 — 토글 없이 바로 클릭
          cy.get('[data-testid="jamsil-filter-all"]').click();
          getJamsilSelectableBlocks()
            .should('have.length', allCount);
        });
    });
  });

  it('잠실 1루측 위치 필터 클릭 시 선택 가능 블록 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      getJamsilSelectableBlocks()
        .should('have.length.greaterThan', 0)
        .then(($allBlocks) => {
          const allCount = $allBlocks.length;
          // pos-first는 position(secondary) 행 — 먼저 토글 펼침
          cy.get('[data-testid="jamsil-filter-secondary-toggle"]').click();
          cy.get('[data-testid="jamsil-filter-pos-first"]').click();
          getJamsilSelectableBlocks()
            .should('have.length.lessThan', allCount);
        });
    });
  });

  it('잠실 프리미엄 등급 필터 클릭 시 선택 가능 블록 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      getJamsilSelectableBlocks()
        .should('have.length.greaterThan', 0)
        .then(($allBlocks) => {
          const allCount = $allBlocks.length;
          // premium은 grade(secondary) 행 — 먼저 토글 펼침
          cy.get('[data-testid="jamsil-filter-secondary-toggle"]').click();
          cy.get('[data-testid="jamsil-filter-premium"]').click();
          getJamsilSelectableBlocks()
            .should('have.length.lessThan', allCount);
        });
    });
  });
});

// -----------------------------------------------------------------
