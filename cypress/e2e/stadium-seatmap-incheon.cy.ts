/// <reference types="cypress" />

import { interceptBaseApis, interceptDiaryDraftApis, interceptGuestSession, interceptLoggedInSession, seedLoggedInAuth, withinVisibleStadiumSeatMap } from '../support/stadiumSeatmap';

// Suite 2-D — Incheon First Visit UX
// -----------------------------------------------------------------
function assertIncheonDetailContains(values: string[]) {
  withinVisibleStadiumSeatMap(() => {
    cy.get('[data-testid="incheon-seatmap-detail-panel"]', { timeout: 10000 })
      .should(($panel) => {
        const panel = $panel[0] as HTMLElement | undefined;
        const text = panel?.textContent ?? '';
        values.forEach((value) => {
          expect(text, `Incheon detail panel should contain ${value}`).to.include(value);
        });
      });
  });
}

function selectIncheonBlock(query: string, itemTestId: string) {
  withinVisibleStadiumSeatMap(() => {
    cy.get('[data-testid="incheon-block-search"]', { timeout: 10000 })
      .clear()
      .type(query);
    cy.get(`[data-testid="${itemTestId}"]`, { timeout: 10000 })
      .click();
  });
}

function getVisibleIncheon(testId: string) {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000 })
    .filter(':visible')
    .first();
}

function formatBrowserLocalDate(win: Window) {
  const today = new win.Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function assertIncheonDiaryDraft(win: Window) {
  const rawDraft = win.sessionStorage.getItem('diary-draft-storage');
  expect(rawDraft).to.be.a('string');
  const pendingDraft = JSON.parse(rawDraft!).state.pendingDraft;
  expect(pendingDraft).to.deep.include({
    stadium: 'INCHEON',
    team: 'SSG',
    section: '101B 내야 필드석',
    block: '101B',
    seatRow: '',
    seatNumber: '',
  });
  expect(pendingDraft.date).to.eq(formatBrowserLocalDate(win));
}

describe('Stadium SeatMap — Incheon First Visit UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  afterEach(() => {
    cy.viewport(1280, 720);
  });

  it('101B 검색 선택 후 상세 패널과 다이어리 공유 CTA를 제공한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-first-visit-guide"]', { timeout: 10000 })
        .should('contain', '처음 인천 가이드');
      cy.get('[data-testid="incheon-section-finder"]')
        .should('contain', '블록 검색');
    });

    selectIncheonBlock('101B', 'incheon-section-finder-item-incheon-101b');

    assertIncheonDetailContains([
      '101B 내야 필드석',
      '블록 101B',
      '내야 필드석',
      '1루',
      '홈 응원',
      '비교에 추가',
      '다이어리에서 시야 사진 공유하기',
    ]);

    cy.get('[data-testid="incheon-operator-visit-check"]').should('not.exist');
    cy.get('[data-testid="incheon-operator-data-status"]').should('not.exist');
    cy.contains('MANUAL_BASEBALL_DATA_REQUIRED').should('not.exist');
  });

  it('처음 가이드 101B 검색 결과는 선택 블록 focus zoom과 상세 패널로 연결한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-guide-search"]', { timeout: 10000 })
        .clear()
        .type('101B');
      cy.get('[data-testid="incheon-guide-result-incheon-101b"]', { timeout: 10000 })
        .click();
    });

    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-seatmap-transform-layer"]')
        .invoke('attr', 'data-zoom')
        .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.45));
    });
    assertIncheonDetailContains(['101B 내야 필드석', '블록 101B']);
  });

  it('처음 가이드 검색은 휠체어석 결과를 선택 가능한 블록으로 연결한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-guide-search"]', { timeout: 10000 })
        .clear()
        .type('휠체어');
      cy.get('[data-testid="incheon-guide-result-incheon-accessible-9b"]', { timeout: 10000 })
        .click();
    });

    assertIncheonDetailContains([
      '휠체어석 9B',
      '접근성',
      '다이어리에 공유된 사진만 표시합니다.',
    ]);
  });

  it('키보드로 인천 블록 검색 결과와 SVG 블록을 선택할 수 있다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-block-search"]', { timeout: 10000 })
        .focus()
        .type('101B');
      cy.get('[data-testid="incheon-section-finder-item-incheon-101b"]', { timeout: 10000 })
        .should('be.visible')
        .focus();
      cy.focused()
        .should('have.attr', 'data-testid', 'incheon-section-finder-item-incheon-101b')
        .click();

      cy.get('[data-testid="incheon-seat-block-incheon-101b"]')
        .should('have.attr', 'role', 'button')
        .and('have.attr', 'tabindex', '0')
        .and('have.attr', 'aria-label', '101B 내야 필드석 101B')
        .and('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="incheon-seatmap-detail-panel"]')
        .should('contain', '101B 내야 필드석')
        .and('contain', '다이어리에서 시야 사진 공유하기');
      cy.get('[data-testid="incheon-seatmap-detail-panel"] [aria-label="닫기"]')
        .click();

      cy.get('[data-testid="incheon-seat-block-incheon-101b"]')
        .should('have.attr', 'aria-pressed', 'false')
        .focus();
      cy.focused()
        .should('have.attr', 'data-testid', 'incheon-seat-block-incheon-101b')
        .trigger('keydown', { key: 'Enter' });
      cy.get('[data-testid="incheon-seat-block-incheon-101b"]')
        .should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-testid="incheon-seatmap-detail-panel"]')
        .should('contain', '101B 내야 필드석')
        .and('contain', '다이어리에서 시야 사진 공유하기');
    });

    cy.contains('사진은 데모 상태').should('not.exist');
  });

  it('데스크톱 비교 트레이는 인천 후보 3개 비교와 focus 선택을 지원한다', () => {
    cy.viewport(1440, 1000);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    [
      { query: '101B', item: 'incheon-section-finder-item-incheon-101b', card: 'incheon-compare-card-incheon-101b' },
      { query: '102B', item: 'incheon-section-finder-item-incheon-102b', card: 'incheon-compare-card-incheon-102b' },
      { query: '103B', item: 'incheon-section-finder-item-incheon-103b', card: 'incheon-compare-card-incheon-103b' },
    ].forEach(({ query, item, card }) => {
      selectIncheonBlock(query, item);
      cy.get('[data-testid="incheon-seatmap-detail-panel"]', { timeout: 10000 })
        .filter(':visible')
        .first()
        .find('[data-testid="incheon-compare-add"]')
        .click({ force: true });
      cy.get(`[data-testid="${card}"]`, { timeout: 10000 })
        .should('exist');
    });

    cy.get('[data-testid^="incheon-compare-card-"]')
      .should('have.length', 3);

    selectIncheonBlock('104B', 'incheon-section-finder-item-incheon-104b');
    cy.get('[data-testid="incheon-seatmap-detail-panel"]')
      .filter(':visible')
      .first()
      .find('[data-testid="incheon-compare-add"]')
      .should('be.disabled')
        .and('contain', '비교는 3개까지');
    cy.get('[data-testid="incheon-compare-card-incheon-102b"]')
      .find('[data-testid="incheon-compare-view"]')
      .click();
    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-seatmap-transform-layer"]')
        .invoke('attr', 'data-zoom')
        .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.5));
      cy.get('[data-testid="incheon-seat-block-incheon-102b"]')
        .should('have.attr', 'aria-pressed', 'true')
        .and('have.attr', 'data-compared', 'true');
    });
    cy.get('[data-testid="incheon-compare-card-incheon-101b"]')
      .find('[data-testid="incheon-compare-remove"]')
      .click();
    cy.get('[data-testid="incheon-compare-card-incheon-101b"]')
      .should('not.exist');
    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-seat-block-incheon-102b"]')
        .should('have.attr', 'aria-pressed', 'true');
    });
    cy.get('[data-testid="incheon-compare-clear"]')
      .filter(':visible')
      .first()
      .click();
    cy.get('[data-testid^="incheon-compare-card-"]')
      .should('not.exist');
    withinVisibleStadiumSeatMap(() => {
      cy.get('[data-testid="incheon-seatmap-detail-panel"]')
        .should('contain', '다이어리에서 시야 사진 공유하기');
    });

    cy.contains('사진은 데모 상태').should('not.exist');
  });

  it('비로그인 공유 CTA는 인천 다이어리 draft와 /mypage 로그인 redirect를 남긴다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    selectIncheonBlock('101B', 'incheon-section-finder-item-incheon-101b');
    withinVisibleStadiumSeatMap(() => {
      cy.contains('button', '다이어리에서 시야 사진 공유하기', { timeout: 10000 })
        .click();
    });

    cy.contains('로그인 필요').should('be.visible');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('pendingLoginRedirect')).to.eq('/mypage');
      assertIncheonDiaryDraft(win);
    });
  });

  it('로그인 공유 CTA는 인천 다이어리 draft를 /mypage 폼에 반영한다', () => {
    interceptLoggedInSession();
    interceptBaseApis();
    interceptDiaryDraftApis();
    cy.visit('/stadium', { onBeforeLoad: seedLoggedInAuth });
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.contains('button', '로그인').should('not.exist');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    selectIncheonBlock('101B', 'incheon-section-finder-item-incheon-101b');
    withinVisibleStadiumSeatMap(() => {
      cy.contains('button', '다이어리에서 시야 사진 공유하기', { timeout: 10000 })
        .click();
    });

    cy.location('pathname').should('eq', '/mypage');
    cy.get('input[placeholder="구역 (예: 1루 레드석)"]', { timeout: 20000 })
      .should('have.value', '101B 내야 필드석');
    cy.get('input[placeholder="블록 (예: 101블록)"]')
      .should('have.value', '101B');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('pendingLoginRedirect')).to.be.null;
      const rawDraft = win.sessionStorage.getItem('diary-draft-storage');
      if (rawDraft) {
        expect(JSON.parse(rawDraft).state.pendingDraft).to.be.null;
      }
    });
  });

  it('모바일에서는 가이드와 블록 검색을 탭으로 전환하고 선택 CTA까지 연결한다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');
    getVisibleIncheon('incheon-seatmap-viewport').should('be.visible');

    getVisibleIncheon('incheon-mobile-secondary-panel')
      .should('be.visible');
    getVisibleIncheon('incheon-mobile-tool-tab-guide')
      .should('have.attr', 'aria-selected', 'true');
    getVisibleIncheon('incheon-first-visit-guide')
      .should('contain', '처음 인천 가이드');
    cy.get('body').then(($body) => {
      expect($body.find('[data-testid="incheon-section-finder"]:visible')).to.have.length(0);
    });
    getVisibleIncheon('incheon-guide-search')
      .clear()
      .type('101B');
    getVisibleIncheon('incheon-guide-result-incheon-101b')
      .click();
    getVisibleIncheon('incheon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.45));

    getVisibleIncheon('incheon-seatmap-bottom-sheet')
      .should('contain', '다이어리에서 시야 사진 공유하기')
      .and('contain', '비교에 추가');
    cy.contains('MANUAL_BASEBALL_DATA_REQUIRED').should('not.exist');
    cy.get('[data-testid="incheon-seatmap-bottom-sheet"] [aria-label="닫기"]')
      .filter(':visible')
      .first()
      .click();

    getVisibleIncheon('incheon-mobile-tool-tab-finder')
      .click();
    getVisibleIncheon('incheon-mobile-tool-tab-finder')
      .should('have.attr', 'aria-selected', 'true');
    getVisibleIncheon('incheon-block-search')
      .clear()
      .type('101B');
    getVisibleIncheon('incheon-section-finder-item-incheon-101b')
      .click();
    getVisibleIncheon('incheon-seatmap-transform-layer')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.5));

    getVisibleIncheon('incheon-seatmap-bottom-sheet')
      .should('contain', '다이어리에서 시야 사진 공유하기');
    cy.contains('사진은 데모 상태').should('not.exist');
  });

  it('모바일 비교 트레이는 가이드와 finder 선택 사이에서 후보를 유지한다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');

    getVisibleIncheon('incheon-compare-tray')
      .should('be.visible')
      .and('contain', '후보 비교');
    getVisibleIncheon('incheon-guide-search')
      .clear();
    getVisibleIncheon('incheon-guide-search')
      .type('101B');
    getVisibleIncheon('incheon-guide-result-incheon-101b')
      .click();
    getVisibleIncheon('incheon-seatmap-bottom-sheet')
      .should('contain', '다이어리에서 시야 사진 공유하기');
    getVisibleIncheon('incheon-seatmap-bottom-sheet')
      .find('[data-testid="incheon-compare-add"]')
      .click({ force: true });
    cy.get('[data-testid="incheon-compare-card-incheon-101b"]', { timeout: 10000 })
      .should('contain', '101B');

    getVisibleIncheon('incheon-mobile-tool-tab-finder')
      .click();
    getVisibleIncheon('incheon-block-search')
      .clear();
    getVisibleIncheon('incheon-block-search')
      .type('102B');
    getVisibleIncheon('incheon-section-finder-item-incheon-102b')
      .click();
    getVisibleIncheon('incheon-seatmap-bottom-sheet')
      .find('[data-testid="incheon-compare-add"]')
      .click({ force: true });

    getVisibleIncheon('incheon-compare-tray')
      .should('contain', '101B')
      .and('contain', '102B');
    getVisibleIncheon('incheon-compare-card-incheon-101b')
      .find('[data-testid="incheon-compare-view"]')
      .click();
    getVisibleIncheon('incheon-seat-block-incheon-101b')
      .should('have.attr', 'aria-pressed', 'true');
    cy.contains('사진은 데모 상태').should('not.exist');
  });

  it('모바일 double tap은 인천 좌석도를 1.75x로 확대하고 gesture 상태를 idle로 되돌린다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');
    getVisibleIncheon('incheon-seatmap-viewport').should('be.visible');

    getVisibleIncheon('incheon-seatmap-viewport')
      .should('have.attr', 'data-gesture-mode', 'idle')
      .and('have.attr', 'data-zoom', '1.00');

    getVisibleIncheon('incheon-seatmap-viewport')
      .scrollIntoView()
      .dblclick('center', { force: true });

    getVisibleIncheon('incheon-seatmap-viewport')
      .should('have.attr', 'data-gesture-mode', 'idle')
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.least(1.75));
  });
});

// -----------------------------------------------------------------
