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
  };

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
    cy.contains('구장 목록 로딩 중...').should('be.visible');
    cy.screenshot('stadium-smoke-loading');
    cy.wait('@getStadiumsLoading');
    cy.wait('@getFoodPlaces');

    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 500,
      body: { message: 'forced-failure' },
    }).as('getStadiumsFailure');

    cy.reload();
    cy.wait('@getStadiumsFailure');
    cy.contains('구장 목록을 불러오는데 실패했습니다.').should('be.visible');
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
    cy.contains('해당 카테고리에 등록된 장소가 없습니다.').should('be.visible');
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
    cy.contains('카테고리').should('be.visible');
    cy.screenshot('stadium-smoke-normal-load');

    cy.get('button').contains('배달픽업존').click();
    cy.wait('@getDeliveryPlaces');
    cy.contains('종합운동장역 6번 출구 픽업존').should('be.visible');

    cy.get('button').contains('구장 먹거리').click();
    cy.wait('@getFoodPlaces');

    cy.get('input[placeholder="장소 이름 검색..."]').type('떡볶이');
    cy.contains('이가네떡볶이').should('be.visible');
    cy.contains('통밥').should('not.exist');

    cy.get('input[placeholder="장소 이름 검색..."]').clear();
    cy.get('select').eq(1).select('평점순');
    cy.get('[id^="place-"]').first().contains('통밥');

    cy.get('select').eq(1).select('이름순');
    cy.get('[id^="place-"]').first().contains('브뤼셀프라이');
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
    cy.contains('구장 목록을 불러오는데 실패했습니다.').should('be.visible');
    cy.contains('button', '재시도').click();
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.contains('잠실야구장').should('be.visible');

    let placeCallCount = 0;
    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=delivery', (req) => {
      placeCallCount += 1;
      if (placeCallCount === 1) {
        req.reply({ statusCode: 500, body: { message: 'fail' } });
        return;
      }
      req.reply({ statusCode: 200, body: deliveryPlaces });
    }).as('getDeliveryWithRetry');

    cy.get('button').contains('배달픽업존').click();
    cy.wait('@getDeliveryWithRetry');
    cy.contains('장소 목록을 불러오지 못했습니다.').should('be.visible');
    cy.contains('button', '목록 다시 시도').click();
    cy.wait('@getDeliveryWithRetry');
    cy.contains('종합운동장역 6번 출구 픽업존').should('be.visible');
  });

  it('지도 실패/주변검색 실패 상태를 명확히 표시한다', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.contains('카카오맵 스크립트 로드 실패').should('be.visible');
    cy.contains('button', '지도 다시 시도').should('be.visible');
    cy.screenshot('stadium-smoke-map-sdk-failure');

    cy.get('button').contains('편의점').click();
    cy.contains('지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.').should('be.visible');
    cy.contains('button', '목록 다시 시도').should('be.visible');
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
});
