/// <reference types="cypress" />

describe('Theme visual checks for public pages', () => {
  type ThemeMode = 'light' | 'dark';

  const offseasonMovements = [
    {
      id: 1,
      date: '2026-12-01',
      section: 'FA',
      team: 'HH',
      player: '이정후',
      remarks: 'KBO 리그 이적',
      isBigEvent: true,
      estimatedAmount: 180,
    },
    {
      id: 2,
      date: '2026-12-10',
      section: '트레이드',
      team: 'SS',
      player: '김도영',
      remarks: '시즌 초반 영입 이슈',
      isBigEvent: false,
      estimatedAmount: 90,
    },
  ];

  const offseasonMetadata = {
    awards: [
      {
        award: 'MVP',
        playerName: '김도영',
        team: 'KIA',
        stats: '타율 .347 / 32홈런 / 109타점',
      },
    ],
    postSeasonResults: [],
    finalRankings: [
      {
        rank: 1,
        teamId: 'HH',
        teamName: '한화 이글스',
        wins: 87,
        losses: 55,
        draws: 2,
        winRate: '.613',
      },
      {
        rank: 2,
        teamId: 'SS',
        teamName: '삼성 라이온즈',
        wins: 78,
        losses: 63,
        draws: 3,
        winRate: '.553',
      },
    ],
  };

  const cheerPosts = {
    content: [
      {
        id: 101,
        teamId: 'HH',
        team: '한화',
        postType: 'NORMAL',
        author: '테스트 유저',
        authorHandle: 'testuser',
        authorProfileImageUrl: null,
        content: '직관 메이트 모임 같이 가요',
        createdAt: '2026-03-22T08:00:00.000Z',
        updatedAt: '2026-03-22T08:00:00.000Z',
        likeCount: 3,
        commentCount: 2,
        bookmarkCount: 0,
        repostCount: 0,
        views: 18,
        liked: false,
        bookmarked: false,
        repostedByMe: false,
        isOwner: false,
        isHot: false,
      },
    ],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  };

  const noticePosts = {
    content: [
      {
        id: 201,
        teamId: 'HH',
        team: '한화',
        postType: 'NOTICE',
        author: '운영자',
        authorHandle: 'admin',
        authorProfileImageUrl: null,
        content: '점검 안내 공지',
        createdAt: '2026-03-20T06:00:00.000Z',
        updatedAt: '2026-03-20T06:00:00.000Z',
        likeCount: 0,
        commentCount: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 2,
        liked: false,
        bookmarked: false,
        repostedByMe: false,
        isOwner: false,
        isHot: false,
      },
    ],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  };

  const leaderboardData = {
    content: [
      {
        rank: 1,
        userName: '한화스타',
        handle: 'testuser',
        profileImageUrl: null,
        level: 8,
        score: 12500,
        streak: 12,
        rankTitle: 'MAJOR_LEAGUER',
      },
      {
        rank: 2,
        userName: '야구팬',
        handle: 'fan01',
        profileImageUrl: null,
        level: 7,
        score: 11870,
        streak: 6,
        rankTitle: 'MINOR_LEAGUER',
      },
    ],
    totalPages: 1,
    totalElements: 2,
  };

  const myRank = {
    handle: 'testuser',
    userName: 'TestUser',
    rank: 1,
    totalScore: 12500,
    seasonScore: 12500,
    monthlyScore: 6400,
    weeklyScore: 1600,
    level: 8,
    rankTitle: 'MAJOR_LEAGUER',
    currentStreak: 12,
    maxStreak: 18,
    experiencePoints: 580,
    nextLevelExp: 900,
    accuracy: 88.9,
    totalPredictions: 1410,
    correctPredictions: 1252,
  };

  const hotStreakData = [
    { handle: 'fireone', userName: '파이어원', streak: 7, level: 10 },
    { handle: 'lightning', userName: '라이트닝', streak: 5, level: 9 },
  ];

  const recentScoreData = [
    {
      id: 1,
      handle: 'commentator',
      userName: '해설가',
      eventType: 'UPSET_BONUS',
      score: 150,
      streak: 2,
      timestamp: '2026-03-22T09:00:00.000Z',
    },
  ];

  const stadiums = [
    {
      stadiumId: 'JAMSIL',
      stadiumName: '잠실야구장',
      lat: 37.5122,
      lng: 127.072,
      address: '서울 송파구',
      team: 'LG/두산',
      phone: null,
    },
    {
      stadiumId: 'SAESIN',
      stadiumName: '대전한화생명 이글스파크',
      lat: 36.318,
      lng: 127.43,
      address: '대전광역시',
      team: 'HH',
      phone: null,
    },
  ];

  const stadiumPlaces = [
    {
      id: 1,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '잠실한식당',
      description: '응원 포인트',
      lat: 37.5124,
      lng: 127.0721,
      address: '서울 송파구',
      phone: null,
      rating: 4.6,
      openTime: null,
      closeTime: null,
    },
  ];

  const predictionDate = '2026-03-22';
  const previousPredictionDate = '2026-03-21';
  const nextPredictionDate = '2026-03-23';
  const predictionGameId = `${predictionDate.replace(/-/g, '')}HHSS0`;

  const buildMatchDayResponse = (
    date: string,
    games: Array<Record<string, unknown>>,
    prevDate: string | null,
    nextDate: string | null
  ) => ({
    date,
    games,
    prevDate,
    nextDate,
    hasPrev: Boolean(prevDate),
    hasNext: Boolean(nextDate),
  });

  const seedTheme = (win: Window, theme: ThemeMode) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');

    Object.defineProperty(win, 'matchMedia', {
      configurable: true,
      writable: true,
      value: ((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? theme === 'dark' : false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
      })) as unknown as MediaQueryList,
    });
  };

  const visitWithTheme = (path: string, theme: ThemeMode) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        seedTheme(win, theme);
      },
    });

    cy.window().then((win) => {
      seedTheme(win, theme);
      const root = win.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    });
  };

  const setupCommonMocks = () => {
    cy.intercept('GET', 'https://dapi.kakao.com/**', {
      forceNetworkError: true,
    }).as('getKakao');

    cy.intercept('GET', '**/api/cheer/posts/hot*', {
      statusCode: 200,
      body: cheerPosts,
    }).as('getCheerHotPosts');

    cy.intercept('GET', '**/parties*', {
      statusCode: 200,
      body: [],
    }).as('getParties');
  };

  const setupCheerMocks = () => {
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, (req) => {
      const isNotice = req.url.includes('postType=NOTICE');
      req.reply({
        statusCode: 200,
        body: isNotice ? noticePosts : cheerPosts,
      });
    }).as('getCheerPosts');

    cy.intercept('GET', '**/api/cheer/posts/changes*', {
      statusCode: 200,
      body: {
        newCount: 0,
        latestId: null,
      },
    }).as('getCheerChanges');
  };

  const setupOffseasonMocks = () => {
    cy.intercept('GET', '**/kbo/offseason/movements*', {
      statusCode: 200,
      body: offseasonMovements,
    }).as('getOffseasonMovements');

    cy.intercept('GET', '**/kbo/offseason/metadata*', {
      statusCode: 200,
      body: offseasonMetadata,
    }).as('getOffseasonMetadata');

    cy.intercept('GET', '**/kbo/rankings*', {
      statusCode: 200,
      body: offseasonMetadata.finalRankings,
    }).as('getOffseasonRankings');
  };

  const setupLeaderboardMocks = () => {
    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
      statusCode: 200,
      body: leaderboardData,
    }).as('getLeaderboard');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRank,
    }).as('getMyRank');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/hot-streaks' }, {
      statusCode: 200,
      body: hotStreakData,
    }).as('getHotStreaks');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/recent-scores' }, {
      statusCode: 200,
      body: recentScoreData,
    }).as('getRecentScores');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups' }, {
      statusCode: 200,
      body: {
        MAGIC_BAT: 3,
        GOLDEN_GLOVE: 1,
        SCOUTER: 2,
      },
    }).as('getPowerups');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups/active' }, {
      statusCode: 200,
      body: [
        {
          type: 'SCOUTER',
          gameId: `${predictionDate.replace(/-/g, '')}HHSS0`,
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      ],
    }).as('getActivePowerups');
  };

  const setupStadiumMocks = () => {
    cy.intercept('GET', '**/api/stadiums', {
      statusCode: 200,
      body: stadiums,
    }).as('getStadiums');

    cy.intercept('GET', '**/api/stadiums/*/places*', {
      statusCode: 200,
      body: stadiumPlaces,
    }).as('getStadiumPlaces');
  };

  const setupPredictionMocks = () => {
    cy.intercept('GET', '**/api/matches/bounds*', {
      statusCode: 200,
      body: {
        hasData: true,
        earliestGameDate: previousPredictionDate,
        latestGameDate: nextPredictionDate,
      },
    }).as('getMatchBounds');

    cy.intercept('GET', '**/api/matches/day*', (req) => {
      const date = new URL(req.url).searchParams.get('date') || '';

      if (date === predictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(predictionDate, [
            {
              gameId: predictionGameId,
              gameDate: predictionDate,
              homeTeam: 'HH',
              awayTeam: 'SS',
              stadium: '대전',
              homeScore: null,
              awayScore: null,
              winner: null,
            },
          ], previousPredictionDate, nextPredictionDate),
        });
        return;
      }

      if (date === previousPredictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(previousPredictionDate, [], null, predictionDate),
        });
        return;
      }

      if (date === nextPredictionDate) {
        req.reply({
          statusCode: 200,
          body: buildMatchDayResponse(nextPredictionDate, [], predictionDate, null),
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: buildMatchDayResponse(date, [], null, null),
      });
    }).as('getMatchDay');

    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: {
        content: [],
        page: 0,
        size: 150,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }).as('getMatchRange');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          [predictionGameId]: null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVotePredictionTheme');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: {
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
      },
    }).as('getVoteStatus');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      if (
        req.url.includes('/api/matches/day') ||
        req.url.includes('/api/matches/range') ||
        req.url.includes('/api/matches/bounds')
      ) {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          gameId: predictionGameId,
          gameDate: predictionDate,
          homeTeam: 'HH',
          awayTeam: 'SS',
          stadium: '대전',
          gameStatus: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          winner: null,
        },
      });
    }).as('getMatchDetail');
  };

  const captureThemeCases = (
    label: string,
    path: string,
    setup: () => void,
    assert: () => void
  ) => {
    ['light', 'dark'].forEach((mode) => {
      it(`${label} - ${mode}`, () => {
        setup();
        visitWithTheme(path, mode as ThemeMode);
        assert();
        cy.screenshot(`theme-page-visual-${label}-${mode}`);
      });
    });
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    setupCommonMocks();
  });

  captureThemeCases('home', '/home', () => {}, () => {
    cy.contains('KBO LEAGUE', { timeout: 20000 }).should('be.visible');
    cy.contains(/예정경기/).should('be.visible');
  });

  captureThemeCases('offseason', '/offseason', () => {
    setupOffseasonMocks();
  }, () => {
    cy.wait('@getOffseasonMovements');
    cy.wait('@getOffseasonMetadata');
    cy.contains(/스토브리그 하이라이트|2025 주요 이적 소식|2026 시즌 개막까지/, { timeout: 20000 }).should('be.visible');
    cy.contains('KBO').should('be.visible');
  });

  captureThemeCases('offseason-list', '/offseason/list', () => {
    setupOffseasonMocks();
  }, () => {
    cy.wait('@getOffseasonMovements');
    cy.contains('이적').should('be.visible');
    cy.contains('이정후').should('be.visible');
  });

  captureThemeCases('cheer', '/cheer', () => {
    setupCheerMocks();
  }, () => {
    cy.wait('@getCheerPosts');
    cy.contains('전체').should('be.visible');
    cy.contains('직관 메이트 모임 같이 가요').should('be.visible');
  });

  captureThemeCases('notice', '/notice', () => {
    setupCheerMocks();
  }, () => {
    cy.wait('@getCheerPosts');
    cy.contains('공지사항').should('be.visible');
    cy.contains('점검 안내 공지').should('be.visible');
  });

  captureThemeCases('terms', '/terms', () => {}, () => {
    cy.contains('이용약관').should('be.visible');
  });

  captureThemeCases('privacy', '/privacy', () => {}, () => {
    cy.contains('개인정보처리방침').should('be.visible');
  });

  captureThemeCases('leaderboard', '/leaderboard', () => {
    setupLeaderboardMocks();
  }, () => {
    cy.wait('@getLeaderboard');
    cy.contains('야구경기 예측 결과').should('be.visible');
    cy.contains('적중률').should('be.visible');
  });

  captureThemeCases('stadium', '/stadium', () => {
    setupStadiumMocks();
  }, () => {
    cy.wait('@getStadiums');
    cy.contains('구장 가이드', { timeout: 20000 }).should('be.visible');
    cy.contains('잠실야구장', { timeout: 20000 }).should('be.visible');
  });

  captureThemeCases('prediction', '/prediction', () => {
    setupPredictionMocks();
    cy.clock(new Date('2026-03-22T12:00:00.000Z').getTime(), ['Date']);
  }, () => {
    cy.wait('@getMatchDay');
    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.get('@getUserVotes.all').its('length').should('be.gte', 1);
    cy.get('@getUserVotePredictionTheme.all').should('have.length', 0);
  });
});
