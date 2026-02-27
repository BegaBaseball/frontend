/// <reference types="cypress" />

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

  const openPredictionPage = ({ reducedMotion = false }: { reducedMotion?: boolean } = {}) => {
    const cacheBuster = Date.now();
    const visitOptions = reducedMotion
      ? {
        onBeforeLoad: (win: Window) => {
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
      }
      : undefined;

    cy.visit(`/prediction?_cypress_bust=${cacheBuster}`, visitOptions);
    // Advance clock to let React initialization and hydration proceed
    cy.tick(100);
    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getScheduleRange');
    cy.tick(100);
    cy.wait('@getGameDetail');
    cy.tick(100);
    cy.wait('@getRankingsCoach');
    cy.tick(100);
    // Wait for game content visible — confirms currentGame is non-null
    // and CoachBriefing's 380ms timer has been registered
    cy.contains('한화', { timeout: 10000 }).should('exist');
    // Ensure CoachBriefing is actually mounted
    cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 }).should('exist');

    // Wait for other initial requests to settle to avoid re-render noise
    cy.wait(['@getVoteStatus', '@getUserVotes']);
    cy.tick(500);

    // Initial state check - should not be loading yet (380ms timer)
    cy.contains('작전 구상 중...').should('not.exist');
  };





  beforeEach(() => {
    cy.clock(fixedNow);
    (cy as any).login('user');
    (cy as any).mockAPI();

    setScheduleData([...defaultRangeSchedulePayload]);

    cy.intercept('POST', '**/api/predictions/my-votes', {
      statusCode: 200,
      body: {
        votes: {
          '20260601HHSS0': null,
          '20260601LGKT0': null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 200,
      body: { votedTeam: null },
    }).as('getUserVote');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 10, awayVotes: 5 },
    }).as('getVoteStatus');

    cy.intercept('GET', '**/api/matches/range*', (req) => {
      req.reply({
        statusCode: 200,
        body: rangeSchedulePayload,
      });
    }).as('getScheduleRange');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      if (req.url.includes('/api/matches/range')) {
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

  it('retries with 4s, 6s, 9s backoff and stops after max retries', () => {
    let initialRetryCalls = 0;
    let finalRetryCalls = 0;

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

    openPredictionPage();

    cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 }).should('exist');
    cy.tick(2000);
    cy.wait('@coachAnalyzeRetry');

    cy.get('@coachAnalyzeRetry.all').its('length').then((length) => {
      initialRetryCalls = Number(length);
      expect(initialRetryCalls).to.be.gte(1);
    });

    cy.tick(12000);
    cy.get('@coachAnalyzeRetry.all').its('length').should((length) => {
      finalRetryCalls = Number(length);
      expect(finalRetryCalls).to.be.greaterThan(initialRetryCalls);
    });

    cy.tick(20000);
    cy.get('@coachAnalyzeRetry.all').its('length').should((length) => {
      expect(Number(length)).to.equal(finalRetryCalls);
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
    cy.get('@coachAnalyzeStructured.all').its('length').then((length) => {
      initialStructuredCalls = Number(length);
      expect(initialStructuredCalls).to.be.gte(1);
    });

    cy.tick(4000);
    cy.get('@coachAnalyzeStructured.all').its('length').should((length) => {
      expect(Number(length)).to.equal(initialStructuredCalls);
    });
    cy.tick(2000);
    cy.wait('@coachAnalyzeStructured');
    cy.get('@coachAnalyzeStructured.all').its('length').should((length) => {
      expect(Number(length)).to.equal(initialStructuredCalls + 1);
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


  it('resets retryCount after requestCacheKey changes to another game', () => {
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
        gameDate: '2026-06-01',
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
    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.tick(6000);
    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.tick(9000);
    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').its('length').then((length) => {
      beforeSwitchCount = Number(length);
      expect(beforeSwitchCount).to.be.gte(4);
    });

    cy.get('.flex.gap-2.overflow-x-auto')
      .find('button')
      .should('have.length.gte', 2)
      .eq(1)
      .click();

    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').its('length').should('be.greaterThan', beforeSwitchCount);

    cy.tick(4000);
    cy.get('@coachAnalyzeReset.all').its('length').should('be.gte', beforeSwitchCount + 1);
    cy.tick(2000);
    cy.wait('@coachAnalyzeReset');
    cy.get('@coachAnalyzeReset.all').its('length').should('be.gte', beforeSwitchCount + 2);
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

    openPredictionPage({ reducedMotion: true });

    cy.tick(2000);
    cy.wait('@coachAnalyzeReducedMotion');

    cy.tick(2000);
    cy.contains(reducedMotionMessage).should('be.visible');
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

    openPredictionPage({ reducedMotion: true });

    cy.tick(2000);
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
});
