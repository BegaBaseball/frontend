/// <reference types="cypress" />

export {};

const STADIUMS = [
  {
    stadiumId: 'JAMSIL',
    stadiumName: '서울 · 잠실야구장',
    team: 'LG/두산',
    lat: 37.5122,
    lng: 127.0719,
    address: '서울특별시 송파구 올림픽로 25',
    phone: null,
  },
  {
    stadiumId: 'CHANGWON',
    stadiumName: '창원 · NC파크',
    team: 'NC',
    lat: 35.2225,
    lng: 128.5827,
    address: '경상남도 창원시 마산회원구 삼호로 63',
    phone: null,
  },
];

const interceptLoggedInSession = () => {
  cy.login('user');
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        id: 123,
        email: 'test@example.com',
        name: 'TestUser',
        handle: 'testuser',
        favoriteTeam: 'NC',
        role: 'ROLE_USER',
        hasPassword: true,
        profileImageUrl: null,
      },
    },
  }).as('getMe');
};

const interceptGuestSession = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: { success: false, message: 'Unauthorized' },
  }).as('getMeUnauthorized');
};

const interceptStadiumApis = () => {
  cy.intercept('GET', '**/api/stadiums', { statusCode: 200, body: STADIUMS }).as('getStadiums');
  cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', { statusCode: 200, body: [] }).as('getJamsilPlaces');
  cy.intercept('GET', '**/api/stadiums/CHANGWON/places?category=food', { statusCode: 200, body: [] }).as('getChangwonPlaces');
  cy.intercept('GET', '**/api/stadiums/*/places?category=food', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/stadiums/favorites', { statusCode: 200, body: { stadiumIds: [] } }).as('getFavorites');
  cy.intercept('GET', '**/api/diary/seat-views*', { statusCode: 200, body: [] }).as('getSeatViews');
};

describe('Stadium Changwon Direct Seat View Upload Flow', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('창원 좌석 CTA가 로그인 사용자 direct 업로드 모달로 연결된다', () => {
    interceptLoggedInSession();
    interceptStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.get('#stadium-guide-select').select('CHANGWON');

    cy.get('[data-testid="changwon-block-search"]', { timeout: 12000 })
      .filter(':visible')
      .first()
      .type('125');
    cy.contains('125 3루 내야석').should('be.visible');
    cy.contains('button', '시야 사진 올리기').click();

    cy.location('pathname').should('eq', '/stadium');
    cy.get('[data-testid="seat-view-direct-upload-modal"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', '시야 사진 올리기')
      .and('contain', 'CHANGWON')
      .and('contain', '3루 내야석')
      .and('contain', '사진 선택');
  });

  it('모바일 검색 결과 선택 후 필터를 전체로 되돌리고 선택 블록 bottom sheet를 유지한다', () => {
    cy.viewport(390, 844);
    interceptLoggedInSession();
    interceptStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.get('#stadium-guide-select').select('CHANGWON');

    cy.get('[data-testid="changwon-filter-secondary-toggle"]').filter(':visible').first().click();
    cy.get('[data-testid="changwon-filter-cheer"]').filter(':visible').first().click();
    cy.get('[data-testid="changwon-filter-cheer"]').filter(':visible').first().should('have.attr', 'aria-pressed', 'true');

    cy.get('[data-testid="changwon-block-search"]', { timeout: 12000 })
      .filter(':visible')
      .first()
      .type('125 3루 내야석');
    cy.contains('[data-testid^="changwon-search-result-"]', '125 3루 내야석').click();

    cy.get('[data-testid="changwon-filter-all"]').filter(':visible').first().should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="changwon-bottom-sheet"]', { timeout: 12000 }).should('be.visible').within(() => {
      cy.contains('125 3루 내야석').should('be.visible');
      cy.contains('블록').should('exist');
      cy.contains('125').should('exist');
      cy.contains('위치').should('exist');
      cy.contains('3루').should('exist');
      cy.contains('팬 구분').should('exist');
      cy.contains('중립').should('exist');
      cy.contains('실제 시야 사진').should('exist');
      cy.contains('button', '시야 사진 올리기').should('be.visible');
    });
  });

  it('창원 좌석 CTA가 게스트에게 현재 좌석도 경로 로그인 redirect를 남긴다', () => {
    interceptGuestSession();
    interceptStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.get('#stadium-guide-select').select('CHANGWON');

    cy.get('[data-testid="changwon-block-search"]', { timeout: 12000 })
      .filter(':visible')
      .first()
      .type('125');
    cy.contains('125 3루 내야석').should('be.visible');
    cy.contains('button', '시야 사진 올리기').click();

    cy.contains('로그인 필요').should('be.visible');
    cy.window()
      .its('sessionStorage')
      .invoke('getItem', 'pendingLoginRedirect')
      .should('eq', '/stadium');
    cy.window()
      .its('sessionStorage')
      .invoke('getItem', 'diary-draft-storage')
      .should('eq', null);
  });
});
