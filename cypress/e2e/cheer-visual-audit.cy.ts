/// <reference types="cypress" />

export {};

type ThemeMode = 'light' | 'dark';
type CheerVisualState = 'feed' | 'search' | 'live' | 'empty';

interface CheerVisualScenario {
  id: string;
  viewport: [number, number];
  theme: ThemeMode;
  teamId: 'HH' | 'KIA' | 'NC';
  teamColor: string;
  state: CheerVisualState;
}

const authToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNoZWVyVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.fake-signature';

const scenarios: CheerVisualScenario[] = [
  { id: 'mobile-390-light-kia-feed', viewport: [390, 844], theme: 'light', teamId: 'KIA', teamColor: '#EA0029', state: 'feed' },
  { id: 'mobile-390-dark-hh-search', viewport: [390, 844], theme: 'dark', teamId: 'HH', teamColor: '#F37321', state: 'search' },
  { id: 'tablet-834-light-nc-empty', viewport: [834, 1112], theme: 'light', teamId: 'NC', teamColor: '#315288', state: 'empty' },
  { id: 'tablet-834-dark-kia-live', viewport: [834, 1112], theme: 'dark', teamId: 'KIA', teamColor: '#EA0029', state: 'live' },
  { id: 'tablet-landscape-1112-light-hh-search', viewport: [1112, 834], theme: 'light', teamId: 'HH', teamColor: '#F37321', state: 'search' },
  { id: 'tablet-landscape-1112-dark-nc-feed', viewport: [1112, 834], theme: 'dark', teamId: 'NC', teamColor: '#315288', state: 'feed' },
  { id: 'desktop-1440-light-nc-live', viewport: [1440, 1100], theme: 'light', teamId: 'NC', teamColor: '#315288', state: 'live' },
  { id: 'desktop-1440-dark-hh-empty', viewport: [1440, 1100], theme: 'dark', teamId: 'HH', teamColor: '#F37321', state: 'empty' },
];

const pageResponse = (content: unknown[]) => ({
  content,
  last: true,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  size: 20,
  number: 0,
});

const makePost = (teamId: CheerVisualScenario['teamId']) => ({
  id: 7101,
  content: '오늘도 끝까지 함께 응원해요 #승리요정',
  author: '응원단장',
  authorId: 901,
  authorHandle: 'cheerleader',
  teamId,
  team: teamId,
  authorTeamId: teamId,
  timeAgo: '5분 전',
  comments: 12,
  likes: 38,
  likeCount: 38,
  commentCount: 12,
  bookmarkCount: 7,
  repostCount: 2,
  views: 184,
  liked: false,
  likedByUser: false,
  bookmarked: false,
  isBookmarked: false,
  repostedByMe: false,
  postType: 'NORMAL',
  isOwner: false,
  isHot: true,
  createdAt: '2026-07-11T09:00:00.000Z',
  updatedAt: '2026-07-11T09:00:00.000Z',
  images: [],
  imageUrls: [],
});

const makeLiveGame = (teamId: CheerVisualScenario['teamId']) => ({
  gameId: '20260711VISUAL0',
  gameDate: '2026-07-11',
  time: '18:30',
  stadium: teamId === 'HH' ? '대전' : teamId === 'KIA' ? '광주' : '창원',
  awayTeam: 'LG',
  awayTeamFull: 'LG 트윈스',
  homeTeam: teamId,
  homeTeamFull: teamId === 'HH' ? '한화 이글스' : teamId === 'KIA' ? 'KIA 타이거즈' : 'NC 다이노스',
  awayScore: 2,
  homeScore: 4,
  gameStatus: 'PLAYING',
  gameStatusKr: '5회말',
});

const seedSession = (win: Window, scenario: CheerVisualScenario) => {
  win.localStorage.setItem('kbo-theme', scenario.theme);
  win.localStorage.setItem(
    'auth-storage',
    JSON.stringify({
      state: {
        user: {
          id: 123,
          email: 'cheer@example.com',
          name: 'CheerUser',
          handle: 'cheeruser',
          favoriteTeam: scenario.teamId,
          favoriteTeamColor: scenario.teamColor,
          role: 'ROLE_USER',
          isAdmin: false,
          profileImageUrl: null,
          hasPassword: true,
          policyConsentRequired: false,
          policyConsentNoticeRequired: false,
          missingPolicyTypes: [],
        },
        isLoggedIn: true,
        isAdmin: false,
      },
      version: 0,
    }),
  );
  win.localStorage.setItem('accessToken', authToken);
  win.localStorage.setItem('auth-bootstrap-hint', '1');
  win.localStorage.setItem('auth-bootstrap-meta', JSON.stringify({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  }));
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
  win.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');

  Object.defineProperty(win, 'matchMedia', {
    configurable: true,
    writable: true,
    value: ((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)'
        ? scenario.theme === 'dark'
        : query === '(min-width: 1024px)'
          ? scenario.viewport[0] >= 1024
          : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as MediaQueryList,
  });
};

const setupScenarioMocks = (scenario: CheerVisualScenario) => {
  const posts = scenario.state === 'empty' ? [] : [makePost(scenario.teamId)];
  const searchPosts = scenario.state === 'search'
    ? [{
        ...makePost(scenario.teamId),
        id: 7202,
        content: '검색 결과 전용 응원글 #승리요정',
      }]
    : posts;
  const games = scenario.state === 'live' ? [makeLiveGame(scenario.teamId)] : [];

  cy.intercept('GET', '**/api/cheer/posts/hot*', {
    statusCode: 200,
    body: pageResponse(posts),
  });
  cy.intercept('GET', '**/api/cheer/posts?*', {
    statusCode: 200,
    body: pageResponse(posts),
  }).as('getVisualPosts');
  cy.intercept('GET', '**/api/cheer/posts/search*', {
    statusCode: 200,
    body: pageResponse(searchPosts),
  }).as('getVisualSearch');
  cy.intercept('GET', '**/api/leaderboard?*', {
    statusCode: 200,
    body: {
      content: [
        { rank: 1, handle: '@weekly-one', userName: '주간리더', level: 8, rankTitle: 'MAJOR_LEAGUER', score: 2150, streak: 4 },
        { rank: 2, handle: '@weekly-two', userName: '끝내기팬', level: 7, rankTitle: 'MINOR_LEAGUER', score: 1980, streak: 2 },
      ],
      totalPages: 1,
      totalElements: 2,
    },
  }).as('getVisualWeeklyLeaderboard');
  cy.intercept('GET', '**/api/kbo/schedule*', {
    statusCode: 200,
    body: games,
  }).as('getVisualSchedule');
  cy.intercept('GET', '**/api/matches/*/live*', {
    statusCode: 200,
    body: scenario.state === 'live'
      ? {
          gameId: '20260711VISUAL0',
          gameStatus: 'PLAYING',
          awayScore: 2,
          homeScore: 4,
          currentInning: 5,
          currentInningHalf: 'BOTTOM',
          lastEventSeq: 1,
          events: [{
            eventSeq: 1,
            inning: 5,
            inningHalf: 'BOTTOM',
            description: '내부 경기 이벤트 기반 응원 타이밍입니다.',
            resultCode: 'HIT',
            awayScore: 2,
            homeScore: 4,
          }],
        }
      : { gameId: '20260711VISUAL0', events: [] },
  }).as('getVisualLiveSnapshot');
};

const stabilizeVisuals = () => {
  cy.document().then((document) => {
    const style = document.createElement('style');
    style.setAttribute('data-testid', 'cheer-visual-stability-style');
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });
};

const waitForVisualAssets = () => {
  cy.document().then((document) => document.fonts.ready);
  cy.get('img').each(($image) => {
    cy.wrap($image).should(($candidate) => {
      expect(($candidate[0] as HTMLImageElement).complete, 'image complete').to.eq(true);
    });
  });
  cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
  }));
};

const openScenarioState = (scenario: CheerVisualScenario) => {
  if (scenario.state === 'search') {
    cy.get('input[aria-label="응원글 검색"]').type('승리요정');
    cy.wait('@getVisualSearch');
    cy.contains('검색 결과 전용 응원글').should('be.visible');
    return;
  }

  if (scenario.state === 'live') {
    cy.contains('button', '라이브').click();
    cy.location('search').should('include', 'tab=live');
    cy.wait('@getVisualSchedule');
    cy.wait('@getVisualLiveSnapshot');
    cy.contains('LIVE').should('be.visible');
    cy.contains('실시간 경기').should('be.visible');
    cy.contains('내부 경기 이벤트 기반 응원 타이밍입니다.').should('be.visible');
    return;
  }

  if (scenario.state === 'empty') {
    cy.contains('아직 작성된 응원글이 없습니다.').should('be.visible');
    return;
  }

  cy.get('[data-testid="cheer-post-card"]').should('be.visible');
};

// This spec captures deterministic visual-audit artifacts. Pixel baseline comparison is intentionally separate.
describe('Cheer visual audit matrix', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
  });

  scenarios.forEach((scenario) => {
    it(scenario.id, () => {
      cy.viewport(...scenario.viewport);
      setupScenarioMocks(scenario);
      cy.visit('/cheer', {
        onBeforeLoad(win) {
          seedSession(win, scenario);
        },
      });

      cy.wait('@getVisualPosts');
      if (scenario.viewport[0] >= 1024 && scenario.state !== 'live') {
        cy.wait('@getVisualSchedule');
      }
      cy.document().then((document) => {
        expect(document.documentElement.classList.contains('dark')).to.eq(scenario.theme === 'dark');
      });
      openScenarioState(scenario);
      cy.scrollTo('top', { duration: 0 });
      stabilizeVisuals();
      waitForVisualAssets();

      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth, 'horizontal overflow').to.be.lte(scenario.viewport[0]);
      });
      cy.get('input[aria-label="응원글 검색"]').should('be.visible');
      cy.contains('button', '전체').should('be.visible');
      if (scenario.viewport[0] >= 1024) {
        cy.wait('@getVisualWeeklyLeaderboard');
        cy.contains('팀 정보 요약').should('be.visible');
        cy.contains('테마').should('be.visible');
        cy.contains('인기 피드 태그').should('exist');
        if (scenario.state === 'empty') {
          cy.contains('집계된 해시태그가 아직 없습니다.').should('exist');
        } else {
          cy.contains('button', '#승리요정').should('exist');
        }
        cy.contains('주간 포인트 리더').should('exist');
        cy.contains('주간리더').should('exist');
      } else {
        cy.get('[data-testid="cheer-mobile-bottom-nav"]').should('be.visible');
      }

      cy.screenshot(`cheer-visual-audit/${scenario.id}`, {
        capture: 'viewport',
        overwrite: true,
      });
    });
  });
});
