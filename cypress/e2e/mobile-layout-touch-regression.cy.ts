/// <reference types="cypress" />

export {};

const fixedNow = new Date('2026-06-14T12:00:00').getTime();
const today = '2026-06-14';
const minTouchSize = 44;

const rootInteractiveSelector = 'button,a[href],input,select,textarea,[role="button"]';
const bottomNavSelector = [
  '[data-testid="public-mobile-bottom-nav"]',
  '[data-testid="auth-mobile-bottom-nav"]',
  '[data-testid="cheer-mobile-bottom-nav"]',
].join(',');

const mockGuestAuth = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    },
  }).as('getMeAnonymous');
  cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 }).as('reissueAnonymous');
  cy.intercept('GET', '**/api/chat/my/unread-counts', {
    statusCode: 200,
    body: { success: true, data: 0 },
  });
  cy.intercept('GET', '**/api/notifications/my/unread-count', {
    statusCode: 200,
    body: 0,
  });
  cy.intercept('GET', '**/api/notifications/my', {
    statusCode: 200,
    body: [],
  });
};

const visitAsGuest = (path: string) => {
  cy.visit(path, {
    onBeforeLoad: (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem('bega_has_visited', 'true');
      win.localStorage.setItem('bega_dont_show_guide', 'true');
    },
  });
};

const mockHome = () => {
  cy.intercept('GET', '**/api/home/bootstrap*', {
    statusCode: 200,
    body: {
      selectedDate: today,
      leagueStartDates: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
      navigation: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-06-13',
        nextGameDate: '2026-06-15',
      },
      games: [
        {
          gameId: '20260614LTHH0',
          time: '18:30',
          stadium: '대전',
          gameStatus: 'SCHEDULED',
          gameStatusKr: '경기전',
          gameInfo: '',
          leagueType: 'REGULAR',
          homeTeam: 'HH',
          homeTeamFull: '한화 이글스',
          awayTeam: 'LT',
          awayTeamFull: '롯데 자이언츠',
          sourceDate: today,
        },
        {
          gameId: '20260614OBLG0',
          time: '18:30',
          stadium: '잠실',
          gameStatus: 'SCHEDULED',
          gameStatusKr: '경기전',
          gameInfo: '',
          leagueType: 'REGULAR',
          homeTeam: 'LG',
          homeTeamFull: 'LG 트윈스',
          awayTeam: 'OB',
          awayTeamFull: '두산 베어스',
          sourceDate: today,
        },
      ],
      scheduledGamesWindow: [],
    },
  }).as('getHomeBootstrap');
  cy.intercept('GET', '**/api/home/widgets*', {
    statusCode: 200,
    body: {
      hotCheerPosts: [],
      featuredMates: [],
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '2026 시즌 순위 데이터',
        isOffSeason: false,
        rankings: [],
      },
    },
  }).as('getHomeWidgets');
};

const mockStadiumGuide = () => {
  cy.intercept('GET', '**/api/stadiums', {
    statusCode: 200,
    body: [
      {
        stadiumId: 'jamsil',
        stadiumName: '잠실야구장',
        team: 'LG',
        lat: 37.512,
        lng: 127.071,
        address: '서울 송파구 올림픽로 25',
        phone: '02-2240-8800',
      },
    ],
  }).as('getStadiums');
  cy.intercept('GET', '**/api/stadiums/jamsil/places*', {
    statusCode: 200,
    body: [
      {
        id: 1,
        stadiumName: '잠실야구장',
        category: 'food',
        name: '야구분식',
        description: '경기 전 빠르게 들르기 좋은 식당',
        lat: 37.513,
        lng: 127.072,
        address: '서울 송파구 잠실동',
        phone: '02-0000-0000',
        rating: 4.5,
      },
    ],
  }).as('getStadiumPlaces');
};

const mockPredictionSchedule = () => {
  const game = {
    gameId: '20260614LTHH0',
    gameDate: today,
    homeTeam: 'HH',
    awayTeam: 'LT',
    stadium: '대전',
    startTime: '18:30:00',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기 예정',
    homeScore: null,
    awayScore: null,
    winner: null,
    homePitcher: null,
    awayPitcher: null,
  };

  cy.intercept('GET', '**/api/matches/bounds*', {
    statusCode: 200,
    body: {
      hasData: true,
      earliestGameDate: today,
      latestGameDate: today,
    },
  }).as('getPredictionMatchBounds');

  cy.intercept('GET', '**/api/matches/day*', {
    statusCode: 200,
    body: {
      date: today,
      games: [game],
      prevDate: null,
      nextDate: null,
      hasPrev: false,
      hasNext: false,
    },
  }).as('getPredictionMatchDay');

  cy.intercept('GET', /\/api\/matches\/(?!day|range|bounds)[^/?#]+(?:\?.*)?$/, {
    statusCode: 200,
    body: {
      ...game,
      inningScores: [],
      summary: [],
    },
  }).as('getPredictionGameDetail');
};

const rectOf = (element: Element) => element.getBoundingClientRect();

const visibleRectOf = (win: Window, element: Element) => {
  const rect = rectOf(element);
  let top = Math.max(rect.top, 0);
  let right = Math.min(rect.right, win.innerWidth);
  let bottom = Math.min(rect.bottom, win.innerHeight);
  let left = Math.max(rect.left, 0);
  let parent = element.parentElement;

  while (parent) {
    const style = win.getComputedStyle(parent);
    const clipsOverflow = /(auto|scroll|hidden|clip)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);

    if (clipsOverflow) {
      const parentRect = rectOf(parent);
      top = Math.max(top, parentRect.top);
      right = Math.min(right, parentRect.right);
      bottom = Math.min(bottom, parentRect.bottom);
      left = Math.max(left, parentRect.left);
    }

    if (right <= left || bottom <= top) {
      return null;
    }

    parent = parent.parentElement;
  }

  return { top, right, bottom, left, width: right - left, height: bottom - top };
};

const isVisible = (win: Window, element: Element) => {
  const style = win.getComputedStyle(element);
  const visibleRect = visibleRectOf(win, element);

  return Boolean(visibleRect)
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity || '1') > 0.01;
};

const overlaps = (
  left: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  right: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
) => (
  left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
);

const assertMinTarget = (selector: string, label: string) => {
  cy.get(selector)
    .first()
    .scrollIntoView()
    .should('be.visible')
    .then(($element) => {
      const rect = rectOf($element[0]);

      expect(rect.width, `${label} width`).to.be.at.least(minTouchSize);
      expect(rect.height, `${label} height`).to.be.at.least(minTouchSize);
    });
};

const assertSafeBottomPadding = (selector: string, label: string) => {
  cy.get(selector)
    .first()
    .should('be.visible')
    .then(($element) => {
      const paddingBottom = parseFloat(getComputedStyle($element[0]).paddingBottom);

      expect(paddingBottom, `${label} safe bottom padding`).to.be.at.least(96);
    });
};

const assertNoBottomNavOverlap = (navTestId: string) => {
  cy.get(`[data-testid="${navTestId}"]`).should('be.visible');
  Cypress._.times(6, () => {
    cy.window().then((win) => {
      win.scrollTo(0, win.document.documentElement.scrollHeight);
    });
    cy.wait(250);
  });

  cy.get(`[data-testid="${navTestId}"]`).then(($nav) => {
    const navRect = rectOf($nav[0]);

    cy.window().then((win) => {
      const overlappingLabels = [...win.document.querySelectorAll(rootInteractiveSelector)]
        .filter((element) => isVisible(win, element))
        .filter((element) => !element.closest(bottomNavSelector))
        .filter((element) => !element.closest('[data-testid^="chatbot"]'))
        .filter((element) => {
          const visibleRect = visibleRectOf(win, element);

          return Boolean(visibleRect && overlaps(visibleRect, navRect));
        })
        .map((element) => (element.textContent || element.getAttribute('aria-label') || element.tagName).replace(/\s+/g, ' ').trim())
        .slice(0, 8);

      expect(overlappingLabels, `${navTestId} overlapped interactive elements`).to.deep.equal([]);
    });
  });
};

describe('mobile layout and touch target regression', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
  });

  it('keeps common mobile header and footer targets at 44px on public routes', () => {
    mockHome();
    visitAsGuest('/home');
    cy.wait('@getHomeBootstrap');
    cy.tick(1500);

    assertMinTarget('header button[aria-label="메뉴 열기"]', 'common mobile menu button');
    assertMinTarget('header button:contains("BEGA")', 'common brand button');
    assertMinTarget('[data-testid="public-mobile-bottom-nav"] button', 'public mobile bottom nav item');
    assertSafeBottomPadding('main', 'common layout');
    cy.get('[data-testid="home-mobile-bottom-spacer"]')
      .should('be.visible')
      .then(($spacer) => {
        expect($spacer[0].getBoundingClientRect().height, 'home mobile bottom spacer height').to.be.at.least(96);
      });
    assertNoBottomNavOverlap('public-mobile-bottom-nav');
  });

  it('reserves footer safe space above the mobile bottom nav on public routes', () => {
    visitAsGuest('/prediction');
    cy.tick(1500);
    cy.contains('footer', '이용약관', { timeout: 6000 }).should('be.visible');
    assertSafeBottomPadding('footer', 'prediction footer');
    assertMinTarget('footer a[href="/home"]', 'prediction footer home link');
    assertMinTarget('footer a[href="/prediction"]', 'prediction footer prediction link');
    assertNoBottomNavOverlap('public-mobile-bottom-nav');

    visitAsGuest('/mate');
    cy.tick(1500);
    cy.contains('footer', '이용약관', { timeout: 6000 }).should('be.visible');
    assertSafeBottomPadding('footer', 'mate footer');
    assertMinTarget('footer a[href="/home"]', 'mate footer home link');
    assertMinTarget('footer a[href="/mate"]', 'mate footer mate link');
    assertNoBottomNavOverlap('public-mobile-bottom-nav');
  });

  it('keeps cheer tablet content above its bottom nav', () => {
    cy.viewport(768, 1024);
    visitAsGuest('/cheer');
    cy.tick(1500);
    cy.get('[data-testid="cheer-mobile-bottom-nav"]', { timeout: 10000 }).should('be.visible');
    assertNoBottomNavOverlap('cheer-mobile-bottom-nav');
  });

  it('keeps route-specific mobile controls at 44px touch targets', () => {
    visitAsGuest('/');
    assertMinTarget('button[aria-label*="모드로 변경"]', 'landing theme toggle');
    cy.window().then((win) => {
      win.scrollTo(0, win.document.documentElement.scrollHeight);
    });
    assertMinTarget('footer button:contains("주요 기능")', 'landing footer link');

    visitAsGuest('/login');
    assertMinTarget('label[for="remember-email"]', 'login remember-email checkbox');
    assertMinTarget('[data-testid="login-password-reset-link"]', 'login password reset link');
    assertMinTarget('[data-testid="login-signup-link"]', 'login signup link');

    mockPredictionSchedule();
    visitAsGuest(`/prediction?date=${today}`);
    cy.wait('@getPredictionMatchDay');
    cy.tick(1500);
    assertMinTarget('[data-testid="prediction-tab-match"]', 'prediction match tab');
    assertMinTarget('[data-testid="prediction-schedule-today-btn"]', 'prediction today button');
    assertMinTarget('[data-testid="prediction-schedule-month-prev"]', 'prediction previous month button');
    assertMinTarget('[data-testid="prediction-schedule-month-next"]', 'prediction next month button');

    mockStadiumGuide();
    visitAsGuest('/stadium');
    cy.wait('@getStadiums');
    cy.wait('@getStadiumPlaces');
    assertMinTarget('[data-testid="stadium-guide-places-panel"] input', 'stadium place search input');
    assertMinTarget('[data-testid="stadium-guide-places-panel"] select', 'stadium sort select');
    assertMinTarget('[data-testid="stadium-guide-places-panel"] button:contains("길찾기")', 'stadium place route button');
    assertMinTarget('[data-testid="jamsil-filter-lv-1f"]', 'stadium seat level filter');
    cy.get('[data-testid="stadium-mobile-bottom-spacer"]')
      .should('be.visible')
      .then(($spacer) => {
        expect($spacer[0].getBoundingClientRect().height, 'stadium mobile bottom spacer height').to.be.at.least(180);
      });
    assertNoBottomNavOverlap('public-mobile-bottom-nav');
  });
});
