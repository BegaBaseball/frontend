/// <reference types="cypress" />

import {
  installPredictionAuthenticatedSessionIntercept,
  installPredictionBootstrapIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

type PredictionMobileSmokeState =
  | 'match'
  | 'vote-panel'
  | 'date-sheet'
  | 'detail-loading'
  | 'detail-error'
  | 'top-notice'
  | 'ranking'
  | 'ranking-ended'
  | 'ranking-init-error'
  | 'ranking-save-dialog'
  | 'ranking-saved';

type PredictionMobileSmokeWindow = Window & {
  __BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__?: boolean;
};

const defaultStates: PredictionMobileSmokeState[] = [
  'match',
  'vote-panel',
  'date-sheet',
  'detail-loading',
  'detail-error',
  'top-notice',
];

const targetDate = '2026-02-04';
const votePanelDate = '2099-05-01';
const gameIdsByState: Record<PredictionMobileSmokeState, string> = {
  match: '20260204LGKT0',
  'vote-panel': '20990501LGKT0',
  'date-sheet': '20260204LGKT9',
  'detail-loading': '20260204LGKT1',
  'detail-error': '20260204LGKT2',
  'top-notice': '20260204LGKT3',
  ranking: '20260204LGKT4',
  'ranking-ended': '20260204LGKT5',
  'ranking-init-error': '20260204LGKT6',
  'ranking-save-dialog': '20260204LGKT7',
  'ranking-saved': '20260204LGKT8',
};
const targetGameId = gameIdsByState.match;
const dateForState = (state: PredictionMobileSmokeState) => (
  state === 'vote-panel' ? votePanelDate : targetDate
);
const rankingTeamIds = [
  'samsung',
  'lg',
  'doosan',
  'kt',
  'ssg',
  'kiwoom',
  'hanwha',
  'nc',
  'lotte',
  'kia',
];

const game = {
  gameId: targetGameId,
  gameDate: targetDate,
  homeTeam: 'LG',
  awayTeam: 'KT',
  stadium: '잠실',
  startTime: '18:30',
  homeScore: 2,
  awayScore: 1,
  winner: 'LG',
  gameStatus: 'FINAL',
  gameStatusKr: '경기 종료',
  leagueType: 'REGULAR',
};

const gameDetail = {
  gameId: targetGameId,
  gameDate: targetDate,
  homeTeam: 'LG',
  awayTeam: 'KT',
  homeScore: 2,
  awayScore: 1,
  homePitcher: '임찬규',
  awayPitcher: '고영표',
  gameStatus: 'FINAL',
  stadium: '잠실',
  stadiumName: '잠실야구장',
  attendance: 23000,
  weather: '맑음',
  gameTimeMinutes: 185,
  inningScores: [
    { inning: 1, teamSide: 'away', teamCode: 'KT', runs: 1 },
    { inning: 1, teamSide: 'home', teamCode: 'LG', runs: 0 },
    { inning: 2, teamSide: 'away', teamCode: 'KT', runs: 0 },
    { inning: 2, teamSide: 'home', teamCode: 'LG', runs: 2 },
  ],
  summary: [
    {
      gameId: targetGameId,
      type: '결승타',
      playerName: '홍창기',
      detail: '2회말 2타점 적시타',
    },
  ],
};

const voteStatus = {
  homeVotes: 8,
  awayVotes: 4,
  totalVotes: 12,
};

const pathForState = (state: PredictionMobileSmokeState) => {
  if (state === 'date-sheet') {
    return `/prediction?date=${targetDate}`;
  }

  const stateDate = dateForState(state);
  const params = new URLSearchParams({
    gameId: gameIdsByState[state],
    date: stateDate,
  });
  return `/prediction?${params.toString()}`;
};

const expectNoHorizontalOverflow = () => {
  cy.window().then((win) => {
    const width = win.innerWidth;
    const scrollWidth = win.document.documentElement.scrollWidth;
    expect(scrollWidth, 'document horizontal overflow').to.be.lte(width + 1);
  });
};

const expectElementInsideViewport = (subject: Cypress.Chainable<JQuery<HTMLElement>>) => {
  subject.should('be.visible').then(($element) => {
    const rect = $element[0].getBoundingClientRect();
    cy.window().then((win) => {
      expect(rect.left, 'left edge').to.be.gte(0);
      expect(rect.right, 'right edge').to.be.lte(win.innerWidth + 1);
      expect(rect.top, 'top edge').to.be.gte(0);
      expect(rect.bottom, 'bottom edge').to.be.lte(win.innerHeight + 1);
    });
  });
};

const captureState = (state: PredictionMobileSmokeState) => {
  cy.screenshot(`prediction-mobile-smoke/${state}-mobile-390`, {
    capture: 'viewport',
    overwrite: true,
  });
};

const isRankingSmokeState = (state: PredictionMobileSmokeState) => (
  state === 'ranking'
  || state === 'ranking-ended'
  || state === 'ranking-init-error'
  || state === 'ranking-save-dialog'
  || state === 'ranking-saved'
);

const parseActiveStates = (value: unknown): PredictionMobileSmokeState[] => {
  const states = String(value || defaultStates.join(','))
    .split(',')
    .map((state) => state.trim())
    .filter(Boolean) as PredictionMobileSmokeState[];

  return states.length > 0 ? states : defaultStates;
};

const resolveActiveStateValue = (envValue: unknown) => {
  if (typeof envValue === 'string') {
    return envValue;
  }

  if (Array.isArray(envValue)) {
    return envValue.find((value) => typeof value === 'string');
  }

  if (envValue && typeof envValue === 'object') {
    const activeStateValue = (envValue as { PREDICTION_MOBILE_ACTIVE_STATES?: unknown })
      .PREDICTION_MOBILE_ACTIVE_STATES;
    return typeof activeStateValue === 'string' ? activeStateValue : undefined;
  }

  return undefined;
};

const runWhenStateActive = (
  state: PredictionMobileSmokeState,
  body: () => void
) => {
  cy.env<unknown>(['PREDICTION_MOBILE_ACTIVE_STATES']).then((activeStateEnv) => {
    const activeStates = parseActiveStates(resolveActiveStateValue(activeStateEnv));
    if (!activeStates.includes(state)) {
      cy.log(`Skipping inactive prediction mobile smoke state: ${state}`);
      return;
    }

    body();
  });
};

const setupPredictionSmoke = (state: PredictionMobileSmokeState) => {
  const stateGameId = gameIdsByState[state];
  const stateDate = dateForState(state);
  const isVotePanelState = state === 'vote-panel';
  const stateGame = {
    ...game,
    gameId: stateGameId,
    gameDate: stateDate,
    ...(isVotePanelState
      ? {
          gameStatus: 'SCHEDULED',
          gameStatusKr: '경기 예정',
          homeScore: null,
          awayScore: null,
          winner: null,
          startTime: '18:30',
        }
      : {}),
  };
  const stateGameDetail = {
    ...gameDetail,
    gameId: stateGameId,
    gameDate: stateDate,
    summary: gameDetail.summary.map((item) => ({
      ...item,
      gameId: stateGameId,
    })),
    ...(isVotePanelState
      ? {
          gameStatus: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          gameTimeMinutes: null,
          inningScores: [],
          summary: [],
          startTime: '18:30',
        }
      : {}),
  };

  cy.viewport(390, 844);
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.mockAPI({ skipRankings: true });
  cy.failOnUnexpectedApi401();
  installPredictionAuthenticatedSessionIntercept();

  cy.intercept('GET', '**/api/matches/day*', {
    statusCode: 200,
    body: {
      date: stateDate,
      games: [stateGame],
      prevDate: null,
      nextDate: null,
      hasPrev: false,
      hasNext: false,
    },
  }).as('getPredictionMatchesDay');

  cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
    statusCode: 200,
    body: {
      rankingSeasonYear: 2026,
      rankingSourceMessage: '2026 모바일 스모크용 순위 데이터',
      isOffSeason: false,
      rankings: [
        { teamId: 'LG', teamName: 'LG 트윈스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.593', games: 135, gamesBehind: 0 },
        { teamId: 'KT', teamName: 'KT 위즈', rank: 2, wins: 78, losses: 57, draws: 0, winRate: '0.578', games: 135, gamesBehind: 2 },
      ],
    },
  }).as('getPredictionRankings');

  if (isRankingSmokeState(state)) {
    if (state === 'ranking-ended') {
      cy.intercept('GET', '**/api/predictions/ranking/init*', {
        statusCode: 409,
        body: {
          code: 'RANKING_PREDICTION_CLOSED',
          message: '현재는 순위 예측 기간이 아닙니다.',
        },
      }).as('getPredictionRankingInit');
    } else if (state === 'ranking-init-error') {
      cy.intercept('GET', '**/api/predictions/ranking/init*', {
        statusCode: 500,
        body: {
          message: '순위 예측 초기화에 실패했습니다.',
        },
      }).as('getPredictionRankingInit');
    } else {
      cy.intercept('GET', '**/api/predictions/ranking/init*', {
        statusCode: 200,
        body: {
          seasonYear: 2026,
          saved: state === 'ranking-saved'
            ? {
                id: 2026020401,
                shareId: 'prediction-mobile-smoke-share',
                seasonYear: 2026,
                teamIdsInOrder: rankingTeamIds,
                createdAt: '2026-02-04T12:00:00',
              }
            : null,
        },
      }).as('getPredictionRankingInit');
    }

    cy.intercept('POST', '**/api/predictions/ranking', {
      statusCode: 200,
      body: {
        id: 2026020402,
        shareId: 'prediction-mobile-smoke-saved',
        seasonYear: 2026,
        teamIdsInOrder: rankingTeamIds,
        createdAt: '2026-02-04T12:05:00',
      },
    }).as('savePredictionRanking');

    cy.intercept('GET', '**/api/prediction/stats/me*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          accuracy: 62.5,
          totalPredictions: 16,
          correctPredictions: 10,
          streak: 3,
        },
      },
    }).as('getPredictionStatsMe');
  }

  cy.intercept('**/api/predictions/my-votes*', {
    statusCode: 200,
    body: { votes: { [stateGameId]: isVotePanelState ? 'home' : null } },
  }).as('getPredictionUserVotes');

  cy.intercept('**/api/predictions/status/*', {
    statusCode: 200,
    body: voteStatus,
  }).as('getPredictionVoteStatus');

  const shouldBootstrapDetail = state === 'match' || state === 'top-notice' || isVotePanelState;
  installPredictionBootstrapIntercept({
    games: [stateGame],
    detailByGameId: shouldBootstrapDetail ? { [stateGameId]: stateGameDetail } : {},
    voteStatusByGameId: state === 'top-notice'
      ? {
          [stateGameId]: {
            ok: false,
            data: null,
            error: {
              message: '투표 집계 조회에 실패했습니다.',
              status: 500,
              code: 'PREDICTION_MOBILE_SMOKE_TOP_NOTICE',
            },
          },
        }
      : { [stateGameId]: voteStatus },
    selectedGameId: (url) => url.searchParams.get('gameId') || stateGameId,
    selectedGameFound: (selectedGameId) => selectedGameId === stateGameId,
  });

  if (state === 'detail-error') {
    cy.intercept('GET', `**/api/matches/${stateGameId}*`, {
      statusCode: 500,
      body: { message: '경기 상세를 불러오지 못했습니다.' },
    }).as('getPredictionGameDetail');
    return;
  }

  cy.intercept('GET', `**/api/matches/${stateGameId}*`, {
    statusCode: 200,
    delay: state === 'detail-loading' ? 30000 : 0,
    body: stateGameDetail,
  }).as('getPredictionGameDetail');
};

const visitSmokeState = (state: PredictionMobileSmokeState) => {
  setupPredictionSmoke(state);
  visitPredictionPage({
    path: pathForState(state),
    token: 'prediction-mobile-smoke-token',
    authenticated: true,
    resetStorage: true,
    onBeforeLoad: state === 'ranking-save-dialog'
      ? (win) => {
          (win as PredictionMobileSmokeWindow).__BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__ = true;
        }
      : undefined,
  });
  cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
};

const openRankingSmokeState = (state: PredictionMobileSmokeState) => {
  visitSmokeState(state);
  cy.contains('button', '순위예측', { timeout: 20000 }).click({ force: true });
  cy.wait('@getPredictionRankingInit', { timeout: 30000 });
  cy.get('[data-testid="ranking-root"]', { timeout: 30000 })
    .scrollIntoView()
    .should('be.visible');
};

describe('Prediction mobile smoke', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', (error) => {
      if (error.message.includes('ResizeObserver loop')) {
        return false;
      }
      return true;
    });
  });

  it('renders the mobile match detail without overflow', () => {
    runWhenStateActive('match', () => {
      visitSmokeState('match');

      cy.get('[data-testid="prediction-scoreboard"]', { timeout: 40000 })
        .scrollIntoView()
        .should('be.visible');
      cy.contains(/LG(\s*트윈스)?/, { timeout: 20000 }).should('be.visible');
      cy.contains(/KT(\s*위즈)?/, { timeout: 20000 }).should('be.visible');
      cy.contains('경기 정보를 불러오는 중입니다').should('not.exist');
      expectNoHorizontalOverflow();
      captureState('match');
    });
  });

  it('renders the mobile vote panel selected state without overflow', () => {
    runWhenStateActive('vote-panel', () => {
      visitSmokeState('vote-panel');

      cy.get('[data-testid="prediction-vote-panel"]', { timeout: 40000 })
        .scrollIntoView()
        .should('be.visible')
        .and('have.attr', 'aria-labelledby', 'prediction-vote-panel-title')
        .and('have.attr', 'aria-describedby')
        .and('include', 'prediction-vote-panel-helper');
      cy.get('#prediction-vote-panel-title').should('contain.text', '승리 팀 예측');
      cy.get('[data-testid="prediction-vote-participants"]')
        .should('be.visible')
        .and('contain.text', '참여 12명');
      cy.get('[data-testid="vote-home-btn"]')
        .should('be.visible')
        .and('have.attr', 'aria-pressed', 'true')
        .and('have.attr', 'aria-label')
        .and('include', '선택됨');
      cy.get('[data-testid="prediction-vote-away-btn"]')
        .should('be.visible')
        .and('have.attr', 'aria-pressed', 'false');
      cy.get('[data-testid="prediction-vote-cancel-btn"]')
        .should('be.visible')
        .and('have.attr', 'aria-label')
        .and('include', '예측 취소');
      expectNoHorizontalOverflow();
      cy.screenshot('prediction-mobile-smoke/vote-panel-mobile-390', {
        capture: 'fullPage',
        overwrite: true,
      });
    });
  });

  it('renders the mobile date sheet without overflow', () => {
    runWhenStateActive('date-sheet', () => {
      visitSmokeState('date-sheet');

      cy.get('[data-testid="prediction-schedule-preview"]', { timeout: 30000 })
        .should('be.visible');
      cy.get('[data-testid="prediction-schedule-mobile-date-trigger"]')
        .should('be.visible')
        .and('have.attr', 'aria-haspopup', 'dialog')
        .click();
      cy.get('#prediction-mobile-date-sheet', { timeout: 20000 })
        .should('be.visible')
        .and('have.attr', 'role', 'dialog');
      cy.get('[data-testid="prediction-schedule-mobile-date-button"][aria-pressed="true"]')
        .should('be.focused');
      expectElementInsideViewport(cy.get('#prediction-mobile-date-sheet'));
      expectNoHorizontalOverflow();
      captureState('date-sheet');
      cy.focused().type('{esc}');
      cy.get('#prediction-mobile-date-sheet').should('not.exist');
      cy.get('[data-testid="prediction-schedule-mobile-date-trigger"]').should('be.focused');
    });
  });

  it('shows the detail loading banner while preserving the match card shell', () => {
    runWhenStateActive('detail-loading', () => {
      visitSmokeState('detail-loading');

      cy.get('[data-testid="prediction-detail-refresh-indicator"]', { timeout: 20000 })
        .should('be.visible');
      cy.contains('경기 상세 정보를 불러오는 중입니다.', { timeout: 20000 })
        .should('be.visible');
      expectElementInsideViewport(cy.contains('경기 상세 정보를 불러오는 중입니다.'));
      cy.contains(/LG(\s*트윈스)?/).should('be.visible');
      cy.contains(/KT(\s*위즈)?/).should('be.visible');
      cy.contains('경기 정보를 불러오는 중입니다').should('not.exist');
      expectNoHorizontalOverflow();
      captureState('detail-loading');
    });
  });

  it('keeps the detail error banner and retry action visible on mobile', () => {
    runWhenStateActive('detail-error', () => {
      visitSmokeState('detail-error');

      cy.get('@getPredictionGameDetail.all', { timeout: 20000 }).should('have.length.gte', 1);
      cy.get('[data-testid="prediction-detail-error-banner"]', { timeout: 20000 })
        .should('be.visible');
      cy.contains('일부 경기 상세 정보를 불러오지 못했습니다.').should('be.visible');
      cy.get('[data-testid="prediction-detail-error-retry-btn"]').should('be.visible');
      cy.contains('a', '예측으로 돌아가기').should('be.visible');
      expectNoHorizontalOverflow();
      captureState('detail-error');
    });
  });

  it('renders the top notice in normal flow with clickable recovery link', () => {
    runWhenStateActive('top-notice', () => {
      visitSmokeState('top-notice');

      cy.contains('투표 집계 조회 실패', { timeout: 20000 })
        .should('be.visible')
        .closest('div')
        .should('not.have.css', 'pointer-events', 'none');
      cy.contains('button', '투표 집계 다시 시도')
        .should('be.visible')
        .and('not.be.disabled');
      cy.contains('a', '예측으로 돌아가기')
        .should('be.visible')
        .and('have.attr', 'href')
        .and('include', '/prediction');
      cy.get('[data-testid="prediction-scoreboard"]', { timeout: 20000 })
        .should('be.visible');
      expectNoHorizontalOverflow();
      captureState('top-notice');
    });
  });

  it('renders the ranking tab on mobile without overflow', () => {
    runWhenStateActive('ranking', () => {
      openRankingSmokeState('ranking');

      cy.get('[data-testid="ranking-list"]', { timeout: 20000 }).should('be.visible');
      cy.contains('예상 순위').should('be.visible');
      cy.contains('팀 선택').should('be.visible');
      cy.get('[data-testid="ranking-team-option-samsung"]').should('be.visible');
      expectNoHorizontalOverflow();
      captureState('ranking');
    });
  });

  it('renders the ranking closed state on mobile without overflow', () => {
    runWhenStateActive('ranking-ended', () => {
      openRankingSmokeState('ranking-ended');

      cy.contains('순위 예측 종료', { timeout: 20000 }).should('be.visible');
      cy.contains('순위 예측은 11월 1일부터 5월 31일까지 가능합니다.').should('be.visible');
      expectNoHorizontalOverflow();
      captureState('ranking-ended');
    });
  });

  it('renders the ranking init error state with retry action on mobile', () => {
    runWhenStateActive('ranking-init-error', () => {
      openRankingSmokeState('ranking-init-error');

      cy.get('[data-testid="ranking-error-state"]', { timeout: 20000 })
        .should('be.visible')
        .and('contain.text', '순위 예측을 불러오지 못했습니다');
      cy.contains('button', '다시 시도').should('be.visible').and('not.be.disabled');
      expectNoHorizontalOverflow();
      captureState('ranking-init-error');
    });
  });

  it('renders the ranking save dialog on mobile without overflow', () => {
    runWhenStateActive('ranking-save-dialog', () => {
      openRankingSmokeState('ranking-save-dialog');

      cy.get('[data-testid="ranking-save-dialog"]', { timeout: 20000 })
        .should('be.visible');
      cy.contains('순위 확정').should('be.visible');
      cy.get('[data-testid="ranking-save-dialog-cancel"]').should('be.visible');
      cy.get('[data-testid="ranking-save-dialog-confirm"]').should('be.visible');
      expectNoHorizontalOverflow();
      captureState('ranking-save-dialog');
    });
  });

  it('renders a saved ranking prediction on mobile without overflow', () => {
    runWhenStateActive('ranking-saved', () => {
      openRankingSmokeState('ranking-saved');

      cy.get('[data-testid="ranking-saved-badge"]', { timeout: 20000 })
        .scrollIntoView()
        .should('be.visible')
        .and('contain.text', '저장된 예측입니다');
      cy.get('[data-testid="ranking-share-btn"]').should('be.visible');
      cy.get('[data-testid="ranking-save-btn"]').should('not.exist');
      expectNoHorizontalOverflow();
      captureState('ranking-saved');
    });
  });
});
