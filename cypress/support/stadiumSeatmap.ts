/// <reference types="cypress" />

export const ALL_STADIUMS = [
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

export const interceptGuestSession = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: { success: false, message: 'Unauthorized' },
  }).as('getMeUnauthorized');
};

export const TEST_AUTH_PROFILE = {
  data: {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: 'testuser',
    favoriteTeam: 'SSG',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
  },
};
export const TEST_ACCESS_TOKEN = 'fake-stadium-seatmap-token';

type TestAuthWindow = Window & {
  __BEGA_TEST_AUTH_PROFILE__?: typeof TEST_AUTH_PROFILE;
};

export const seedLoggedInAuth = (win: Window) => {
  const originalAddEventListener = win.addEventListener.bind(win);
  win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === 'auth-session-expired' || type === 'global-api-error') {
      return;
    }
    return originalAddEventListener(type, listener, options);
  }) as typeof win.addEventListener;
  (win as TestAuthWindow).__BEGA_TEST_AUTH_PROFILE__ = TEST_AUTH_PROFILE;
  win.localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: TEST_AUTH_PROFILE.data,
      isAuthLoading: false,
      publicAuthBootstrapPhase: 'idle',
      showLoginRequiredDialog: false,
      pendingLoginRedirect: null,
    },
    version: 0,
  }));
  win.localStorage.setItem('accessToken', TEST_ACCESS_TOKEN);
  win.localStorage.setItem('auth-bootstrap-hint', '1');
  win.localStorage.setItem('auth-bootstrap-meta', JSON.stringify({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  }));
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
};

export const interceptLoggedInSession = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 200,
    body: {
      success: true,
      ...TEST_AUTH_PROFILE,
    },
  }).as('getMeApi');
  cy.intercept('GET', '**/auth/mypage*', {
    statusCode: 200,
    body: {
      success: true,
      ...TEST_AUTH_PROFILE,
    },
  }).as('getMe');
  cy.intercept('POST', '**/api/auth/reissue*', {
    statusCode: 200,
    body: { success: true, data: { accessToken: TEST_ACCESS_TOKEN } },
  }).as('reissue');
  cy.intercept('GET', '**/api/chat/my/unread-counts', {
    statusCode: 200,
    body: { success: true, data: 0 },
  }).as('getChatUnreadCounts');
  cy.intercept('GET', '**/api/notifications/my/unread-count', {
    statusCode: 200,
    body: 0,
  }).as('getNotificationUnreadCount');
  cy.intercept('GET', '**/api/notifications/my', {
    statusCode: 200,
    body: [],
  }).as('getNotifications');
};

export const interceptBaseApis = () => {
  cy.intercept('GET', '**/api/stadiums/*/places?category=food', { statusCode: 200, body: [] });
  cy.intercept('GET', '**/api/stadiums', { statusCode: 200, body: ALL_STADIUMS }).as('getStadiums');
  cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', { statusCode: 200, body: [] }).as('getJamsilPlaces');
  cy.intercept('GET', '**/api/stadiums/DAEGU/places?category=food', { statusCode: 200, body: [] }).as('getDaeguPlaces');
  cy.intercept('GET', '**/api/stadiums/DAEJEON/places?category=food', { statusCode: 200, body: [] }).as('getDaejeonPlaces');
  cy.intercept('GET', '**/api/stadiums/GOCHEOK/places?category=food', { statusCode: 200, body: [] }).as('getGocheokPlaces');
  cy.intercept('GET', '**/api/stadiums/GWANGJU/places?category=food', { statusCode: 200, body: [] }).as('getGwangjuPlaces');
  cy.intercept('GET', '**/api/stadiums/INCHEON/places?category=food', { statusCode: 200, body: [] }).as('getIncheonPlaces');
  cy.intercept('GET', '**/api/stadiums/SUWON/places?category=food', { statusCode: 200, body: [] }).as('getSuwonPlaces');
  cy.intercept('GET', '**/api/stadiums/favorites', { statusCode: 200, body: { stadiumIds: [] } }).as('getFavorites');
  cy.intercept('GET', '**/api/diary/seat-views*', { statusCode: 200, body: [] }).as('getSeatViews');
};

export const interceptDiaryDraftApis = () => {
  cy.intercept('GET', '**/api/diary/entries*', { statusCode: 200, body: [] }).as('getDiaryEntries');
  cy.intercept('GET', '**/api/diary/games*', { statusCode: 200, body: [] }).as('getDiaryGames');
  cy.intercept('GET', '**/api/diary/statistics*', {
    statusCode: 200,
    body: {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    },
  }).as('getDiaryStatistics');
};

export const visitStadiumGuide = () => {
  interceptGuestSession();
  interceptBaseApis();
  cy.visit('/stadium');
  cy.wait('@getStadiums');
  cy.wait('@getJamsilPlaces');
};

export const selectDaejeonStadium = () => {
  cy.get('#stadium-guide-select').select('DAEJEON');
  cy.wait('@getDaejeonPlaces');
  cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 }).scrollIntoView();
};

export function withinVisibleStadiumSeatMap(callback: () => void) {
  cy.get('[data-testid="stadium-guide-seatmap"]', { timeout: 10000 })
    .filter(':visible')
    .last()
    .within(callback);
}
