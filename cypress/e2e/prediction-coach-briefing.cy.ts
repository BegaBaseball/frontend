/// <reference types="cypress" />

import {
  buildDefaultPredictionPath,
  ensureCoachBriefingVisible,
  installPredictionAuthenticatedSessionIntercept,
  installPredictionGuestSessionIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction Coach Briefing Regression', () => {
  type ScheduleGameMock = {
    gameId: string;
    gameDate: string;
    homeTeam: string;
    awayTeam: string;
    stadium: string;
    homeScore: number | null;
    awayScore: number | null;
    winner: string | null;
    gameStatus?: string;
    gameStatusKr?: string;
    leagueType?: string;
  };

  type GameDetailMock = {
    gameId: string;
    gameDate: string;
    leagueType: string;
    homeTeam: string;
    awayTeam: string;
    stadium: string;
    startTime: string;
    homeScore: number | null;
    awayScore: number | null;
    winner: string | null;
    gameStatus: string;
    gameStatusKr: string;
  };

  const fixedNow = new Date('2026-02-03T12:00:00').getTime();

  const defaultRankings = [
    { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
    { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 },
    { teamId: 'LG', teamName: 'LG 트윈스', rank: 3, wins: 75, losses: 60, draws: 0, winRate: '0.556', games: 135, gamesBehind: 2.0 },
    { teamId: 'KT', teamName: 'KT 위즈', rank: 4, wins: 70, losses: 65, draws: 0, winRate: '0.518', games: 135, gamesBehind: 3.0 },
  ];

  const defaultRangeSchedulePayload: ScheduleGameMock[] = [
    {
      gameId: '20260601HHSS0',
      gameDate: '2026-06-01',
      homeTeam: 'HH',
      awayTeam: 'SS',
      stadium: '대전',
      homeScore: null,
      awayScore: null,
      winner: null,
      leagueType: 'POST',
    },
  ];
  const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
  const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v2';

  let rangeSchedulePayload: ScheduleGameMock[] = [...defaultRangeSchedulePayload];
  let gameDetailById: Record<string, GameDetailMock> = {};

  const setScheduleData = (payload: ScheduleGameMock[]) => {
    rangeSchedulePayload = payload;
    gameDetailById = payload.reduce((acc, game) => {
      acc[game.gameId] = {
        gameId: game.gameId,
        gameDate: game.gameDate,
        leagueType: game.leagueType || 'POST',
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        stadium: game.stadium,
        startTime: '18:30',
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        winner: game.winner,
        gameStatus: game.gameStatus || (game.winner || game.homeScore !== null || game.awayScore !== null ? 'COMPLETED' : 'SCHEDULED'),
        gameStatusKr: game.gameStatusKr || (game.winner || game.homeScore !== null || game.awayScore !== null ? '경기 종료' : '경기 예정'),
      };
      return acc;
    }, {} as Record<string, GameDetailMock>);
  };

  const buildSseResponse = ({
    delta,
    meta,
  }: {
    delta?: string;
    meta: Record<string, unknown>;
  }) => {
    const lines: string[] = [];
    if (delta) {
      lines.push('event: message');
      lines.push(`data: ${JSON.stringify({ delta })}`);
      lines.push('');
    }

    lines.push('event: meta');
    lines.push(`data: ${JSON.stringify(meta)}`);
    lines.push('');
    lines.push('event: done');
    lines.push('data: [DONE]');
    lines.push('');

    return lines.join('\n');
  };

  const openPredictionPage = ({
    authenticated = true,
    reducedMotion = false,
    path = '/prediction',
    waitForGameDetail = true,
    waitForRankings = true,
    skipCoachBriefingProbe = false,
    useRealClock = false,
    waitForVoteBootstrap = true,
  }: {
    authenticated?: boolean;
    reducedMotion?: boolean;
    path?: string;
    waitForGameDetail?: boolean;
    waitForRankings?: boolean;
    skipCoachBriefingProbe?: boolean;
    useRealClock?: boolean;
    waitForVoteBootstrap?: boolean;
    } = {}) => {
    const resolvedPath = path === '/prediction'
      ? buildDefaultPredictionPath(rangeSchedulePayload)
      : path;
    visitPredictionPage({
      path: resolvedPath,
      token: 'coach-briefing-test-token',
      authenticated,
      persistedAuthHint: authenticated,
      onBeforeLoad: (win: Window) => {
        if (!reducedMotion) {
          return;
        }

        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: (query: string) =>
            ({
              matches: query === '(prefers-reduced-motion: reduce)',
              media: query,
              onchange: null,
              addListener: () => undefined,
              removeListener: () => undefined,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
              dispatchEvent: () => false,
            }) as MediaQueryList,
        });
      },
    });
    const advanceTime = (ms: number) => {
      if (useRealClock) {
        cy.wait(ms);
        return;
      }
      cy.tick(ms);
    };

    // Advance clock to let React initialization and hydration proceed
    advanceTime(100);
    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getScheduleRange');
    advanceTime(100);
    if (waitForGameDetail) {
      cy.wait('@getGameDetail');
      advanceTime(100);
    }
    if (waitForRankings) {
      cy.wait('@getRankingsCoach');
      advanceTime(100);
    }
    // Wait for other initial requests to settle to avoid re-render noise
    if (waitForVoteBootstrap) {
      cy.wait(['@getVoteStatus', '@getUserVotes']);
      cy.get('@getUserVote.all').should('have.length', 0);
    }
    if (!skipCoachBriefingProbe) {
      ensureCoachBriefingVisible();
      advanceTime(500);
    }
  };

  const extractCoachGameId = (body: unknown): string | undefined => {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const payload = body as { game_id?: unknown; gameId?: unknown };
    if (typeof payload.game_id === 'string' && payload.game_id.length > 0) {
      return payload.game_id;
    }

    if (typeof payload.gameId === 'string' && payload.gameId.length > 0) {
      return payload.gameId;
    }

    return undefined;
  };





  beforeEach(() => {
    cy.clock(fixedNow).as('appClock');
    cy.visit('about:blank');
    cy.window().then((win) => {
      win.sessionStorage.clear();
      win.sessionStorage.removeItem('prediction:run-session:v1');
      win.sessionStorage.removeItem('prediction:run-session');
      win.sessionStorage.removeItem(COACH_BRIEFING_SESSION_STORAGE_KEY);
      win.localStorage.removeItem('kbo-theme');
      win.localStorage.removeItem('prediction:run-session');
      win.localStorage.removeItem('prediction:run-session:v1');
      win.localStorage.removeItem(COACH_BRIEFING_LOCAL_STORAGE_KEY);
    });
    (cy as any).mockAPI({ skipRankings: true });
    installPredictionAuthenticatedSessionIntercept('getPredictionSessionCoach');

    setScheduleData([...defaultRangeSchedulePayload]);

    cy.intercept('GET', '**/api/matches/bounds*', {
      statusCode: 200,
      body: {
        hasData: true,
        earliestGameDate: defaultRangeSchedulePayload[0]?.gameDate || '2026-06-01',
        latestGameDate: '2026-10-31',
      },
    }).as('getMatchBoundsCoach');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          '20260601HHSS0': null,
          '20260601LGKT0': null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVote');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 10, awayVotes: 5, totalVotes: 15 },
    }).as('getVoteStatus');

    cy.intercept('GET', '**/api/matches/day*', (req) => {
      const fallbackDate = rangeSchedulePayload[0]?.gameDate || '2026-06-01';
      const requestUrl = new URL(req.url);
      const requestedDate = requestUrl.searchParams.get('date') || fallbackDate;
      const dates = Array.from(new Set(rangeSchedulePayload.map((game) => game.gameDate))).sort();
      const activeDate = dates.includes(requestedDate) ? requestedDate : fallbackDate;
      const activeIndex = dates.indexOf(activeDate);
      const games = rangeSchedulePayload.filter((game) => game.gameDate === activeDate);

      req.reply({
        statusCode: 200,
        body: {
          date: activeDate,
          games,
          prevDate: activeIndex > 0 ? dates[activeIndex - 1] : null,
          nextDate: activeIndex >= 0 && activeIndex < dates.length - 1 ? dates[activeIndex + 1] : null,
          hasPrev: activeIndex > 0,
          hasNext: activeIndex >= 0 && activeIndex < dates.length - 1,
        },
      });
    }).as('getScheduleRange');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      if (
        req.url.includes('/api/matches/range')
        || req.url.includes('/api/matches/day')
        || req.url.includes('/api/matches/bounds')
      ) {
        return;
      }

      const match = req.url.match(/\/api\/matches\/([^/?]+)/);
      const gameId = match?.[1] ?? rangeSchedulePayload[0]?.gameId;
      const detail = gameId ? gameDetailById[gameId] : undefined;
      const fallbackDetail = gameDetailById[rangeSchedulePayload[0].gameId];

      req.reply({
        statusCode: 200,
        body: detail || fallbackDetail,
      });
    }).as('getGameDetail');

    cy.intercept('GET', '**/api/matches?*', {
      statusCode: 200,
      body: [],
    }).as('getSchedule');

    cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
      statusCode: 200,
      body: defaultRankings,
    }).as('getRankingsCoach');
  });

  it('retries in-progress coach brief at least once and eventually stops', () => {
    cy.intercept('POST', '**/coach/analyze*', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          delta: JSON.stringify({
            headline: '재시도 테스트',
            coach_note: '재시도 중에도 유지되는 임시 분석 메모입니다.',
          }),
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v3',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'IN_PROGRESS',
            in_progress: true,
          },
        }),
      });
    }).as('coachAnalyzeRetry');

    openPredictionPage({ path: '/prediction?gameId=20260601HHSS0&date=2026-06-01' });

    cy.tick(2000);
    cy.wait('@coachAnalyzeRetry');
    cy.tick(100);
    cy.tick(2000);
    cy.get('@coachAnalyzeRetry.all').its('length').should('eq', 1);
    cy.tick(8000);
    cy.get('@coachAnalyzeRetry.all', { timeout: 10000 }).should((interceptions: any) => {
      expect((interceptions as any[]).length).to.be.gte(2);
    });

    cy.tick(30000);
    cy.get('@coachAnalyzeRetry.all').its('length').should((length) => {
      expect(Number(length)).to.be.gte(2);
      expect(Number(length)).to.be.lte(4);
    });
  });


  it('continues retry chain when structuredData is returned with in_progress=true', () => {
    let initialStructuredCalls = 0;

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v3',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'IN_PROGRESS',
            in_progress: true,
            structured_response: {
              headline: '구조화 응답',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: ['구조화 응답에서도 재시도되어야 하는 메시지입니다.'],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '',
              coach_note: '구조화 응답에서도 재시도되어야 하는 메시지입니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeStructured');
    openPredictionPage();

    cy.tick(2000);
    cy.wait('@coachAnalyzeStructured');
    cy.tick(100);
    cy.get('@coachAnalyzeStructured.all').its('length').then((length) => {
      initialStructuredCalls = Number(length);
      expect(initialStructuredCalls).to.be.gte(1);
    });

    cy.tick(2000);
    cy.get('@coachAnalyzeStructured.all').its('length').should((length) => {
      expect(Number(length)).to.equal(initialStructuredCalls);
    });
    cy.tick(4500);
    cy.get('@coachAnalyzeStructured.all').its('length').should((length) => {
      expect(Number(length)).to.be.gte(initialStructuredCalls + 1);
    });
  });


  it('shows FAILED_LOCKED empty-response message instead of silent fallback', () => {
    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        meta: {
          validation_status: 'success',
          resolved_focus: ['recent_form'],
          focus_signature: 'recent_form',
          question_signature: 'auto',
          cache_key_version: 'v3',
          request_mode: 'auto_brief',
          cached: false,
          cache_state: 'FAILED_LOCKED',
          in_progress: false,
        },
      }),
    }).as('coachAnalyzeFailedLocked');
    openPredictionPage();

    cy.tick(2000);
    cy.wait('@coachAnalyzeFailedLocked');
    cy.get('@coachAnalyzeFailedLocked.all').its('length').should('be.gte', 1);
  });


  it('issues a fresh coach request after navigating to another scheduled game date', () => {
    let beforeSwitchCount = 0;

    setScheduleData([
      {
        gameId: '20260601HHSS0',
        gameDate: '2026-06-01',
        homeTeam: 'HH',
        awayTeam: 'SS',
        stadium: '대전',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'POST',
      },
      {
        gameId: '20260601LGKT0',
        gameDate: '2026-06-02',
        homeTeam: 'KT',
        awayTeam: 'LG',
        stadium: '잠실',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'POST',
      },
    ]);

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          delta: JSON.stringify({
            headline: '요청키 전환 테스트',
            coach_note: '요청키가 바뀌면 재시도 카운트가 초기화되어야 합니다.',
          }),
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v3',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'IN_PROGRESS',
            in_progress: true,
          },
        }),
      });
    }).as('coachAnalyzeReset');
    openPredictionPage();

    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.tick(4000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').its('length').then((length) => {
      beforeSwitchCount = Number(length);
      expect(beforeSwitchCount).to.be.gte(2);
    });

    cy.get('button[aria-label="다음 날짜 보기"]')
      .filter(':visible')
      .first()
      .should('be.enabled')
      .click({ force: true });
    cy.wait('@getScheduleRange');
    cy.wait('@getGameDetail');

    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').should((interceptions: any) => {
      const interceptionList = interceptions as any[];
      const switchedGameRequests = interceptionList.filter((interception) => (
        extractCoachGameId(interception?.request?.body) === '20260601LGKT0'
      ));
      expect(interceptionList.length).to.be.greaterThan(beforeSwitchCount);
      expect(switchedGameRequests.length).to.be.gte(1);
    });

    cy.tick(4000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').should((interceptions: any) => {
      const interceptionList = interceptions as any[];
      const switchedGameRequests = interceptionList.filter((interception) => (
        extractCoachGameId(interception?.request?.body) === '20260601LGKT0'
      ));
      const lastSwitchedRequest = switchedGameRequests[switchedGameRequests.length - 1]?.request?.body;
      expect(switchedGameRequests.length).to.be.gte(2);
      expect(extractCoachGameId(lastSwitchedRequest)).to.eq('20260601LGKT0');
    });
  });

  it('does not restart auto brief when delayed game detail only adds transient scheduled state', () => {
    let coachAnalyzeHydrationCount = 0;

    setScheduleData([
      {
        gameId: '20260601LGKT0',
        gameDate: '2026-06-01',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'REGULAR',
      },
    ]);

    cy.intercept('GET', '**/api/matches/20260601LGKT0*', {
      delay: 600,
      statusCode: 200,
      body: {
        gameId: '20260601LGKT0',
        gameDate: '2026-06-01',
        leagueType: 'REGULAR',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        startTime: '18:30',
        homeScore: null,
        awayScore: null,
        winner: null,
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
      },
    }).as('getGameDetailHydration');

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      coachAnalyzeHydrationCount += 1;
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          delta: JSON.stringify({
            headline: '지연 상세 응답 안정화',
            coach_note: '지연된 상세 데이터가 도착해도 기존 자동 브리핑이 유지되어야 합니다.',
          }),
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            cached: true,
            cache_state: 'HIT',
            in_progress: false,
            data_quality: 'grounded',
            structured_response: {
              headline: '지연 상세 응답 안정화',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '',
              coach_note: '지연된 상세 데이터가 도착해도 기존 자동 브리핑이 유지되어야 합니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeHydrationStable');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      path: '/prediction?gameId=20260601LGKT0&date=2026-06-01',
      waitForGameDetail: false,
      skipCoachBriefingProbe: true,
      useRealClock: true,
    });

    cy.get('[data-testid="coach-briefing-card"]', { timeout: 20000 })
      .scrollIntoView()
      .should('be.visible');
    cy.wait('@coachAnalyzeHydrationStable');
    cy.get('[data-testid="coach-briefing-title"]', { timeout: 12000 })
      .should('contain', '지연 상세 응답 안정화');
    cy.get('[data-testid="coach-briefing-message"]')
      .should('contain', '지연된 상세 데이터가 도착해도 기존 자동 브리핑이 유지되어야 합니다.');
    cy.wait('@getGameDetailHydration');
    cy.wrap(null).should(() => {
      expect(coachAnalyzeHydrationCount).to.eq(1);
    });
    cy.get('@coachAnalyzeHydrationStable.all').should('have.length', 1);
    cy.contains('AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.').should('not.exist');
  });


  it('renders full message immediately when prefers-reduced-motion is enabled', () => {
    const reducedMotionMessage = '축소 모션 환경에서는 타이프라이터 없이 즉시 전체 문구가 노출됩니다.';

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        delta: JSON.stringify({
          headline: '접근성 테스트',
          coach_note: reducedMotionMessage,
        }),
        meta: {
          validation_status: 'success',
          structured_response: {
            headline: '접근성 테스트',
            sentiment: 'neutral',
            key_metrics: [],
            analysis: {
              strengths: [],
              weaknesses: [],
              risks: [],
            },
            detailed_markdown: '',
            coach_note: reducedMotionMessage,
          },
          resolved_focus: ['recent_form'],
          focus_signature: 'recent_form',
          question_signature: 'auto',
          cache_key_version: 'v3',
          request_mode: 'auto_brief',
          cached: false,
          cache_state: 'HIT',
          in_progress: false,
        },
      }),
    }).as('coachAnalyzeReducedMotion');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeReducedMotion');
    cy.get('[data-testid="coach-briefing-message"]').should('contain', reducedMotionMessage);
  });

  it('does not request coach analyze for guests and shows a login CTA', () => {
    installPredictionGuestSessionIntercept('getPredictionGuestSessionCoach');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      authenticated: false,
      reducedMotion: true,
      useRealClock: true,
      waitForVoteBootstrap: false,
    });

    cy.get('@coachAnalyzeDefault.all').should('have.length', 0);
    cy.get('[data-testid="coach-briefing-message"]')
      .should('contain', '실데이터 브리핑은 로그인 후 제공됩니다.');
    cy.get('[data-testid="coach-briefing-login-cta"]')
      .should('contain', '로그인하고 브리핑 보기');
  });

  it('shows a re-login CTA instead of generic fallback when coach analyze returns AUTH_EXPIRED', () => {
    cy.intercept('POST', '**/auth/reissue*', {
      statusCode: 401,
      body: { success: false, code: 'UNAUTHORIZED' },
    }).as('coachReissueExpired');

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 401,
      body: { success: false, code: 'UNAUTHORIZED' },
    }).as('coachAnalyzeAuthExpired');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeAuthExpired');
    cy.wait('@coachReissueExpired');

    cy.get('[data-testid="coach-briefing-message"]')
      .should('contain', '로그인 세션이 만료되었습니다. 다시 로그인 후 브리핑을 확인해주세요.');
    cy.contains('AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.').should('not.exist');
    cy.get('[data-testid="coach-briefing-login-cta"]')
      .should('contain', '다시 로그인하기');
  });

  it('shows the blinking cursor only while coach briefing is loading', () => {
    cy.intercept('POST', '**/coach/analyze*', {
      delay: 1800,
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        meta: {
          validation_status: 'success',
          structured_response: {
            headline: '로딩 커서 테스트',
            sentiment: 'neutral',
            key_metrics: [],
            analysis: {
              strengths: [],
              weaknesses: [],
              risks: [],
            },
            detailed_markdown: '',
            coach_note: '응답이 끝나면 커서가 사라져야 합니다.',
          },
          resolved_focus: ['recent_form'],
          focus_signature: 'recent_form',
          question_signature: 'auto',
          cache_key_version: 'v3',
          request_mode: 'auto_brief',
          cached: false,
          cache_state: 'HIT',
          in_progress: false,
        },
      }),
    }).as('coachAnalyzeLoadingCursor');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      useRealClock: true,
    });

    cy.get('@coachAnalyzeLoadingCursor.all').should((interceptions) => {
      expect(interceptions).to.have.length.at.least(1);
    });
    cy.get('[data-testid="coach-briefing-message"]')
      .next('span')
      .should('exist');

    cy.wait('@coachAnalyzeLoadingCursor');
    cy.get('[data-testid="coach-briefing-message"]')
      .next('span')
      .should('not.exist');
  });


  it('renders coach briefing card without markdown markers', () => {
    const markdownMessage = '**마크다운 테스트**에서 `요약` 결과가 노출됩니다.';

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        delta: JSON.stringify({
          headline: '마크다운 테스트',
          coach_note: markdownMessage,
        }),
        meta: {
          validation_status: 'success',
          structured_response: {
            headline: '마크다운 테스트',
            sentiment: 'positive',
            key_metrics: [],
            analysis: {
              strengths: [],
              weaknesses: [],
              risks: [],
            },
            detailed_markdown: '## 핵심 정리\n- **타격** 수치가 개선됨\n- `OPS`가 0.920',
            coach_note: markdownMessage,
          },
          resolved_focus: ['recent_form'],
          focus_signature: 'recent_form',
          question_signature: 'auto',
          cache_key_version: 'v3',
          request_mode: 'auto_brief',
          cached: false,
          cache_state: 'HIT',
          in_progress: false,
        },
      }),
    }).as('coachAnalyzeMarkdownCard');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeMarkdownCard');

    cy.get('[data-testid="coach-briefing-message"]', { timeout: 12000 })
      .invoke('text')
      .then((text) => {
        expect(text).to.not.contain('**');
        expect(text).to.not.contain('`');
        expect(text).to.not.contain('###');
        expect(text).to.not.contain('#');
        expect(text).to.not.contain('```');
        expect(text).to.not.contain('- ');
      });
  });

  it('renders different grounded briefings after navigating to another scheduled game date and updates the quality badge', () => {
    setScheduleData([
      {
        gameId: '20260601HHSS0',
        gameDate: '2026-06-01',
        homeTeam: 'HH',
        awayTeam: 'SS',
        stadium: '대전',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'POST',
      },
      {
        gameId: '20260601LGKT0',
        gameDate: '2026-06-02',
        homeTeam: 'KT',
        awayTeam: 'LG',
        stadium: '잠실',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'POST',
      },
    ]);

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const gameId = extractCoachGameId(req.body);
      const headline = gameId === '20260601LGKT0'
        ? 'LG vs KT, 2차전 실데이터 브리핑'
        : '삼성 vs 한화, 1차전 실데이터 브리핑';

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          delta: JSON.stringify({
            headline,
            coach_note: `${headline} 메모`,
          }),
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'MISS_GENERATE',
            in_progress: false,
            generation_mode: 'deterministic_auto',
            data_quality: 'grounded',
            used_evidence: ['game', 'kbo_seasons', 'game_lineups'],
            structured_response: {
              headline,
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '## 경기 컨텍스트\n- 실데이터 기반',
              coach_note: `${headline} 메모`,
            },
          },
        }),
      });
    }).as('coachAnalyzeGrounded');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeGrounded');
    cy.get('[data-testid="coach-briefing-title"]').should('contain', '삼성 vs 한화, 1차전 실데이터 브리핑');
    cy.get('[data-testid="coach-briefing-quality-badge"]').should('contain', '실데이터 기반');

    cy.get('button[aria-label="다음 날짜 보기"]')
      .filter(':visible')
      .first()
      .should('be.enabled')
      .click({ force: true });
    cy.wait('@getScheduleRange');
    cy.wait('@getGameDetail');
    cy.wait('@coachAnalyzeGrounded');
    cy.get('[data-testid="coach-briefing-title"]').should('contain', 'LG vs KT, 2차전 실데이터 브리핑');
    cy.get('[data-testid="coach-briefing-quality-badge"]').should('contain', '실데이터 기반');
  });

  it('shows partial-quality grounding metadata on the briefing card', () => {
    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const meta = {
        validation_status: 'success',
        resolved_focus: ['recent_form'],
        focus_signature: 'recent_form',
        question_signature: 'auto',
        cache_key_version: 'v4',
        request_mode: 'auto_brief',
        cached: false,
        cache_state: 'MISS_GENERATE',
        in_progress: false,
        generation_mode: 'evidence_fallback',
        data_quality: 'partial',
        used_evidence: ['game', 'kbo_seasons', 'team_recent_form'],
        grounding_reasons: ['missing_summary', 'missing_starters', 'missing_lineups'],
        structured_response: {
          headline: '부분 근거 기반 자동 브리핑',
          sentiment: 'neutral',
          key_metrics: [],
          analysis: {
            strengths: [],
            weaknesses: [],
            risks: [],
          },
          detailed_markdown: '## 최근 흐름\n- 부분 데이터 기반',
          coach_note: '부분 데이터 기반 자동 브리핑입니다.',
        },
      };

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({ meta }),
      });
    }).as('coachAnalyzeMeta');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeMeta');
    cy.get('[data-testid="coach-briefing-quality-badge"]').should('contain', '실데이터 일부 기반');
    cy.contains('근거 3개').should('exist');
    cy.get('[data-testid="coach-briefing-title"]').should('contain', '부분 근거 기반 자동 브리핑');
    cy.get('[data-testid="coach-briefing-data-quality-note"]')
      .should('contain', '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.');
    cy.get('[data-testid="coach-briefing-grounding-reason"]').then(($chips) => {
      const labels = [...$chips].map((chip) => chip.textContent?.trim());
      expect(labels).to.deep.equal(['선발 미발표', '라인업 미발표', '경기 요약 부족']);
    });
  });
});
