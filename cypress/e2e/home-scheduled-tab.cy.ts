/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

type BootstrapLoadState = {
  isFallback: boolean;
  timedOut: boolean;
  timedOutSections: string[];
  failedSections: string[];
};

describe('Home scheduled tab', () => {
  const buildCompleteBootstrapLoadState = (): BootstrapLoadState => ({
    isFallback: false,
    timedOut: false,
    timedOutSections: [],
    failedSections: [],
  });
  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);
  const addDays = (dateKey: string, offset: number) => {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() + offset);
    return formatDateKey(date);
  };
  const buildScheduledWindow = (selectedDate: string) => {
    const scheduledWindow: Array<Record<string, unknown>> = [];

    for (let offset = 0; offset < 8; offset += 1) {
      const dateKey = addDays(selectedDate, offset);
      const dailyGames = scheduleByDate[dateKey] || [];
      scheduledWindow.push(
        ...dailyGames.map((game) => ({
          ...game,
          sourceDate: dateKey,
          gameDate: dateKey,
        })),
      );
    }

    return scheduledWindow;
  };
  const buildBootstrapResponse = (selectedDate: string) => ({
    selectedDate,
    leagueStartDates: {
      regularSeasonStart: '2026-03-22',
      postseasonStart: '2026-10-06',
      koreanSeriesStart: '2026-10-26',
    },
    navigation: {
      hasPrev: true,
      hasNext: true,
      prevGameDate: addDays(selectedDate, -1),
      nextGameDate: addDays(selectedDate, 1),
    },
    games: [],
    scheduledGamesWindow: buildScheduledWindow(selectedDate),
    loadState: buildCompleteBootstrapLoadState(),
  });
  const buildWidgetsResponse = (rankingSeasonYear = 2025) => ({
    hotCheerPosts: [],
    featuredMates: [],
    rankingSnapshot: {
      rankingSeasonYear,
      rankingSourceMessage: `${rankingSeasonYear} 시즌 순위 데이터`,
      isOffSeason: true,
      rankings: [],
    },
  });

  const scheduleByDate: Record<string, Array<Record<string, unknown>>> = {
    '2026-02-10': [],
    '2026-02-11': [
      {
        gameId: '20260211LGHH0',
        time: '18:30',
        stadium: '잠실구장',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
        gameInfo: '',
        leagueType: 'PRE',
        homeTeam: 'HH',
        homeTeamFull: '한화 이글스',
        awayTeam: 'LG',
        awayTeamFull: 'LG 트윈스',
        homeScore: null,
        awayScore: null,
      },
      {
        gameId: '20260211KTNC0',
        time: '19:00',
        stadium: '수원구장',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
        gameInfo: '',
        leagueType: 'OFFSEASON',
        homeTeam: 'KT',
        homeTeamFull: 'KT 위즈',
        awayTeam: 'NC',
        awayTeamFull: 'NC 다이노스',
        homeScore: null,
        awayScore: null,
      },
    ],
    '2026-02-12': [
      {
        gameId: '20260212KTSS0',
        time: '18:30',
        stadium: '수원구장',
        gameStatus: 'POSTPONED',
        gameStatusKr: '경기 연기',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'KT',
        homeTeamFull: 'KT 위즈',
        awayTeam: 'SS',
        awayTeamFull: '삼성 라이온즈',
        homeScore: null,
        awayScore: null,
      },
    ],
    '2026-02-13': [
      {
        gameId: '20260213LTSK0',
        time: '18:30',
        stadium: '사직구장',
        gameStatus: 'CANCELLED',
        gameStatusKr: '경기 취소',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'LT',
        homeTeamFull: '롯데 자이언츠',
        awayTeam: 'SK',
        awayTeamFull: 'SSG 랜더스',
        homeScore: null,
        awayScore: null,
      },
      {
        gameId: '20260213WOKW0',
        time: '18:30',
        stadium: '고척구장',
        gameStatus: 'COMPLETED',
        gameStatusKr: '경기 종료',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'WO',
        homeTeamFull: '키움 히어로즈',
        awayTeam: 'OB',
        awayTeamFull: '두산 베어스',
        homeScore: 2,
        awayScore: 1,
      },
    ],
    '2026-02-14': [
      {
        gameId: '20260214KIASS0',
        time: '18:30',
        stadium: '광주구장',
        gameStatus: null,
        gameStatusKr: '정보 없음',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'KIA',
        homeTeamFull: 'KIA 타이거즈',
        awayTeam: 'SS',
        awayTeamFull: '삼성 라이온즈',
        homeScore: null,
        awayScore: null,
      },
    ],
  };

  beforeEach(() => {
    const now = new Date('2026-02-10T12:00:00').getTime();
    cy.clock(now, ['Date']);

    (cy as any).mockAPI();

    cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '2026-02-10');
      req.reply({
        statusCode: 200,
        body: buildBootstrapResponse(date),
      });
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', (req) => {
      const seasonYearParam = req.query.seasonYear;
      const seasonYear = Array.isArray(seasonYearParam) ? seasonYearParam[0] : seasonYearParam;
      req.reply({
        statusCode: 200,
        body: buildWidgetsResponse(seasonYear ? Number(seasonYear) : 2025),
      });
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/kbo/schedule/navigation?*', {
      statusCode: 200,
      body: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-02-09',
        nextGameDate: '2026-02-11',
      },
    }).as('getHomeNavigation');

    cy.intercept('GET', '**/api/kbo/schedule?*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '');
      req.reply({
        statusCode: 200,
        body: scheduleByDate[date] || [],
      });
    }).as('getHomeScheduleByDate');

    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: [
        {
          gameId: '20260211LGHH0',
          gameDate: '2026-02-11',
          homeTeam: 'HH',
          awayTeam: 'LG',
          stadium: '잠실',
          homeScore: null,
          awayScore: null,
          winner: null,
        },
      ],
    }).as('getPredictionRange');

    cy.intercept('GET', '**/api/matches/bounds*', {
      statusCode: 200,
      body: {
        hasData: true,
        earliestGameDate: '2026-02-01',
        latestGameDate: '2026-10-01',
      },
    }).as('getPredictionBounds');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      const pathname = new URL(req.url).pathname;
      const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);

      if (lastSegment === 'range' || lastSegment === 'bounds') {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          gameId: '20260211LGHH0',
          gameDate: '2026-02-11',
          homeTeam: 'HH',
          awayTeam: 'LG',
          stadium: '잠실',
          homeScore: null,
          awayScore: null,
          gameStatus: 'SCHEDULED',
          startTime: '18:30',
        },
      });
    }).as('getPredictionDetail');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          '20260211LGHH0': null,
        },
      },
    }).as('getPredictionVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVote');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
    }).as('getPredictionVoteStatus');
  });

  it('auto switches to 예정경기 and separates scheduled vs postponed/cancelled games', () => {
    visitHomePage({
      path: '/home',
      token: 'home-scheduled-tab-token',
      resetStorage: true,
    });

    cy.contains('button', '예정경기', { timeout: 15000 })
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');

    cy.contains('곧 열리는 경기').should('be.visible');
    cy.contains('연기/취소').should('be.visible');

    cy.get('[data-testid="home-game-card"][data-game-id="20260211LGHH0"]')
      .should('be.visible')
      .and('contain.text', 'LG');
    cy.get('[data-testid="home-game-card"][data-game-id="20260211KTNC0"]')
      .should('be.visible')
      .and('contain.text', 'NC');
    cy.get('[data-testid="home-game-card"][data-game-id="20260214KIASS0"]')
      .should('be.visible')
      .and('contain.text', 'KIA');

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .should('have.attr', 'aria-expanded', 'false')
      .should('contain.text', '펼치기');

    cy.get('[data-testid="home-game-card"][data-game-id="20260212KTSS0"]').should('not.exist');
    cy.get('[data-testid="home-game-card"][data-game-id="20260213LTSK0"]').should('not.exist');
    cy.contains('연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.').should('be.visible');

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .click({ force: true })
      .should('have.attr', 'aria-expanded', 'true');

    cy.get('[data-testid="home-game-card"][data-game-id="20260212KTSS0"]')
      .should('be.visible')
      .and('contain.text', '경기 연기');
    cy.get('[data-testid="home-game-card"][data-game-id="20260213LTSK0"]')
      .should('be.visible')
      .and('contain.text', '경기 취소');

    cy.contains('기타 상태 경기 1건은 예정경기 탭에서 제외되었습니다.').should('be.visible');
  });

  it('keeps completed regular games visible when the same day has a manual-data warning', () => {
    const selectedDate = '2026-06-26';
    const completedGames = [
      {
        gameId: '20260626HTOB0',
        gameDate: selectedDate,
        sourceDate: selectedDate,
        time: '18:30',
        stadium: '잠실',
        gameStatus: 'COMPLETED',
        gameStatusKr: '경기 종료',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'DB',
        homeTeamFull: '두산 베어스',
        awayTeam: 'KIA',
        awayTeamFull: 'KIA 타이거즈',
        homeScore: 3,
        awayScore: 2,
      },
      {
        gameId: '20260626WONC0',
        gameDate: selectedDate,
        sourceDate: selectedDate,
        time: '18:30',
        stadium: '창원',
        gameStatus: 'COMPLETED',
        gameStatusKr: '경기 종료',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'NC',
        homeTeamFull: 'NC 다이노스',
        awayTeam: 'KH',
        awayTeamFull: '키움 히어로즈',
        homeScore: 11,
        awayScore: 4,
      },
    ];

    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: {
        selectedDate,
        leagueStartDates: {
          regularSeasonStart: '2026-03-28',
          postseasonStart: '2026-10-06',
          koreanSeriesStart: '2026-10-26',
        },
        navigation: {
          hasPrev: true,
          hasNext: true,
          prevGameDate: '2026-06-25',
          nextGameDate: '2026-06-27',
        },
        games: completedGames,
        scheduledGamesWindow: buildScheduledWindow('2026-06-27'),
        loadState: {
          ...buildCompleteBootstrapLoadState(),
          failureReason: 'manual-data-required',
          manualDataRequest: {
            scope: 'home.schedule',
            missingItems: [{
              key: 'final_score',
              label: '최종 점수',
              reason: '일부 과거 경기의 최종 점수가 비어 있습니다.',
              expected_format: 'home_score, away_score',
            }],
            operatorMessage: '다음 야구 데이터가 필요합니다.',
            blocking: true,
          },
        },
      },
    }).as('getHomeBootstrapCompleted');

    visitHomePage({
      path: '/home?date=2026-06-26&tab=regular',
      token: 'home-regular-completed-token',
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrapCompleted');
    cy.contains('button', '정규시즌', { timeout: 15000 })
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');
    cy.contains('button', '예정경기')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'false');

    cy.get('[data-testid="home-game-card"][data-game-id="20260626HTOB0"]')
      .should('be.visible')
      .and('contain.text', '경기 종료')
      .and('contain.text', 'KIA')
      .and('contain.text', '두산');
    cy.get('[data-testid="home-game-card"][data-game-id="20260626WONC0"]')
      .should('be.visible')
      .and('contain.text', '경기 종료')
      .and('contain.text', '키움')
      .and('contain.text', 'NC');
    cy.get('[data-testid="home-game-card"]').should('have.length', 2);
    cy.contains('경기가 없는 날입니다.').should('not.exist');
  });

  it('resets secondary section to collapsed after date change', () => {
    visitHomePage({
      path: '/home',
      token: 'home-scheduled-tab-token',
      resetStorage: true,
    });

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .should('have.attr', 'aria-expanded', 'false')
      .click({ force: true })
      .should('have.attr', 'aria-expanded', 'true');

    cy.get('[data-testid="home-date-next"]').click({ force: true });

    cy.get('[data-testid="home-scheduled-secondary-toggle"]', { timeout: 15000 })
      .should('have.attr', 'aria-expanded', 'false')
      .should('contain.text', '펼치기');

    cy.contains('연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.').should('be.visible');
  });

  it('shows bootstrap fallback error when scheduled window cannot load', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 500,
      body: { message: 'bootstrap-fallback-required' },
    }).as('getHomeBootstrapFail');

    visitHomePage({
      path: '/home',
      token: 'home-scheduled-tab-token',
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrapFail');
    cy.contains('button', '예정경기', { timeout: 15000 }).click();
    cy.contains('경기 일정을 불러오지 못했습니다').should('be.visible');
    cy.contains('곧 열리는 경기').should('not.exist');
    cy.get('[data-testid="home-game-card"][data-game-id="20260211LGHH0"]').should('not.exist');
  });

  it('navigates to prediction using scheduled card CTA', () => {
    visitHomePage({
      path: '/home',
      token: 'home-scheduled-tab-token',
      resetStorage: true,
    });

    cy.get('[data-slot="alert-dialog-overlay"]').should('not.exist');

    cy.get('[data-testid="home-game-card"][data-game-id="20260211LGHH0"]')
      .find('[role="button"]')
      .as('scheduledPredictionCard')
      .should('be.visible')
      .should('have.attr', 'role', 'button');
    cy.get('@scheduledPredictionCard')
      .invoke('attr', 'aria-label')
      .should('include', '승부예측');
    cy.get('@scheduledPredictionCard')
      .find('span')
      .filter(':visible')
      .contains(/^승부예측$/)
      .should('be.visible');
    cy.get('@scheduledPredictionCard').click();

    cy.location('pathname').should('eq', '/prediction/matches/20260211LGHH0');
    cy.get('[data-slot="alert-dialog-overlay"]').should('not.exist');
    cy.get('@getUserVote.all').should('have.length', 0);

    cy.contains('전력분석실', { timeout: 15000 }).should('exist');
  });
});
