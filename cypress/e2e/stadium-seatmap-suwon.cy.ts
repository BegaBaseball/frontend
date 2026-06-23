/// <reference types="cypress" />

import { interceptBaseApis, interceptGuestSession, withinVisibleStadiumSeatMap } from '../support/stadiumSeatmap';

// Suite 4-B — Suwon Finder UX
// -----------------------------------------------------------------
function getVisibleSuwon(testId: string) {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000 })
    .filter(':visible')
    .first();
}

function getSuwonScrollable(testId: string) {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000 })
    .then(($items) => {
      const visibleItems = $items.filter(':visible');
      return cy.wrap(visibleItems.length > 0 ? visibleItems[0] : $items[0]);
    });
}

const SUWON_MOBILE_TOOL_TAB_TEST_IDS = {
  guide: 'suwon-mobile-tool-tab-guide',
  finder: 'suwon-mobile-tool-tab-finder',
} as const;

function openSuwonMobileToolTab(tab: 'guide' | 'finder') {
  const testId = SUWON_MOBILE_TOOL_TAB_TEST_IDS[tab];
  getVisibleSuwon(testId)
    .click();
  getVisibleSuwon(testId)
    .should('have.attr', 'aria-selected', 'true');
}

function assertSuwonOperatorFallbackFields() {
  [
    'suwon-operator-entrance',
    'suwon-operator-facilities',
    'suwon-operator-notice',
    'suwon-operator-updated-at',
  ].forEach((testId) => {
    getSuwonScrollable(testId)
      .scrollIntoView()
      .should(($tile) => {
        expect($tile).to.have.attr('data-operator-field-source', 'manual-required');
        expect($tile.text()).to.include('MANUAL_BASEBALL_DATA_REQUIRED');
      });
  });
}

function selectSuwonStadium() {
  cy.get('#stadium-guide-select').select('SUWON');
  cy.wait('@getSuwonPlaces');
  cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).scrollIntoView();
  getVisibleSuwon('suwon-seatmap-svg').should('be.visible');
}

function selectSuwonBlock(query: string, itemTestId: string) {
  cy.get(
    '[data-testid="suwon-block-search"], [data-testid="suwon-seatmap-search-open"], [data-testid="suwon-seatmap-mobile-search-open"]',
    { timeout: 10000 },
  )
    .then(($controls) => {
      if ($controls.filter('[data-testid="suwon-block-search"]:visible').length === 0) {
        cy.wrap(
          $controls
            .filter('[data-testid="suwon-seatmap-search-open"], [data-testid="suwon-seatmap-mobile-search-open"]')
            .first(),
        ).click({ force: true });
      }
    });

  getVisibleSuwon('suwon-block-search')
    .clear()
    .type(query);
  getVisibleSuwon(itemTestId)
    .click();
}

function addVisibleSuwonSelectionToCompare() {
  getSuwonScrollable('suwon-compare-add')
    .click({ scrollBehavior: 'center' });
}

function assertSuwonFocusZoom() {
  getVisibleSuwon('suwon-seatmap-transform-layer')
    .invoke('attr', 'data-zoom')
    .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
}

describe('Stadium SeatMap — Suwon Finder UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  afterEach(() => {
    cy.viewport(1280, 720);
  });

  it('스카이박스 검색 선택은 상세 패널과 focus zoom으로 연결된다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-first-visit-guide')
      .should('contain', '처음 수원 가이드');
    getVisibleSuwon('suwon-section-finder')
      .should('contain', '블록 검색');
    getVisibleSuwon('suwon-block-search')
      .should('be.visible');

    selectSuwonBlock('스카이박스 22', 'suwon-section-finder-item-suwon-sb22');

    cy.contains('h2', '22 스카이박스', { timeout: 10000 }).should('be.visible');
    cy.contains('p', '블록 SB22').should('be.visible');
    cy.get('[data-testid="stadium-guide-seatmap"]').should('contain', '스카이박스');
    getVisibleSuwon('suwon-operator-visit-check')
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
    assertSuwonOperatorFallbackFields();
    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="suwon-operator-data-status"]', { timeout: 10000 })
        .scrollIntoView()
        .should('be.visible')
        .should('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
    });
    getVisibleSuwon('suwon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
  });

  it('후보 비교 트레이는 3개 비교, 보기, 제거, 비우기 흐름을 지원한다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-compare-tray')
      .should('contain', '후보 비교')
      .and('contain', '0/3개 선택')
      .and('contain', '블록 상세에서 비교에 추가');

    selectSuwonBlock('117', 'suwon-section-finder-item-suwon-117');
    addVisibleSuwonSelectionToCompare();
    getVisibleSuwon('suwon-compare-card-suwon-117')
      .should('contain', '117')
      .and('contain', '중앙지정석');

    selectSuwonBlock('118', 'suwon-section-finder-item-suwon-118');
    addVisibleSuwonSelectionToCompare();
    getVisibleSuwon('suwon-compare-card-suwon-118')
      .should('contain', '118')
      .and('contain', '중앙지정석');

    selectSuwonBlock('스카이박스 22', 'suwon-section-finder-item-suwon-sb22');
    addVisibleSuwonSelectionToCompare();
    getVisibleSuwon('suwon-compare-tray')
      .should('contain', '3/3개 선택');
    getVisibleSuwon('suwon-compare-card-suwon-sb22')
      .should('contain', 'SB22')
      .and('contain', '22 스카이박스');

    selectSuwonBlock('107', 'suwon-section-finder-item-suwon-107');
    getSuwonScrollable('suwon-compare-add')
      .scrollIntoView()
      .should('be.disabled')
      .and('contain', '비교는 3개까지');

    getVisibleSuwon('suwon-compare-card-suwon-118')
      .find('[data-testid="suwon-compare-view"]')
      .click();
    cy.contains('h2', '118 중앙지정석', { timeout: 10000 }).should('exist');
    cy.contains('p', '블록 118').should('exist');
    assertSuwonFocusZoom();
    getVisibleSuwon('suwon-seat-hit-suwon-118')
      .should('have.attr', 'data-compared', 'true');

    getVisibleSuwon('suwon-compare-card-suwon-117')
      .find('[data-testid="suwon-compare-remove"]')
      .click();
    cy.get('[data-testid="suwon-compare-card-suwon-117"]').should('not.exist');

    getVisibleSuwon('suwon-compare-clear')
      .click();
    cy.get('[data-testid^="suwon-compare-card-"]').should('not.exist');
    getVisibleSuwon('suwon-compare-tray')
      .should('contain', '0/3개 선택')
      .and('contain', '블록 상세에서 비교에 추가');
  });

  it('처음 수원 가이드는 홈 응원 대표 블록을 상세 패널로 연결한다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getSuwonScrollable('suwon-guide-intent-home')
      .scrollIntoView()
      .should('be.visible')
      .click();
    getSuwonScrollable('suwon-guide-result-suwon-107')
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.contains('h2', '107 1루 응원지정석', { timeout: 10000 }).should('be.visible');
    cy.contains('p', '블록 107').should('exist');
    getVisibleSuwon('suwon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
  });

  it('필터 변경 시 finder 검색 결과가 현재 수원 필터와 동기화된다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-block-search')
      .clear()
      .type('117 중앙지정석');
    getVisibleSuwon('suwon-section-finder-item-suwon-117')
      .should('be.visible');

    getVisibleSuwon('suwon-filter-sky')
      .click();
    getVisibleSuwon('suwon-filter-sky')
      .should('have.attr', 'aria-pressed', 'true');
    getVisibleSuwon('suwon-section-finder')
      .should('not.contain', '117 중앙지정석');
  });

  it('키보드로 수원 블록 검색 결과와 SVG 블록을 선택할 수 있다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-block-search')
      .focus()
      .type('117');
    getVisibleSuwon('suwon-section-finder-item-suwon-117')
      .should('be.visible')
      .focus();
    cy.focused()
      .should('have.attr', 'data-testid', 'suwon-section-finder-item-suwon-117')
      .trigger('keydown', { key: 'Enter' });

    cy.contains('h2', '117 중앙지정석', { timeout: 10000 }).should('be.visible');
    cy.contains('p', '블록 117').should('be.visible');
    getVisibleSuwon('suwon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
    getVisibleSuwon('suwon-seat-hit-suwon-117')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-label', '117 중앙지정석')
      .and('have.attr', 'aria-pressed', 'true');

    getVisibleSuwon('suwon-seat-hit-suwon-118')
      .should('have.attr', 'aria-pressed', 'false')
      .focus();
    cy.focused()
      .should('have.attr', 'data-testid', 'suwon-seat-hit-suwon-118')
      .trigger('keydown', { key: ' ' });

    getVisibleSuwon('suwon-seat-hit-suwon-118')
      .should('have.attr', 'aria-pressed', 'true');
    cy.contains('h2', '118 중앙지정석', { timeout: 10000 }).should('exist');
    cy.contains('p', '블록 118').should('exist');
  });

  it('모바일 검색 선택은 수원 하단 시트와 focus zoom으로 연결된다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-mobile-secondary-panel')
      .should('contain', '처음 가이드')
      .and('contain', '블록 검색');
    getVisibleSuwon('suwon-mobile-tool-tab-guide')
      .should('have.attr', 'role', 'tab')
      .should('have.attr', 'aria-selected', 'true');
    getVisibleSuwon('suwon-mobile-tool-tab-finder')
      .should('have.attr', 'role', 'tab')
      .and('have.attr', 'aria-selected', 'false');
    getVisibleSuwon('suwon-first-visit-guide')
      .should('contain', '처음 수원 가이드');
    cy.get('body').then(($body) => {
      expect($body.find('[data-testid="suwon-section-finder"]:visible')).to.have.length(0);
    });
    openSuwonMobileToolTab('finder');
    selectSuwonBlock('117', 'suwon-section-finder-item-suwon-117');

    getVisibleSuwon('suwon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
    getVisibleSuwon('suwon-seatmap-bottom-sheet')
      .should('contain', '117 중앙지정석')
      .and('contain', '블록')
      .and('contain', '117')
      .and('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
    assertSuwonOperatorFallbackFields();
  });

  it('모바일 후보 비교는 가이드와 finder 선택을 유지하고 카드 보기로 하단 시트를 연다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-mobile-secondary-panel')
      .should('be.visible');
    getSuwonScrollable('suwon-guide-intent-home')
      .scrollIntoView()
      .should('be.visible')
      .click();
    getSuwonScrollable('suwon-guide-result-suwon-107')
      .scrollIntoView()
      .should('be.visible')
      .click();
    getVisibleSuwon('suwon-seatmap-bottom-sheet')
      .should('contain', '107 1루 응원지정석');
    getVisibleSuwon('suwon-recent-card-suwon-107')
      .should('contain', '107 1루 응원지정석');
    getVisibleSuwon('suwon-recent-card-suwon-107')
      .find('[data-testid="suwon-recent-view"]')
      .should('be.visible');
    getVisibleSuwon('suwon-recent-card-suwon-107')
      .find('[data-testid="suwon-recent-add"]')
      .should('be.visible');
    addVisibleSuwonSelectionToCompare();
    getVisibleSuwon('suwon-compare-card-suwon-107')
      .should('contain', '107')
      .and('contain', '1루 응원지정석');

    openSuwonMobileToolTab('finder');
    selectSuwonBlock('117', 'suwon-section-finder-item-suwon-117');
    getVisibleSuwon('suwon-seatmap-bottom-sheet')
      .should('contain', '117 중앙지정석');
    addVisibleSuwonSelectionToCompare();

    getVisibleSuwon('suwon-compare-tray')
      .should('contain', '2/3개 선택');
    getVisibleSuwon('suwon-compare-card-suwon-117')
      .should('contain', '117')
      .and('contain', '중앙지정석');

    getSuwonScrollable('suwon-compare-card-suwon-107')
      .scrollIntoView()
      .find('[data-testid="suwon-compare-view"]')
      .click();
    assertSuwonFocusZoom();
    getVisibleSuwon('suwon-seatmap-bottom-sheet')
      .should('contain', '107 1루 응원지정석')
      .and('contain', '블록')
      .and('contain', '107');
  });

  it('모바일 처음 수원 가이드는 휠체어석을 하단 시트로 연결한다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    selectSuwonStadium();

    getVisibleSuwon('suwon-mobile-secondary-panel')
      .should('be.visible');
    getVisibleSuwon('suwon-mobile-tool-tab-guide')
      .should('have.attr', 'aria-selected', 'true');
    getSuwonScrollable('suwon-guide-intent-accessible')
      .scrollIntoView()
      .should('be.visible')
      .click();
    getSuwonScrollable('suwon-guide-result-suwon-wheel-center')
      .scrollIntoView()
      .should('be.visible')
      .click();

    getVisibleSuwon('suwon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.35));
    getVisibleSuwon('suwon-seatmap-bottom-sheet')
      .should('contain', '중앙 휠체어석')
      .and('contain', '휠체어석')
      .and('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');
    assertSuwonOperatorFallbackFields();
  });
});

// -----------------------------------------------------------------
