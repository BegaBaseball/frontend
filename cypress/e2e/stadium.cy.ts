/// <reference types="cypress" />

describe('Stadium Guide Quality Flow', () => {
  const stadiums = [
    {
      stadiumId: 'JAMSIL',
      stadiumName: '잠실야구장',
      team: 'LG/두산',
      lat: 37.5122,
      lng: 127.0719,
      address: '서울특별시 송파구 올림픽로 25',
      phone: null,
    },
    {
      stadiumId: 'GOCHEOK',
      stadiumName: '고척 스카이돔',
      team: '키움',
      lat: 37.4981,
      lng: 126.8671,
      address: '서울특별시 구로구 경인로 430',
      phone: null,
    },
    {
      stadiumId: 'DAEGU',
      stadiumName: '대구 삼성 라이온즈파크',
      team: '삼성',
      lat: 35.8411,
      lng: 128.6819,
      address: '대구광역시 수성구 야구전설로 1',
      phone: null,
    },
  ];

  const foodPlaces = [
    {
      id: 101,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '통밥',
      description: '대표 먹거리 구역',
      lat: 37.5124,
      lng: 127.0721,
      address: '서울 송파구 올림픽로 25',
      phone: null,
      rating: 4.8,
      openTime: null,
      closeTime: null,
    },
    {
      id: 102,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '브뤼셀프라이',
      description: null,
      lat: 37.5121,
      lng: 127.0723,
      address: '서울 송파구 올림픽로 25',
      phone: null,
      rating: 4.1,
      openTime: null,
      closeTime: null,
    },
    {
      id: 103,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '이가네떡볶이',
      description: null,
      lat: null,
      lng: null,
      address: null,
      phone: '02-1600-0781',
      rating: null,
      openTime: null,
      closeTime: null,
    },
  ];

  const deliveryPlaces = [
    {
      id: 201,
      stadiumName: '잠실야구장',
      category: 'delivery',
      name: '종합운동장역 6번 출구 픽업존',
      description: '잠실야구장 외부 배달 수령 권장 위치',
      lat: 37.51093,
      lng: 127.07271,
      address: '서울 송파구 종합운동장역 6번 출구',
      phone: null,
      rating: null,
      openTime: null,
      closeTime: null,
    },
  ];

  const interceptGuestSession = () => {
    cy.intercept('GET', '**/api/auth/mypage*', {
      statusCode: 401,
      body: { success: false, message: 'Unauthorized' },
    }).as('getMeUnauthorized');
  };

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
          favoriteTeam: 'HH',
          role: 'ROLE_USER',
          hasPassword: true,
          profileImageUrl: null,
        },
      },
    }).as('getMe');
  };

  const interceptBaseStadiumApis = () => {
    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 200,
      body: stadiums,
    }).as('getStadiums');

    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
      statusCode: 200,
      body: foodPlaces,
    }).as('getFoodPlaces');

    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=delivery', {
      statusCode: 200,
      body: deliveryPlaces,
    }).as('getDeliveryPlaces');

    cy.intercept('GET', '**/api/stadiums/DAEGU/places?category=food', {
      statusCode: 200,
      body: [],
    }).as('getDaeguFoodPlaces');
  };

  const interceptDiaryDraftApis = () => {
    cy.intercept('GET', '**/api/diary/entries*', {
      statusCode: 200,
      body: [],
    }).as('getDiaryEntries');

    cy.intercept('GET', '**/api/diary/games*', {
      statusCode: 200,
      body: [],
    }).as('getDiaryGames');

    cy.intercept('GET', '**/api/diary/statistics*', {
      statusCode: 200,
      body: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
    }).as('getDiaryStatistics');

    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');
  };

  const desktopPanels = () =>
    cy.get('[data-testid="stadium-guide-desktop-panels"]').should('be.visible');

  const placesPanel = () =>
    desktopPanels().find('[data-testid="stadium-guide-places-panel"]').should('be.visible');

  const categoryButton = (label: string) =>
    desktopPanels().contains('button', label).should('be.visible');

  const searchInput = () =>
    placesPanel().find('input[placeholder="장소 이름 검색..."]').should('be.visible');

  const sortSelect = () =>
    placesPanel().find('select').should('be.visible');

  beforeEach(() => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true }).as('kakaoSdkFail');
  });

  it('로딩/실패/빈결과 상태 문구를 구분해 표시한다', () => {
    interceptGuestSession();

    cy.intercept('GET', '**/api/stadiums', (req) => {
      req.reply({
        delay: 3000,
        statusCode: 200,
        body: stadiums,
      });
    }).as('getStadiumsLoading');
    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
      statusCode: 200,
      body: foodPlaces,
    }).as('getFoodPlaces');

    cy.visit('/stadium');
    cy.get('#stadium-guide-select')
      .should('be.visible')
      .and('contain', '구장 목록 로딩 중...');
    cy.screenshot('stadium-smoke-loading');
    cy.wait('@getStadiumsLoading');
    cy.wait('@getFoodPlaces');

    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 500,
      body: { message: 'forced-failure' },
    }).as('getStadiumsFailure');

    cy.reload();
    cy.wait('@getStadiumsFailure');
    cy.contains('구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.').should('be.visible');
    cy.get('#stadium-guide-select').should('be.disabled');
    categoryButton('구장 먹거리').should('be.disabled');
    searchInput().should('be.disabled');
    cy.screenshot('stadium-smoke-failure');

    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 200,
      body: stadiums,
    }).as('getStadiumsRecovered');
    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
      statusCode: 200,
      body: [],
    }).as('getFoodPlacesEmpty');

    cy.reload();
    cy.wait('@getStadiumsRecovered');
    cy.wait('@getFoodPlacesEmpty');
    placesPanel().contains('해당 카테고리에 등록된 장소가 없습니다.').should('be.visible');
    cy.screenshot('stadium-smoke-empty');
  });

  it('게스트 접근 + 카테고리 전환 + 검색/정렬 동작', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.contains('구장 가이드').should('be.visible');
    cy.contains('구장 선택').should('be.visible');
    desktopPanels().contains('주변 정보 카테고리').should('be.visible');
    cy.screenshot('stadium-smoke-normal-load');

    categoryButton('배달픽업존').click();
    cy.wait('@getDeliveryPlaces');
    placesPanel().contains('종합운동장역 6번 출구 픽업존').should('be.visible');

    categoryButton('구장 먹거리').click();
    cy.wait('@getFoodPlaces');

    searchInput().type('떡볶이');
    placesPanel().contains('이가네떡볶이').should('be.visible');
    placesPanel().contains('통밥').should('not.exist');

    searchInput().clear();
    sortSelect().select('평점순');
    placesPanel().find('[id^="place-"]').first().contains('통밥');

    sortSelect().select('이름순');
    placesPanel().find('[id^="place-"]').first().contains('브뤼셀프라이');
  });

  it('구장 목록/장소 목록 재시도 버튼이 각각 동작한다', () => {
    interceptGuestSession();

    let stadiumCallCount = 0;
    cy.intercept('GET', '**/api/stadiums', (req) => {
      stadiumCallCount += 1;
      if (stadiumCallCount <= 2) {
        req.reply({ statusCode: 500, body: { message: 'fail' } });
        return;
      }
      req.reply({ statusCode: 200, body: stadiums });
    }).as('getStadiums');

    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
      statusCode: 200,
      body: foodPlaces,
    }).as('getFoodPlaces');

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.contains('구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.').should('be.visible');
    cy.contains('button', '재시도').click();
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.get('#stadium-guide-select').should('contain', '잠실야구장');

    let placeCallCount = 0;
    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=delivery', (req) => {
      placeCallCount += 1;
      if (placeCallCount === 1) {
        req.reply({ statusCode: 500, body: { message: 'fail' } });
        return;
      }
      req.reply({ statusCode: 200, body: deliveryPlaces });
    }).as('getDeliveryWithRetry');

    categoryButton('배달픽업존').click();
    cy.wait('@getDeliveryWithRetry');
    placesPanel().contains('장소 목록을 불러오지 못했습니다.').should('be.visible');
    placesPanel().contains('button', '목록 다시 시도').click();
    cy.wait('@getDeliveryWithRetry');
    placesPanel().contains('종합운동장역 6번 출구 픽업존').should('be.visible');
  });

  it('지도 실패/주변검색 실패 상태를 명확히 표시한다', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    // 실제 UI는 console에 '로드 실패'를 찍지만 사용자 메시지는 '불러오지 못했습니다'로 노출.
    cy.contains('카카오맵 스크립트를 불러오지 못했습니다').should('be.visible');
    cy.contains('button', '지도 다시 시도').should('be.visible');
    cy.screenshot('stadium-smoke-map-sdk-failure');

    categoryButton('편의점').click();
    placesPanel().contains('지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.').should('be.visible');
    placesPanel().contains('button', '목록 다시 시도').should('be.visible');
    cy.screenshot('stadium-smoke-store-parking-failure');
  });

  it('로그인 사용자 즐겨찾기 토글이 add/remove 흐름으로 동작한다', () => {
    interceptLoggedInSession();
    interceptBaseStadiumApis();

    let favoriteIds: string[] = [];
    cy.intercept('GET', '**/api/stadiums/favorites', (req) => {
      req.reply({
        statusCode: 200,
        body: { stadiumIds: favoriteIds },
      });
    }).as('getFavorites');

    cy.intercept('POST', '**/api/stadiums/JAMSIL/favorite', () => {
      favoriteIds = ['JAMSIL'];
      return { statusCode: 200, body: { favourited: true } };
    }).as('addFavorite');

    cy.intercept('DELETE', '**/api/stadiums/JAMSIL/favorite', () => {
      favoriteIds = [];
      return { statusCode: 200, body: { favourited: false } };
    }).as('removeFavorite');

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.wait('@getFavorites');

    cy.get('button[aria-label="즐겨찾기 추가"]').click();
    cy.wait('@addFavorite');
    favoriteIds = ['JAMSIL'];
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.wait('@getFavorites');
    cy.get('button[aria-label="즐겨찾기 해제"]').should('be.visible');

    cy.get('button[aria-label="즐겨찾기 해제"]').first().click({ force: true });
    cy.wait('@removeFavorite');
    favoriteIds = [];
    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.wait('@getFavorites');
    cy.get('button[aria-label="즐겨찾기 추가"]').should('be.visible');
  });

  it('대구 좌석 CTA가 로그인 사용자 다이어리 draft로 연결된다', () => {
    interceptLoggedInSession();
    interceptBaseStadiumApis();
    interceptDiaryDraftApis();
    cy.intercept('GET', '**/api/stadiums/favorites', {
      statusCode: 200,
      body: { stadiumIds: [] },
    }).as('getFavorites');

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguFoodPlaces');
    cy.get('[data-testid="daegu-block-search"]', { timeout: 10000 }).filter(':visible').first().type('1-1');
    cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').filter(':visible').first().click();
    cy.contains('button', '다이어리에서 시야 사진 공유하기').click();

    cy.location('pathname').should('eq', '/mypage');
    cy.wait('@getDiaryEntries');
    cy.wait('@getDiaryGames');
    cy.contains('대구 좌석 정보가 반영되었습니다').should('be.visible');
    cy.get('input[placeholder="구역 (예: 1루 레드석)"]').should('have.value', '원정 응원석 1-1');
    cy.get('input[placeholder="블록 (예: 101블록)"]').should('have.value', '1-1');
  });

  it('대구 좌석 CTA가 게스트에게 기존 로그인 유도 흐름을 사용한다', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.get('#stadium-guide-select').select('DAEGU');
    cy.wait('@getDaeguFoodPlaces');
    cy.get('[data-testid="daegu-block-search"]', { timeout: 10000 }).filter(':visible').first().type('1-1');
    cy.get('[data-testid="daegu-section-finder-item-daegu-away-cheering-1-1"]').filter(':visible').first().click();
    cy.contains('button', '다이어리에서 시야 사진 공유하기').click();

    cy.contains('로그인 필요').should('be.visible');
    cy.window()
      .its('sessionStorage')
      .invoke('getItem', 'pendingLoginRedirect')
      .should('eq', '/mypage');
  });
});
