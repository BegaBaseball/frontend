/// <reference types="cypress" />

import {
  buildDefaultPredictionPath,
  ensureCoachBriefingVisible,
  installPredictionAuthenticatedSessionIntercept,
  installPredictionBootstrapIntercept,
  installPredictionGuestSessionIntercept,
  visitPredictionPage,
  waitForPredictionVoteBootstrap,
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

        const resolveMediaMatch = (query: string) => {
          if (query === '(prefers-reduced-motion: reduce)') {
            return true;
          }
          const maxWidth = query.match(/\(\s*max-width\s*:\s*(\d+)px\s*\)/);
          if (maxWidth) {
            return win.innerWidth <= Number(maxWidth[1]);
          }
          const minWidth = query.match(/\(\s*min-width\s*:\s*(\d+)px\s*\)/);
          if (minWidth) {
            return win.innerWidth >= Number(minWidth[1]);
          }
          return false;
        };

        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: (query: string) =>
            ({
              matches: resolveMediaMatch(query),
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
      cy.wait(50, { log: false });
    };

    // Advance clock to let React initialization and hydration proceed
    advanceTime(100);
    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    advanceTime(100);
    if (waitForGameDetail) {
      cy.wait('@getGameDetail');
      advanceTime(100);
    }
    // Wait for other initial requests to settle to avoid re-render noise
    if (waitForVoteBootstrap) {
      waitForPredictionVoteBootstrap();
    }
    if (!skipCoachBriefingProbe) {
      ensureCoachBriefingVisible();
    }
    if (waitForRankings) {
      advanceTime(100);
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

  const parseCoachRequestBody = (rawBody: unknown): Record<string, unknown> => {
    if (rawBody == null) {
      return {};
    }

    if (typeof rawBody === 'string') {
      try {
        return JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return {};
      }
    }

    if (typeof rawBody === 'object') {
      return rawBody as Record<string, unknown>;
    }

    return {};
  };

  const getCoachBriefingCard = () => cy.get('[data-testid="coach-briefing-card"]');
  const getCoachBriefingTitle = () => getCoachBriefingCard().find('h4').first();
  const getCoachBriefingBadge = (label: string) => getCoachBriefingCard().contains('span', label);
  const getCoachBriefingButton = (label: string) => getCoachBriefingCard().contains('button', label);
  const expectCoachBriefingText = (text: string) => getCoachBriefingCard().should('contain.text', text);
  const authProfilePayload = {
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
      cheerPoints: 0,
    },
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
        earliestGameDate: rangeSchedulePayload[0]?.gameDate || defaultRangeSchedulePayload[0]?.gameDate || '2026-06-01',
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

    installPredictionBootstrapIntercept({
      alias: 'getPredictionBootstrapCoach',
      games: () => rangeSchedulePayload,
    });

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

    cy.intercept('GET', '**/api/kbo/rankings/*', {
      statusCode: 200,
      body: defaultRankings,
    }).as('getRankingsCoach');
  });

  it('keeps transient in-progress coach brief requests bounded and eventually stops', () => {
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
            analysis_type: 'game_preview',
            cached: false,
            cache_state: 'PENDING_WAIT',
            in_progress: true,
            generation_mode: 'evidence_fallback',
            llm_skip_reason: 'pending_wait',
          },
        }),
      });
    }).as('coachAnalyzeRetry');

    // 재시도 체인은 실(real)-async SSE 응답이 다음 retry setTimeout 을 arm 한다.
    // fake clock(cy.tick)은 실 async 를 진행시키지 못해 "응답 처리 전에 시계가 지나가는" 레이스가
    // 발생하므로(실패 경계가 런마다 이동), 동일 spec 의 다른 in_progress 재시도 테스트와 같이
    // real clock 으로 구동한다. (clock 복원은 반드시 openPredictionPage 이전 — 이후 복원하면
    // 초기 요청이 fake clock 에 arm 한 retry 타이머가 폐기되어 재시도가 끊긴다.)
    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });
    openPredictionPage({
      path: '/prediction?gameId=20260601HHSS0&date=2026-06-01',
      useRealClock: true,
    });

    // 초기 요청 + PENDING 재시도(지연 5000ms, 10000ms)를 발생 순서대로 수신한다.
    cy.wait('@coachAnalyzeRetry'); // 초기
    cy.wait('@coachAnalyzeRetry', { timeout: 12000 }); // 재시도 1 (~5s 후)
    cy.wait('@coachAnalyzeRetry', { timeout: 20000 }); // 재시도 2 (~10s 후)
    cy.get('@coachAnalyzeRetry.all').its('length').should('eq', 3);

    // Pending 은 초기 요청 + 2회 재시도(상한)까지만 — 이후 시간이 더 지나도 4번째 요청은 없다.
    cy.wait(8000);
    cy.get('@coachAnalyzeRetry.all').its('length').should('eq', 3);
    cy.contains('경기 전 브리핑 준비 중입니다. 잠시 후 다시 확인해 주세요.').should('be.visible');
  });


  it('auto-calls coach brief for non-meaningful regular games', () => {
    setScheduleData([
      {
        gameId: '20260401LGKT0',
        gameDate: '2026-04-01',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        homeScore: null,
        awayScore: null,
        winner: null,
        leagueType: 'REGULAR',
      },
    ]);

    cy.intercept('GET', '**/api/kbo/rankings/*', {
      statusCode: 200,
      body: [
        { teamId: 'LG', teamName: 'LG 트윈스', rank: 8, wins: 40, losses: 60, draws: 0, winRate: '0.400', games: 100, gamesBehind: 10.0 },
        { teamId: 'KT', teamName: 'KT 위즈', rank: 9, wins: 39, losses: 61, draws: 0, winRate: '0.390', games: 100, gamesBehind: 9.0 },
      ],
    }).as('getRankingsNonMeaningful');

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
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'MISS_GENERATE',
            in_progress: false,
            generation_mode: 'deterministic_auto',
            data_quality: 'grounded',
            game_status_bucket: 'SCHEDULED',
            structured_response: {
              headline: '비핵심 정규시즌 자동 브리핑',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '비핵심 정규시즌도 자동 브리핑을 제공합니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeNonMeaningful');

    openPredictionPage({
      path: '/prediction?gameId=20260401LGKT0&date=2026-04-01',
      reducedMotion: true,
    });

    cy.wait('@getRankingsNonMeaningful');
    cy.wait('@coachAnalyzeNonMeaningful').then((interception) => {
      const body = parseCoachRequestBody(interception.request.body);
      expect(body.request_mode).to.eq('auto_brief');
      expect(extractCoachGameId(body)).to.eq('20260401LGKT0');
    });
    cy.get('[data-testid="coach-briefing-card"]').should('be.visible');
    cy.get('[data-testid="coach-briefing-card"]')
      .should('contain.text', '비핵심 정규시즌도 자동 브리핑을 제공합니다.')
      .and('not.contain.text', '자동 브리핑은 핵심 경기만 제공합니다');
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
    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });
    openPredictionPage({
      useRealClock: true,
    });

    cy.wait('@coachAnalyzeStructured');
    cy.get('@coachAnalyzeStructured.all').its('length').then((length) => {
      initialStructuredCalls = Number(length);
      expect(initialStructuredCalls).to.be.gte(1);
    });

    // PENDING 첫 재시도 지연은 5000ms; 경계 전후 확인
    cy.wait(3000);
    cy.get('@coachAnalyzeStructured.all').its('length').should((length) => {
      expect(Number(length)).to.equal(initialStructuredCalls);
    });
    cy.wait(4000); // 누적 7000ms > 5000ms → 첫 PENDING 재시도 이후
    cy.get('@coachAnalyzeStructured.all', { timeout: 10000 }).its('length').should((length) => {
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
    getCoachBriefingCard()
      .should('contain.text', '현재 브리핑 캐시가 잠겨 있습니다');
  });


  it('shows partial grounding guidance when auto brief data quality is partial', () => {
    cy.intercept('POST', '**/coach/analyze*', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          delta: JSON.stringify({
            headline: '주요 흐름 중심 브리핑',
            coach_note: '현재 확인된 흐름을 기준으로 브리핑합니다.',
          }),
          meta: {
            validation_status: 'fallback',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v3',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'COMPLETED',
            in_progress: false,
            generation_mode: 'evidence_fallback',
            data_quality: 'partial',
            grounding_reasons: ['missing_clutch_moments'],
            grounding_warnings: ['WPA 기반 승부처 데이터가 부족합니다.'],
            supported_fact_count: 3,
          },
        }),
      });
    }).as('coachAnalyzePartial');

    openPredictionPage();

    cy.tick(2000);
    cy.wait('@coachAnalyzePartial');
    getCoachBriefingCard()
      .should('contain.text', '아직 확정 전인 항목은 제외하고, 현재 확인된 경기 정보로 정리했습니다');
    getCoachBriefingBadge('주요 흐름 중심')
      .should('exist');
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

	    cy.wait('@coachAnalyzeReset');
	    cy.tick(100);
	    cy.tick(5000);
	    cy.get('@coachAnalyzeReset.all', { timeout: 10000 }).should((interceptions: any) => {
	      expect((interceptions as any[]).length).to.be.gte(1);
	    });
	    cy.get('@coachAnalyzeReset.all').its('length').then((length) => {
	      beforeSwitchCount = Number(length);
	      expect(beforeSwitchCount).to.be.gte(1);
	    });

	    cy.get('button[aria-label="다음 날짜 보기"]')
	      .filter(':visible')
	      .first()
	      .should('be.enabled')
	      .click({ force: true });
	    cy.wait('@getGameDetail');
      ensureCoachBriefingVisible();
	    cy.tick(100);
	    cy.tick(5000);
	    cy.get('@coachAnalyzeReset.all', { timeout: 10000 }).should((interceptions: any) => {
	      const interceptionList = interceptions as any[];
      const switchedGameRequests = interceptionList.filter((interception) => (
        extractCoachGameId(interception?.request?.body) === '20260601LGKT0'
      ));
	      expect(switchedGameRequests.length).to.be.gte(1);
	      const lastSwitchedRequest = switchedGameRequests[switchedGameRequests.length - 1]?.request?.body;
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

    getCoachBriefingCard()
      .scrollIntoView()
      .should('be.visible');
    cy.wait('@coachAnalyzeHydrationStable');
    getCoachBriefingTitle()
      .should('contain', '지연 상세 응답 안정화');
    expectCoachBriefingText('지연된 상세 데이터가 도착해도 기존 자동 브리핑이 유지되어야 합니다.');
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
    expectCoachBriefingText(reducedMotionMessage);
  });

  it('does not request coach analyze for guests and shows a login CTA', () => {
    installPredictionGuestSessionIntercept('getPredictionGuestSessionCoach');
    cy.viewport(390, 844);

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
    expectCoachBriefingText('경기 데이터 브리핑은 로그인 후 제공됩니다.');
    getCoachBriefingButton('로그인하고 브리핑 보기')
      .should('exist');
    getCoachBriefingCard().then(($card) => {
      const element = $card[0];
      expect(element.scrollWidth).to.be.lte(element.clientWidth + 1);
    });
  });

  it('reissues expired realtime auth before requesting coach briefing', () => {
    let profileRequestCount = 0;

    cy.intercept('GET', '**/api/auth/mypage', (req) => {
      profileRequestCount += 1;

      if (profileRequestCount === 1) {
        req.reply({
          statusCode: 401,
          body: {
            code: 'TOKEN_EXPIRED',
            message: 'Unauthorized',
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: authProfilePayload,
      });
    }).as('coachRealtimeAuthProfile');

    cy.intercept('POST', '**/auth/reissue*', {
      statusCode: 200,
      body: { success: true },
    }).as('coachRealtimeAuthReissue');

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
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
          structured_response: {
            headline: '재발급 후 경기 데이터 브리핑',
            sentiment: 'neutral',
            key_metrics: [],
            analysis: {
              strengths: [],
              weaknesses: [],
              risks: [],
            },
            detailed_markdown: '만료된 실시간 인증 쿠키를 재발급한 뒤 브리핑을 요청합니다.',
            coach_note: '만료된 실시간 인증 쿠키를 재발급한 뒤 브리핑을 요청합니다.',
          },
        },
      }),
    }).as('coachAnalyzeAfterRealtimeReissue');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachRealtimeAuthProfile');
    cy.wait('@coachRealtimeAuthReissue');
    cy.wait('@coachRealtimeAuthProfile');
    cy.wait('@coachAnalyzeAfterRealtimeReissue');
    expectCoachBriefingText('만료된 실시간 인증 쿠키를 재발급한 뒤 브리핑을 요청합니다.');
    cy.contains('로그인 세션이 만료되었습니다').should('not.exist');
  });

  it('shows a re-login CTA when realtime auth preflight cannot reissue', () => {
    cy.intercept('GET', '**/api/auth/mypage', {
      statusCode: 401,
      body: {
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized',
      },
    }).as('coachRealtimeAuthExpiredProfile');

    cy.intercept('POST', '**/auth/reissue*', {
      statusCode: 401,
      body: {
        success: false,
        code: 'REFRESH_TOKEN_EXPIRED',
      },
    }).as('coachRealtimeAuthExpiredReissue');

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        meta: {
          validation_status: 'success',
          request_mode: 'auto_brief',
          cache_state: 'HIT',
          in_progress: false,
        },
      }),
    }).as('coachAnalyzeRealtimeAuthExpired');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachRealtimeAuthExpiredProfile');
    cy.wait('@coachRealtimeAuthExpiredReissue');

    expectCoachBriefingText('로그인 세션이 만료되었습니다. 다시 로그인 후 브리핑을 확인해주세요.');
    getCoachBriefingButton('다시 로그인하기')
      .should('exist');
    cy.get('@coachAnalyzeRealtimeAuthExpired.all')
      .should('have.length', 0);
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

    expectCoachBriefingText('로그인 세션이 만료되었습니다. 다시 로그인 후 브리핑을 확인해주세요.');
    cy.contains('AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.').should('not.exist');
    getCoachBriefingButton('다시 로그인하기')
      .should('exist');
  });

  it('shows payload-limit guidance instead of generic fallback when coach analyze returns 413', () => {
    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 413,
      body: {
        success: false,
        code: 'AI_PROXY_PAYLOAD_TOO_LARGE',
        message: 'AI 요청 본문이 너무 큽니다.',
        data: { maxBytes: 65536 },
      },
    }).as('coachAnalyzePayloadTooLarge');

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
    });

    cy.wait('@coachAnalyzePayloadTooLarge');

    expectCoachBriefingText('AI 코치 분석 요청 데이터가 너무 큽니다. 다른 경기로 다시 시도하거나 잠시 후 다시 확인해주세요.');
    cy.contains('AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.').should('not.exist');
    getCoachBriefingButton('다시 로그인하기')
      .should('not.exist');
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

    getCoachBriefingCard()
      .should('contain.text', '경기 데이터 분석 중');
    cy.get('@coachAnalyzeLoadingCursor.all').should((interceptions) => {
      expect(interceptions).to.have.length.at.least(1);
    });
    getCoachBriefingCard()
      .find('.animate-pulse')
      .should('exist');

    cy.wait('@coachAnalyzeLoadingCursor');
    getCoachBriefingCard()
      .find('.animate-pulse')
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

    getCoachBriefingCard()
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
        ? 'LG vs KT, 2차전 경기 데이터 브리핑'
        : '삼성 vs 한화, 1차전 경기 데이터 브리핑';

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
              detailed_markdown: '## 경기 컨텍스트\n- 경기 데이터 반영',
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
    getCoachBriefingTitle().should('contain', '삼성 vs 한화, 1차전 경기 데이터 브리핑');
    getCoachBriefingBadge('경기 데이터 반영').should('exist');
    cy.get('[data-testid="coach-analysis-open"]').should('exist');
    getCoachBriefingCard().should('not.contain.text', '최신 갱신');

    cy.get('button[aria-label="다음 날짜 보기"]')
      .filter(':visible')
      .first()
      .should('be.enabled')
      .click({ force: true });
    cy.wait('@getGameDetail');
    cy.wait('@coachAnalyzeGrounded');
    getCoachBriefingTitle().should('contain', 'LG vs KT, 2차전 경기 데이터 브리핑');
    getCoachBriefingBadge('경기 데이터 반영').should('exist');
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
        win_probability_home: 0.62,
        structured_response: {
          headline: '주요 흐름 중심 자동 브리핑',
          sentiment: 'neutral',
          key_metrics: [],
          analysis: {
            strengths: [],
            weaknesses: [],
            risks: [],
          },
          detailed_markdown: '## 최근 흐름\n- 현재 확인된 정보 기준',
          coach_note: '현재 확인된 흐름에서는 한화의 불펜 운영 여지가 조금 더 큽니다.',
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
    getCoachBriefingBadge('주요 흐름 중심').should('exist');
    getCoachBriefingTitle().should('contain', '주요 흐름 중심 자동 브리핑');
    getCoachBriefingCard()
      .should('contain.text', '아직 확정 전인 항목은 제외하고, 현재 확인된 경기 정보로 정리했습니다.')
      .and('not.contain.text', '핵심 근거')
      .and('not.contain.text', '경기 자체')
      .and('not.contain.text', 'KBO 시즌 흐름')
      .and('not.contain.text', '최신 갱신')
      .and('not.contain.text', '선발 미발표')
      .and('not.contain.text', '부분 근거');
    // V5: VS bar should appear when win_probability_home is provided
    getCoachBriefingCard()
      .find('[data-testid="coach-vs-bar"]')
      .should('exist');
    cy.get('[data-testid="coach-analysis-open"]').should('exist');
    cy.viewport(390, 844);
    getCoachBriefingCard().then(($card) => {
      const element = $card[0];
      expect(element.scrollWidth).to.be.lte(element.clientWidth + 1);
    });
  });

  it('shows detailed partial-quality warnings when clutch or focus evidence is limited', () => {
    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const meta = {
        validation_status: 'success',
        resolved_focus: ['matchup', 'batting'],
        focus_signature: 'matchup+batting',
        question_signature: 'auto',
        cache_key_version: 'v4',
        request_mode: 'auto_brief',
        cached: false,
        cache_state: 'MISS_GENERATE',
        in_progress: false,
        generation_mode: 'evidence_fallback',
        data_quality: 'partial',
        used_evidence: ['game', 'kbo_seasons', 'team_recent_form'],
        grounding_reasons: ['missing_clutch_moments', 'focus_data_unavailable'],
        grounding_warnings: [
          'WPA 기반 승부처 데이터가 부족합니다.',
          '요청한 focus 중 상대 전적, 타격 생산성 근거가 부족해 확인 가능한 항목만 분석합니다.',
          '요청한 focus 근거가 부족해 확인 가능한 항목만 분석하거나 보수 요약으로 전환합니다.',
        ],
        structured_response: {
          headline: '확인 정보 중심 자동 브리핑',
          sentiment: 'neutral',
          key_metrics: [],
          analysis: {
            strengths: [],
            weaknesses: [],
            risks: [],
          },
          detailed_markdown: '## 최근 흐름\n- 확인 가능한 정보 기준',
          coach_note: '승부처와 요청 항목은 확인 가능한 범위로만 정리합니다.',
        },
      };

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({ meta }),
      });
    }).as('coachAnalyzePartialDetail');

    openPredictionPage({
      path: '/prediction?gameId=20260601HHSS0&date=2026-06-01',
    });

    cy.wait('@coachAnalyzePartialDetail');
    getCoachBriefingBadge('주요 흐름 중심').should('exist');
    getCoachBriefingCard()
      .should('contain.text', '아직 확정 전인 항목은 제외하고, 현재 확인된 경기 정보로 정리했습니다.')
      .and('not.contain.text', '승부처 데이터 부족')
      .and('not.contain.text', '요청 항목 근거 부족')
      .and('not.contain.text', '제한 근거');
  });

  it('shows prediction labels for scheduled-game coach analysis entry', () => {
    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const body = parseCoachRequestBody(req.body);
      expect(['auto_brief', 'manual_detail']).to.include(body.request_mode);
      expect(body.analysis_type).to.eq('game_preview');

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            analysis_type: 'game_preview',
            cached: false,
            cache_state: 'MISS_GENERATE',
            in_progress: false,
            generation_mode: 'deterministic_auto',
            data_quality: 'grounded',
            structured_response: {
              headline: '예정 경기 자동 브리핑',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '예정 경기 자동 브리핑',
              coach_note: '예정 경기 자동 브리핑입니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeScheduledLabel');

    openPredictionPage({
      path: '/prediction?gameId=20260601HHSS0&date=2026-06-01',
    });

    cy.wait('@coachAnalyzeScheduledLabel');
    cy.contains('MANUAL_BASEBALL_DATA_REQUIRED').should('not.exist');
    cy.get('[data-testid="coach-analysis-open"]').should('contain', 'AI 코치 경기 예측').click({ force: true });
    cy.get('[data-testid="coach-analysis-dialog"]')
      .should('be.visible')
      .and('contain', 'AI 코치 경기 예측');
    // Auto-brief redesign: dialog auto-runs on open (no manual run button).
    // The mode-specific label now lives in the dialog header title.
    cy.get('[data-testid="coach-analysis-dialog"]').find('h2').should('contain', 'AI 코치 경기 예측');
  });

  it('renders mobile coach detail as a full-screen sheet with card metadata fallback', () => {
    cy.viewport(390, 844);

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const body = parseCoachRequestBody(req.body);
      const isManualDetail = body.request_mode === 'manual_detail';
      req.alias = isManualDetail ? 'coachAnalyzeMobileDetail' : 'coachAnalyzeMobileBrief';

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          meta: isManualDetail
            ? {
                validation_status: 'success',
                resolved_focus: ['recent_form', 'bullpen'],
                focus_signature: 'recent_form+bullpen',
                question_signature: 'manual',
                cache_key_version: 'v4',
                request_mode: 'manual_detail',
                cached: false,
                cache_state: 'MISS_GENERATE',
                in_progress: false,
                generation_mode: 'evidence_fallback',
                data_quality: 'grounded',
                game_status_bucket: 'SCHEDULED',
                structured_response: {
                  headline: '모바일 상세 분석',
                  sentiment: 'positive',
                  key_metrics: [
                    { label: '예상 승률', value: '62%', status: '홈 우위', trend: 'up', is_critical: false },
                  ],
                  analysis: {
                    summary: '홈팀이 후반 운영에서 근소하게 앞섭니다.',
                    verdict: '7회 이후 불펜 운영이 승부처입니다.',
                    strengths: ['홈팀은 후반 대타 카드가 남아 있습니다.'],
                    weaknesses: ['원정팀은 불펜 소모가 누적되어 있습니다.'],
                    risks: [
                      {
                        area: '불펜 운영',
                        level: 1,
                        description: '7회 이후 우완 불펜 매치업이 흔들릴 수 있습니다.',
                        inning_label: '7~8회',
                        inning_start: 7,
                        inning_end: 8,
                        impact: '-4%p',
                        impact_to: 'away',
                      },
                    ],
                    why_it_matters: ['후반 승률 변동성이 가장 큽니다.'],
                    swing_factors: ['7회 첫 불펜 선택'],
                    watch_points: ['불펜 워밍업 타이밍'],
                    uncertainty: ['라인업 확정 전까지는 보수적으로 봅니다.'],
                  },
                  detailed_markdown: '## 코치 판단\n- 7회 이후 불펜 운영이 승부처입니다.',
                  coach_note: '7회 이후 불펜 운영이 승부처입니다.',
                },
              }
            : {
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
                game_status_bucket: 'SCHEDULED',
                supported_fact_count: 14,
                used_evidence: ['game', 'game_summary'],
                win_probability_home: 62,
                structured_response: {
                  headline: '모바일 상세 자동 브리핑',
                  sentiment: 'positive',
                  key_metrics: [],
                  analysis: {
                    strengths: ['홈팀 최근 흐름 우위'],
                    weaknesses: [],
                    risks: [],
                  },
                  detailed_markdown: '모바일 상세 자동 브리핑입니다.',
                  coach_note: '모바일 상세 자동 브리핑입니다.',
                },
              },
        }),
      });
    });

    cy.get('@appClock').then((clock: any) => {
      clock.restore();
    });

    openPredictionPage({
      reducedMotion: true,
      useRealClock: true,
      path: '/prediction?gameId=20260601HHSS0&date=2026-06-01',
    });

    cy.wait('@coachAnalyzeMobileBrief');
    cy.get('[data-testid="coach-analysis-open"]').click({ force: true });
    cy.wait('@coachAnalyzeMobileDetail');

    cy.get('[data-testid="coach-analysis-dialog"]')
      .should('be.visible')
      .then(($dialog) => {
        const rect = $dialog[0].getBoundingClientRect();
        expect(rect.width).to.be.gte(389);
        expect(rect.height).to.be.gte(800);
      });

    cy.get('[data-testid="coach-analysis-dialog"]').within(() => {
      cy.contains('62%').should('exist');
      cy.contains('분석에 반영한 정보').should('exist');
      cy.contains('14건').should('exist');
      cy.contains('팀 비교').should('exist');
      cy.contains('코치 판단').should('exist');
      cy.contains('리스크 관리').should('exist');
      cy.contains('인사이트').should('exist');
      cy.contains('7~8회').should('exist');
      cy.contains('-4%p').should('exist');
    });

    cy.get('[data-testid="coach-analysis-dialog"]').then(($dialog) => {
      const text = $dialog.text();
      expect(text.indexOf('팀 비교')).to.be.lessThan(text.indexOf('코치 판단'));
      expect(text.indexOf('코치 판단')).to.be.lessThan(text.indexOf('리스크 관리'));
      expect(text.indexOf('리스크 관리')).to.be.lessThan(text.indexOf('인사이트'));
    });
  });

  it('shows review labels for completed-game coach analysis entry', () => {
    setScheduleData([
      {
        gameId: '20260202LGKT0',
        gameDate: '2026-02-02',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        homeScore: 4,
        awayScore: 2,
        winner: 'LG',
        gameStatus: 'COMPLETED',
        gameStatusKr: '경기 종료',
        leagueType: 'REGULAR',
      },
    ]);

    cy.intercept('POST', '**/coach/analyze*', (req) => {
      const body = parseCoachRequestBody(req.body);
      expect(['auto_brief', 'manual_detail']).to.include(body.request_mode);
      expect(body.analysis_type).to.eq('game_review');

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: buildSseResponse({
          meta: {
            validation_status: 'success',
            resolved_focus: ['recent_form'],
            focus_signature: 'recent_form',
            question_signature: 'auto',
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            analysis_type: 'game_review',
            cached: false,
            cache_state: 'MISS_GENERATE',
            in_progress: false,
            generation_mode: 'deterministic_auto',
            data_quality: 'grounded',
            game_status_bucket: 'COMPLETED',
            structured_response: {
              headline: '완료 경기 자동 브리핑',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '완료 경기 자동 브리핑',
              coach_note: '완료 경기 자동 브리핑입니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeCompletedLabel');

    openPredictionPage({
      path: '/prediction?gameId=20260202LGKT0&date=2026-02-02',
      waitForVoteBootstrap: false,
    });

    cy.wait('@coachAnalyzeCompletedLabel');
    cy.get('[data-testid="coach-analysis-open"]').should('contain', 'AI 코치 경기 리뷰').click({ force: true });
    cy.get('[data-testid="coach-analysis-dialog"]')
      .should('be.visible')
      .and('contain', 'AI 코치 경기 리뷰');
    // Auto-brief redesign: dialog auto-runs on open (no manual run button).
    // The mode-specific label now lives in the dialog header title.
    cy.get('[data-testid="coach-analysis-dialog"]').find('h2').should('contain', 'AI 코치 경기 리뷰');
  });

  it('keeps generic analysis labels for live-game coach analysis entry', () => {
    setScheduleData([
      {
        gameId: '20260203LGKT0',
        gameDate: '2026-02-03',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        homeScore: 2,
        awayScore: 1,
        winner: null,
        gameStatus: 'LIVE',
        gameStatusKr: '경기 중',
        leagueType: 'REGULAR',
      },
    ]);

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
            cache_key_version: 'v4',
            request_mode: 'auto_brief',
            cached: false,
            cache_state: 'MISS_GENERATE',
            in_progress: false,
            generation_mode: 'deterministic_auto',
            data_quality: 'grounded',
            game_status_bucket: 'LIVE',
            structured_response: {
              headline: '진행 중 경기 자동 브리핑',
              sentiment: 'neutral',
              key_metrics: [],
              analysis: {
                strengths: [],
                weaknesses: [],
                risks: [],
              },
              detailed_markdown: '진행 중 경기 자동 브리핑',
              coach_note: '진행 중 경기 자동 브리핑입니다.',
            },
          },
        }),
      });
    }).as('coachAnalyzeLiveLabel');

    openPredictionPage({
      path: '/prediction?gameId=20260203LGKT0&date=2026-02-03',
      waitForVoteBootstrap: false,
    });

    cy.wait('@coachAnalyzeLiveLabel');
    cy.get('[data-testid="coach-analysis-open"]').should('contain', 'AI 코치 상세 분석').click({ force: true });
    cy.get('[data-testid="coach-analysis-dialog"]')
      .should('be.visible')
      .and('contain', 'AI 코치 상세 분석');
    // Auto-brief redesign: dialog auto-runs on open (no manual run button).
    // The mode-specific label now lives in the dialog header title.
    cy.get('[data-testid="coach-analysis-dialog"]').find('h2').should('contain', 'AI 코치 상세 분석');
  });
});
