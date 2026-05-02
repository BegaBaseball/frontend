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

    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');
  };

  const assertMinTarget = ($element: JQuery<HTMLElement | SVGElement>, label: string) => {
    const rect = $element[0].getBoundingClientRect();
    expect(rect.width, `${label} width`).to.be.greaterThan(43);
    expect(rect.height, `${label} height`).to.be.greaterThan(43);
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
    cy.contains('구장 목록 로딩 중...').filter(':visible').should('be.visible');
    cy.screenshot('stadium-smoke-loading');
    cy.wait('@getStadiumsLoading');
    cy.wait('@getFoodPlaces');

    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 500,
      body: { message: 'forced-failure' },
    }).as('getStadiumsFailure');

    cy.reload();
    cy.wait('@getStadiumsFailure');
    cy.contains('구장 정보를 불러오지 못했습니다.').filter(':visible').should('be.visible');
    cy.get('#stadium-guide-select').should('be.disabled');
    cy.get('button[aria-label="구장 먹거리 주변 정보 보기"]').filter(':visible').should('be.disabled');
    cy.get('input[placeholder="장소 이름 검색..."]').should('be.disabled');
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
    cy.get('.stadium-guide-list-shell .text-center').filter(':visible').should(
      'contain.text',
      '해당 카테고리에 등록된 장소가 없습니다.',
    );
    cy.screenshot('stadium-smoke-empty');
  });

  it('게스트 접근 + 카테고리 전환 + 검색/정렬 동작', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.contains('구장 가이드').filter(':visible').should('be.visible');
    cy.contains('구장 선택').filter(':visible').should('be.visible');
    cy.contains('주변 정보 카테고리').filter(':visible').should('be.visible');
    cy.screenshot('stadium-smoke-normal-load');

    cy.get('button[aria-label="배달픽업존 주변 정보 보기"]').filter(':visible').click();
    cy.wait('@getDeliveryPlaces');
    cy.contains('종합운동장역 6번 출구 픽업존').filter(':visible').should('be.visible');

    cy.get('button[aria-label="구장 먹거리 주변 정보 보기"]').filter(':visible').click();
    cy.wait('@getFoodPlaces');

    cy.get('input[placeholder="장소 이름 검색..."]').type('떡볶이');
    cy.contains('이가네떡볶이').filter(':visible').should('be.visible');
    cy.contains('통밥').filter(':visible').should('not.exist');

    cy.get('input[placeholder="장소 이름 검색..."]').clear();
    cy.get('select.stadium-guide-select:visible').select('평점순');
    cy.get('[id^="place-"]').filter(':visible').first().contains('통밥');

    cy.get('select.stadium-guide-select:visible').select('이름순');
    cy.get('[id^="place-"]').filter(':visible').first().contains('브뤼셀프라이');
  });

  it('모바일에서 주요 컨트롤과 좌석맵이 겹침 없이 동작한다', () => {
    cy.viewport(390, 844);
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.window().then((win) => {
      const doc = win.document.documentElement;
      expect(doc.scrollWidth, 'document horizontal overflow').to.be.at.most(win.innerWidth);
    });

    cy.get('#stadium-guide-select').then(($select) => {
      assertMinTarget($select, 'stadium select');
    });
    cy.contains('button', '카카오맵 길찾기').then(($button) => {
      assertMinTarget($button, 'route button');
    });
    cy.contains('button', '구장 먹거리').then(($button) => {
      assertMinTarget($button, 'category button');
    });

    cy.get('[data-testid="stadium-seat-map"]').should('be.visible').then(($map) => {
      const rect = $map[0].getBoundingClientRect();
      expect(rect.height, 'seat map stable height').to.be.greaterThan(299);
    });
    cy.get('[data-testid="stadium-seat-map"] path[role="button"]').first().click({ force: true });
    cy.contains('이 구역 시야 보기').should('be.visible');
    cy.contains('button', '이 구역 시야 보기').click();
    cy.wait('@getSeatViews');
    cy.get('[data-testid="stadium-seat-view-dialog"]').should('be.visible');
    cy.contains('아직 등록된 시야가 없어요').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="stadium-seat-view-dialog"]').should('not.exist');
  });

  it('구장 목록/장소 목록 재시도 버튼이 각각 동작한다', () => {
    interceptGuestSession();

    let allowStadiumRetrySuccess = false;
    cy.intercept('GET', '**/api/stadiums', (req) => {
      if (!allowStadiumRetrySuccess) {
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
    cy.wait('@getStadiums').its('response.statusCode').should('eq', 500);
    cy.contains('구장 정보를 불러오지 못했습니다.').filter(':visible').should('be.visible');
    cy.contains('button', '재시도').filter(':visible').should('be.visible').then(($button) => {
      allowStadiumRetrySuccess = true;
      cy.wrap($button).click({ force: true });
    });
    cy.wait('@getStadiums').then((interception) => {
      if (interception.response?.statusCode === 200) {
        return;
      }
      cy.wait('@getStadiums').its('response.statusCode').should('eq', 200);
    });
    cy.wait('@getFoodPlaces');
    cy.contains('잠실야구장').filter(':visible').should('be.visible');

    let placeCallCount = 0;
    cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=delivery', (req) => {
      placeCallCount += 1;
      if (placeCallCount === 1) {
        req.reply({ statusCode: 500, body: { message: 'fail' } });
        return;
      }
      req.reply({ statusCode: 200, body: deliveryPlaces });
    }).as('getDeliveryWithRetry');

    cy.get('button[aria-label="배달픽업존 주변 정보 보기"]').filter(':visible').click();
    cy.wait('@getDeliveryWithRetry');
    cy.contains('장소 목록을 불러오지 못했습니다.').filter(':visible').should('be.visible');
    cy.contains('button', '목록 다시 시도').filter(':visible').click();
    cy.wait('@getDeliveryWithRetry');
    cy.contains('종합운동장역 6번 출구 픽업존').filter(':visible').should('be.visible');
  });

  it('지도 실패/주변검색 실패 상태를 명확히 표시한다', () => {
    interceptGuestSession();
    interceptBaseStadiumApis();

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');

    cy.contains(/카카오맵.*(로드 실패|불러오지 못했습니다)/).filter(':visible').should('be.visible');
    cy.contains('button', '지도 다시 시도').filter(':visible').should('be.visible');
    cy.screenshot('stadium-smoke-map-sdk-failure');

    cy.get('button[aria-label="편의점 주변 정보 보기"]').filter(':visible').click();
    cy.contains('지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.').filter(':visible').should('be.visible');
    cy.contains('button', '목록 다시 시도').filter(':visible').should('be.visible');
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

    cy.intercept('POST', '**/api/stadiums/JAMSIL/favorite', (req) => {
      favoriteIds = ['JAMSIL'];
      req.reply({ statusCode: 200, body: { favorited: true } });
    }).as('addFavorite');

    cy.intercept('DELETE', '**/api/stadiums/JAMSIL/favorite', (req) => {
      favoriteIds = [];
      req.reply({ statusCode: 200, body: { favorited: false } });
    }).as('removeFavorite');

    cy.visit('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getFoodPlaces');
    cy.wait('@getFavorites');

    cy.get('button[aria-label="즐겨찾기 추가"]').click();
    cy.wait('@addFavorite');
    cy.wait('@getFavorites');
    cy.get('button[aria-label="즐겨찾기 해제"]').should('be.visible');

    cy.get('button[aria-label="즐겨찾기 해제"]').first().click({ force: true });
    cy.wait('@removeFavorite');
    cy.wait('@getFavorites');
    cy.get('button[aria-label="즐겨찾기 추가"]').should('be.visible');
  });
});
