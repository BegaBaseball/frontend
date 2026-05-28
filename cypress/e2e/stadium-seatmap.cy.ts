/// <reference types="cypress" />

const ALL_STADIUMS = [
  { stadiumId: 'JAMSIL',   stadiumName: '잠실야구장',           team: 'LG/두산', lat: 37.5122, lng: 127.0719, address: '서울특별시 송파구 올림픽로 25',           phone: null },
  { stadiumId: 'INCHEON',  stadiumName: '인천 SSG 랜더스필드',  team: 'SSG',    lat: 37.4373, lng: 126.6934, address: '인천광역시 미추홀구 매소홀로 618',        phone: null },
  { stadiumId: 'DAEGU',    stadiumName: '대구 삼성 라이온즈파크', team: '삼성',   lat: 35.8411, lng: 128.6819, address: '대구광역시 수성구 야구전설로 1',          phone: null },
  { stadiumId: 'DAEJEON',  stadiumName: '대전 한화생명볼파크',   team: '한화',   lat: 36.3170, lng: 127.4285, address: '대전광역시 중구 대종로 373',              phone: null },
  { stadiumId: 'GOCHEOK',  stadiumName: '고척 스카이돔',        team: '키움',   lat: 37.4981, lng: 126.8671, address: '서울특별시 구로구 경인로 430',            phone: null },
  { stadiumId: 'GWANGJU',  stadiumName: '광주-KIA 챔피언스필드', team: 'KIA',   lat: 35.1681, lng: 126.8892, address: '광주광역시 북구 서림로 10',               phone: null },
  { stadiumId: 'CHANGWON', stadiumName: '창원 NC 파크',         team: 'NC',     lat: 35.2225, lng: 128.5827, address: '경상남도 창원시 마산회원구 삼호로 63',    phone: null },
  { stadiumId: 'SAJIK',    stadiumName: '부산 사직야구장',       team: '롯데',   lat: 35.1940, lng: 129.0614, address: '부산광역시 동래구 사직로 45',             phone: null },
  { stadiumId: 'SUWON',    stadiumName: '수원 kt wiz 파크',     team: 'KT',     lat: 37.2988, lng: 127.0098, address: '경기도 수원시 장안구 경수대로 893',       phone: null },
];

const interceptGuestSession = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: { success: false, message: 'Unauthorized' },
  }).as('getMeUnauthorized');
};

const interceptBaseApis = () => {
  cy.intercept('GET', '**/api/stadiums/*/places?category=food', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/stadiums', { statusCode: 200, body: ALL_STADIUMS }).as('getStadiums');
  cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', { statusCode: 200, body: [] }).as('getJamsilPlaces');
  cy.intercept('GET', '**/api/stadiums/DAEGU/places?category=food', { statusCode: 200, body: [] }).as('getDaeguPlaces');
  cy.intercept('GET', '**/api/stadiums/DAEJEON/places?category=food', { statusCode: 200, body: [] }).as('getDaejeonPlaces');
  cy.intercept('GET', '**/api/stadiums/GOCHEOK/places?category=food', { statusCode: 200, body: [] }).as('getGocheokPlaces');
  cy.intercept('GET', '**/api/stadiums/GWANGJU/places?category=food', { statusCode: 200, body: [] }).as('getGwangjuPlaces');
  cy.intercept('GET', '**/api/stadiums/INCHEON/places?category=food', { statusCode: 200, body: [] }).as('getIncheonPlaces');
  cy.intercept('GET', '**/api/stadiums/favorites', { statusCode: 200, body: { stadiumIds: [] } }).as('getFavorites');
  cy.intercept('GET', '**/api/diary/seat-views*', { statusCode: 200, body: [] }).as('getSeatViews');
};

const visitStadiumGuide = () => {
  interceptGuestSession();
  interceptBaseApis();
  cy.visit('/stadium');
  cy.wait('@getStadiums');
  cy.wait('@getJamsilPlaces');
};

const selectDaejeonStadium = () => {
  cy.get('#stadium-guide-select').select('DAEJEON');
  cy.wait('@getDaejeonPlaces');
  cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).scrollIntoView();
};

// -----------------------------------------------------------------
// Suite 1 — Zoom Controls
// Primary: Daegu (MIN=1, MAX=3). Smoke: Jamsil, Gwangju, Incheon.
// -----------------------------------------------------------------
describe('Stadium SeatMap — Zoom Controls', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('대구 초기 data-zoom이 1.00이다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="daegu-seatmap-transform-layer"]', { timeout: 10000 })
      .filter(':visible').first()
      .should('have.attr', 'data-zoom', '1.00');
  });

  it('대구 zoom-in 클릭하면 data-zoom이 증가한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="daegu-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible').first().click();
    cy.get('[data-testid="daegu-seatmap-transform-layer"]')
      .filter(':visible').first()
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.greaterThan(1.0));
  });

  it('대구 zoom-in 3회 연속 클릭해도 MAX_ZOOM(3.00)을 초과하지 않는다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    const zoomIn = () =>
      cy.get('[data-testid="daegu-seatmap-zoom-in"]', { timeout: 10000 }).filter(':visible').first();
    zoomIn().click();
    zoomIn().click();
    zoomIn().click();
    cy.get('[data-testid="daegu-seatmap-transform-layer"]')
      .filter(':visible').first()
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.at.most(3.0));
  });

  it('대구 zoom-in 후 zoom-reset 클릭하면 data-zoom이 1.00으로 돌아간다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="daegu-seatmap-zoom-in"]', { timeout: 10000 }).filter(':visible').first().click();
    cy.get('[data-testid="daegu-seatmap-zoom-reset"]').filter(':visible').first().click();
    cy.get('[data-testid="daegu-seatmap-transform-layer"]')
      .filter(':visible').first()
      .should('have.attr', 'data-zoom', '1.00');
  });

  it('대구 MIN_ZOOM 상태에서 zoom-out 버튼이 비활성화된다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="daegu-seatmap-zoom-out"]', { timeout: 10000 })
      .filter(':visible').first()
      .should('be.disabled');
  });

  it('잠실 zoom-in 버튼이 동작한다 (smoke)', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="jamsil-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible').first().should('be.visible').click();
    cy.get('[data-testid="jamsil-seatmap-transform-layer"]')
      .filter(':visible').first()
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.greaterThan(1.0));
  });

  it('광주 zoom-in 버튼이 동작한다 (smoke)', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('GWANGJU');
    cy.wait('@getGwangjuPlaces');
    cy.get('[data-testid="gwangju-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible').first().should('be.visible').click();
    cy.get('[data-testid="gwangju-seatmap-viewport"]')
      .filter(':visible').first()
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.greaterThan(1.0));
  });

  it('인천 zoom-in 버튼이 동작한다 (smoke)', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('INCHEON');
    cy.wait('@getIncheonPlaces');
    cy.get('[data-testid="incheon-seatmap-zoom-in"]', { timeout: 10000 })
      .filter(':visible').first().should('be.visible').click();
    cy.get('[data-testid="incheon-seatmap-transform-layer"]')
      .filter(':visible').first()
      .invoke('attr', 'data-zoom')
      .then((zoom) => expect(parseFloat(zoom!)).to.be.greaterThan(1.0));
  });
});

// -----------------------------------------------------------------
// Suite 2 — Block Selection (Daegu section finder + detail panel)
// -----------------------------------------------------------------
describe('Stadium SeatMap — Block Selection', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('섹션파인더 검색 후 블록 선택하면 상세패널에 블록 이름이 표시된다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid="daegu-block-search"]').type('1-1');
      cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').click();
      cy.contains('원정 응원석 1-1').should('be.visible');
    });
  });

  it('상세패널에 블록 카테고리 뱃지가 표시된다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid="daegu-block-search"]').type('1-1');
      cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').click();
      cy.contains('원정응원석').should('be.visible');
    });
  });

  it('닫기 버튼 클릭 시 패널이 기본 안내 메시지로 돌아간다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid="daegu-block-search"]').type('1-1');
      cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').click();
      cy.contains('원정 응원석 1-1').should('be.visible');
      cy.get('button[aria-label="닫기"]').click();
      cy.contains('구역을 선택하세요').should('be.visible');
    });
  });

  it('다른 블록 선택 시 상세패널 내용이 갱신된다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid="daegu-block-search"]').type('1-1');
      cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').click();
      cy.contains('원정 응원석 1-1').should('be.visible');
      // 1-2 is review-only (DAEGU_REVIEW_ONLY_TRACE_METHOD_BY_BLOCK); use 1-3 instead
      cy.get('[data-testid="daegu-block-search"]').clear().type('1-3');
      cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-3"]').click();
      cy.contains('원정 응원석 1-3').should('be.visible');
    });
  });
});

// -----------------------------------------------------------------
// Suite 2-B — Daejeon Search / Detail UX
// -----------------------------------------------------------------
function selectDaejeonBlock(query: string, itemTestId: string) {
  cy.get('[data-testid="daejeon-block-search"]', { timeout: 10000 })
    .filter(':visible')
    .first()
    .clear()
    .type(query);
  cy.get(`[data-testid="${itemTestId}"]`, { timeout: 10000 })
    .filter(':visible')
    .first()
    .click();
}

function assertDaejeonDetailMeta(block: string, officialSection: string) {
  cy.get('[data-testid="daejeon-seatmap-extra-meta"]', { timeout: 10000 })
    .first()
    .scrollIntoView()
    .should('contain', '공식 섹션')
    .and('contain', officialSection)
    .and('contain', '정확 블록')
    .and('contain', block)
    .and('contain', '부모 구역')
    .and('contain', 'source confidence')
    .and('contain', '공식 확인');
  cy.get('[data-testid="daejeon-seatmap-coverage-status"]').first().should('contain', 'coverage status');
  cy.get('[data-testid="daejeon-seatmap-trace-status"]').first().should('contain', 'trace status');
  cy.get('[data-testid="daejeon-seatmap-accessibility-note"]').first().should('contain', '접근성 메모');
}

describe('Stadium SeatMap — Daejeon Search / Detail UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('대전 선택 시 canonical SVG label과 줌 컨트롤을 유지한다', () => {
    visitStadiumGuide();
    selectDaejeonStadium();

    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]').should('be.visible');
      cy.get('[data-testid="daejeon-seatmap-zoom-in"]').should('exist');
      cy.get('[data-testid="daejeon-seatmap-zoom-out"]').should('exist');
      cy.get('[data-testid="daejeon-seatmap-zoom-reset"]').should('exist');
    });
  });

  it('대전 구역 찾기 검색어 104, 100A, 카스존, 스카이박스, 휠체어석이 상세 메타로 연결된다', () => {
    const cases = [
      { query: '104', item: 'daejeon-section-finder-item-first-infield-b-101-108__104', block: '104', officialSection: '내야 지정석B' },
      { query: '100A', item: 'daejeon-section-finder-item-central-reserved-100__100a', block: '100A', officialSection: '중앙 지정석' },
      { query: '카스존', item: 'daejeon-section-finder-item-cass-cheering-200__200', block: '200', officialSection: '카스존(응원단석)' },
      { query: '스카이박스', item: 'daejeon-section-finder-item-skybox-s01-s37__s01', block: 'S01', officialSection: '스카이박스' },
      { query: '휠체어석', item: 'daejeon-section-finder-item-central-accessible__center', block: '중앙', officialSection: '중앙 휠체어석' },
    ];

    visitStadiumGuide();
    selectDaejeonStadium();

    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cases.forEach(({ query, item, block, officialSection }) => {
        selectDaejeonBlock(query, item);
        assertDaejeonDetailMeta(block, officialSection);
      });
    });
  });

  it('대전 검색 결과가 없으면 검색어와 선택 필터 기준을 명확히 보여준다', () => {
    visitStadiumGuide();
    selectDaejeonStadium();

    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid="daejeon-filter-secondary-toggle"]').click();
      cy.get('[data-testid="daejeon-filter-cheer"]').click();
      cy.get('[data-testid="daejeon-block-search"]').clear().type('없는구역');
      cy.get('[data-testid="daejeon-section-finder-empty"]')
        .should('be.visible')
        .and('contain', '검색어와 선택한 필터에 맞는 구역이 없습니다')
        .and('contain', '검색어: 없는구역');
    });
  });
});

// -----------------------------------------------------------------
// Suite 2-C — Daejeon Filter Interaction
// -----------------------------------------------------------------
describe('Stadium SeatMap — Daejeon Filter Interaction', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('대전 핵심 보조 필터가 섹션파인더 결과 수를 줄인다', () => {
    const filters = ['cheer', 'table', 'sky', 'accessible', 'pos-first', 'pos-third'];

    visitStadiumGuide();
    selectDaejeonStadium();

    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="daejeon-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;

          cy.get('[data-testid="daejeon-filter-secondary-toggle"]').click();
          filters.forEach((filter) => {
            cy.get(`[data-testid="daejeon-filter-${filter}"]`).click();
            cy.get('[data-testid^="daejeon-section-finder-item-"]')
              .should('have.length.lessThan', allCount);
          });
        });
    });
  });
});

// -----------------------------------------------------------------
// Suite 2-D — Incheon First Visit UX
// -----------------------------------------------------------------
function withinVisibleStadiumSeatMap(callback: () => void) {
  cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 })
    .filter(':visible')
    .last()
    .within(callback);
}

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

describe('Stadium SeatMap — Incheon First Visit UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
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
      '다이어리에서 시야 사진 공유하기',
    ]);
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
      expect(pendingDraft.date).to.match(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

// -----------------------------------------------------------------
// Suite 3 — Filter Interaction (Daegu)
// -----------------------------------------------------------------
describe('Stadium SeatMap — Filter Interaction', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('대구 응원석 필터 클릭 시 섹션파인더 아이템 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="daegu-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          // 등급·위치 보조 필터 섹션을 먼저 펼침
          cy.get('[data-testid="daegu-filter-secondary-toggle"]').click();
          cy.get('[data-testid="daegu-filter-cheer"]').click();
          cy.get('[data-testid^="daegu-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
        });
    });
  });

  it('대구 전체 필터 클릭 시 섹션파인더 아이템 수가 복귀한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="daegu-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          // 등급·위치 보조 필터 섹션을 먼저 펼침
          cy.get('[data-testid="daegu-filter-secondary-toggle"]').click();
          cy.get('[data-testid="daegu-filter-cheer"]').click();
          cy.get('[data-testid^="daegu-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
          cy.get('[data-testid="daegu-filter-all"]').click();
          cy.get('[data-testid^="daegu-section-finder-item-"]')
            .should('have.length', allCount);
        });
    });
  });
});

// -----------------------------------------------------------------
// Suite 3-B — Filter Interaction (Jamsil 다차원: level / position / grade)
// -----------------------------------------------------------------
describe('Stadium SeatMap — Filter Interaction (Jamsil)', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('잠실 1층 필터 클릭 시 섹션파인더 아이템 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="jamsil-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          // lv-1f는 level(primary) 행 — 토글 없이 바로 클릭
          cy.get('[data-testid="jamsil-filter-lv-1f"]').click();
          cy.get('[data-testid^="jamsil-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
        });
    });
  });

  it('잠실 층수 필터 후 전체 클릭 시 섹션파인더 아이템 수가 복귀한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="jamsil-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          cy.get('[data-testid="jamsil-filter-lv-1f"]').click();
          cy.get('[data-testid^="jamsil-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
          // all은 level(primary) 행 — 토글 없이 바로 클릭
          cy.get('[data-testid="jamsil-filter-all"]').click();
          cy.get('[data-testid^="jamsil-section-finder-item-"]')
            .should('have.length', allCount);
        });
    });
  });

  it('잠실 1루측 위치 필터 클릭 시 섹션파인더 아이템 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="jamsil-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          // pos-first는 position(secondary) 행 — 먼저 토글 펼침
          cy.get('[data-testid="jamsil-filter-secondary-toggle"]').click();
          cy.get('[data-testid="jamsil-filter-pos-first"]').click();
          cy.get('[data-testid^="jamsil-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
        });
    });
  });

  it('잠실 프리미엄 등급 필터 클릭 시 섹션파인더 아이템 수가 감소한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).within(() => {
      cy.get('[data-testid^="jamsil-section-finder-item-"]')
        .should('have.length.greaterThan', 0)
        .then(($allItems) => {
          const allCount = $allItems.length;
          // premium은 grade(secondary) 행 — 먼저 토글 펼침
          cy.get('[data-testid="jamsil-filter-secondary-toggle"]').click();
          cy.get('[data-testid="jamsil-filter-premium"]').click();
          cy.get('[data-testid^="jamsil-section-finder-item-"]')
            .should('have.length.lessThan', allCount);
        });
    });
  });
});

// -----------------------------------------------------------------
// Suite 4 — Gocheok Visit UX
// -----------------------------------------------------------------
function selectGocheokBlock(query: string, itemTestId: string) {
  cy.get('[data-testid="gocheok-block-search"]', { timeout: 10000 })
    .filter(':visible')
    .first()
    .clear()
    .type(query);
  cy.get(`[data-testid="${itemTestId}"]`, { timeout: 10000 })
    .filter(':visible')
    .first()
    .click();
}

function assertGocheokVisitCheck(block: string, level: string, side: string, facilityTab: string) {
  cy.get('[data-testid="gocheok-visit-check"]', { timeout: 10000 })
    .filter(':visible')
    .first()
    .within(() => {
      cy.contains('직관 체크').should('be.visible');
      cy.contains(block).should('be.visible');
      cy.contains(level).should('be.visible');
      cy.contains(side).should('be.visible');
      cy.contains(facilityTab).should('be.visible');
      cy.contains('현장 최종 안내 확인').should('be.visible');
      cy.contains('MANUAL_BASEBALL_DATA_REQUIRED').should('be.visible');
    });
}

describe('Stadium SeatMap — Gocheok Visit UX', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('D04와 430 검색 선택 후 직관 체크와 시설현황 전환을 제공한다', () => {
    interceptGuestSession();
    interceptBaseApis();
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getJamsilPlaces');
    cy.get('#stadium-guide-select').select('GOCHEOK');
    cy.wait('@getGocheokPlaces');

    selectGocheokBlock('D04', 'gocheok-section-finder-item-gocheok-d04');
    assertGocheokVisitCheck('D04', '1F', '중앙', '시설 개요');

    cy.get('[data-testid="gocheok-facility-guide-open"]').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="gocheok-facility-tab-overview"]', { timeout: 10000 })
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="gocheok-operator-data-required"]')
      .should('be.visible')
      .and('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');

    cy.get('[data-testid="stadium-guide-seatmap"]').scrollIntoView();
    cy.contains('button:visible', '공식 좌석도').click();
    cy.get('[data-testid="gocheok-block-search"]', { timeout: 10000 }).filter(':visible').first().should('be.visible');

    selectGocheokBlock('430', 'gocheok-section-finder-item-gocheok-430');
    assertGocheokVisitCheck('430', '외야층', '외야', '출입구');

    cy.get('[data-testid="gocheok-facility-guide-open"]').first().scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="gocheok-facility-tab-entrances"]', { timeout: 10000 })
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="gocheok-operator-data-status"]').should('contain', 'MANUAL_BASEBALL_DATA_REQUIRED');

    cy.get('[data-testid="stadium-guide-seatmap"]').scrollIntoView();
    cy.contains('button:visible', '공식 좌석도').click();
    cy.get('[data-testid="gocheok-seatmap-svg"]', { timeout: 10000 }).filter(':visible').first().should('be.visible');
  });
});

// -----------------------------------------------------------------
// Suite 5 — SVG Render Smoke (all 9 stadiums)
// -----------------------------------------------------------------
const SMOKE_STADIUMS = [
  { stadiumId: 'JAMSIL',   name: '잠실',  ariaLabel: '잠실 좌석도 구역 선택',                    prefix: 'jamsil'   },
  { stadiumId: 'INCHEON',  name: '인천',  ariaLabel: '인천 SSG 랜더스필드 좌석도 구역 선택',       prefix: 'incheon'  },
  { stadiumId: 'DAEGU',    name: '대구',  ariaLabel: '대구 삼성 라이온즈 파크 좌석도 구역 선택',    prefix: 'daegu'    },
  { stadiumId: 'DAEJEON',  name: '대전',  ariaLabel: '대전 한화생명볼파크 좌석도 구역 선택',        prefix: 'daejeon'  },
  { stadiumId: 'GOCHEOK',  name: '고척',  ariaLabel: '고척 스카이돔 좌석도 구역 선택',             prefix: 'gocheok'  },
  { stadiumId: 'GWANGJU',  name: '광주',  ariaLabel: '광주-KIA 챔피언스필드 좌석도 구역 선택',     prefix: 'gwangju'  },
  { stadiumId: 'CHANGWON', name: '창원',  ariaLabel: '창원 NC파크 좌석도 구역 선택',              prefix: 'changwon' },
  { stadiumId: 'SAJIK',    name: '사직',  ariaLabel: '부산 사직야구장 좌석도 구역 선택',           prefix: 'sajik'    },
  { stadiumId: 'SUWON',    name: '수원',  ariaLabel: '수원 kt 위즈 파크 좌석도 구역 선택',         prefix: 'suwon'    },
];

describe('Stadium SeatMap — SVG Render Smoke', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  SMOKE_STADIUMS.forEach(({ stadiumId, name, ariaLabel, prefix }) => {
    it(`${name}(${stadiumId}) SVG가 렌더링되고 줌 버튼 3개가 존재한다`, () => {
      interceptGuestSession();
      interceptBaseApis();
      cy.visit('/stadium');
      cy.wait('@getStadiums');
      if (stadiumId !== 'JAMSIL') {
        cy.get('#stadium-guide-select').select(stadiumId);
      }
      // 사직(SAJIK)은 기본 소스가 운영자 참고 이미지(zoom 컨트롤 없음)이므로
      // 공식 이미지 탭으로 전환 후 인터랙티브 좌석도를 검증한다
      if (stadiumId === 'SAJIK') {
        cy.get('[data-testid="sajik-seatmap-source-LOTTE_OFFICIAL_2026"]', { timeout: 8000 }).filter(':visible').click();
      }
      cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 12000 }).within(() => {
        cy.get(`svg[aria-label="${ariaLabel}"]`).should('be.visible');
        cy.get(`[data-testid="${prefix}-seatmap-zoom-in"]`).should('exist');
        cy.get(`[data-testid="${prefix}-seatmap-zoom-out"]`).should('exist');
        cy.get(`[data-testid="${prefix}-seatmap-zoom-reset"]`).should('exist');
      });
    });
  });
});
