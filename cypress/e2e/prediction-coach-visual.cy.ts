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

type ThemeMode = 'light' | 'dark';
type VisualState = 'grounded' | 'loading' | 'partial' | 'guest';

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

type GameDetailMock = ScheduleGameMock & {
  leagueType: string;
  startTime: string;
  gameStatus: string;
  gameStatusKr: string;
};

type ViewportCase = {
  id: 'desktop' | 'mobile';
  width: number;
  height: number;
};

type ReportEntry = {
  label: string;
  group: string;
  reference?: string;
  live?: string;
  classification?: 'match' | 'intentional divergence' | 'stale reference' | 'drift to fix';
  note?: string;
};

const SCREENSHOT_PREFIX = 'prediction-coach-visual-audit';
const fixedNow = new Date('2026-02-03T12:00:00').getTime();

const viewports: ViewportCase[] = [
  { id: 'desktop', width: 1280, height: 720 },
  { id: 'mobile', width: 390, height: 844 },
];

const themes: ThemeMode[] = ['light', 'dark'];
const visualStates: VisualState[] = ['grounded', 'loading', 'partial', 'guest'];

const referenceArtboards = [
  { id: 'v5-default-light', label: 'V5Card default light', width: 740, height: 620 },
  { id: 'v5-loading-light', label: 'V5Card loading light', width: 740, height: 520 },
  { id: 'v5-partial-light', label: 'V5Card partial light', width: 740, height: 660 },
  { id: 'v5-guest-light', label: 'V5Card guest light', width: 740, height: 500 },
  { id: 'v5-default-dark', label: 'V5Card default dark', width: 740, height: 620 },
  { id: 'v5-loading-dark', label: 'V5Card loading dark', width: 740, height: 520 },
  { id: 'v5-partial-dark', label: 'V5Card partial dark', width: 740, height: 660 },
  { id: 'v5-guest-dark', label: 'V5Card guest dark', width: 740, height: 500 },
  { id: 'final-c1-refined', label: 'C1Refined confirmed full layout', width: 1180, height: 1480 },
  { id: 'v-a', label: 'VerdictA memo', width: 820, height: 400 },
  { id: 'r-d', label: 'RiskD timeline', width: 820, height: 500 },
  { id: 'r-e', label: 'RiskE versus aware', width: 820, height: 520 },
  { id: 'm-full', label: 'Mobile full sheet', width: 520, height: 1620 },
  { id: 'm-pieces', label: 'Mobile memo and risk pieces', width: 1180, height: 620 },
];

const liveCardEntries = viewports.flatMap((viewport) => themes.flatMap((theme) => (
  visualStates.map((state) => ({
    label: `Live briefing ${state} ${theme} ${viewport.id}`,
    group: 'live card',
    live: `live/${viewport.id}-${theme}-${state}-card.png`,
    classification: 'intentional divergence' as const,
    note: 'Live responsive container, teams, colors, and copy use deterministic Cypress fixtures; no overflow or text collision asserted.',
  }))
)));

const liveDialogEntries = viewports.flatMap((viewport) => themes.flatMap((theme) => [
  {
    label: `Live dialog full ${theme} ${viewport.id}`,
    group: 'live dialog',
    live: `live/${viewport.id}-${theme}-dialog-full.png`,
    classification: 'intentional divergence' as const,
    note: 'Live capture is the product dialog viewport, while C1Refined is a full reference artboard; section captures cover memo and risk surfaces.',
  },
  {
    label: `Live verdict memo ${theme} ${viewport.id}`,
    group: 'live dialog',
    live: `live/${viewport.id}-${theme}-dialog-verdict.png`,
    classification: 'intentional divergence' as const,
    note: 'Memo surface geometry matches the reference family; fixture copy and optional timestamp/highlight content differ.',
  },
  {
    label: `Live risk timeline plus versus ${theme} ${viewport.id}`,
    group: 'live dialog',
    live: `live/${viewport.id}-${theme}-dialog-risks.png`,
    classification: 'intentional divergence' as const,
    note: 'Risk surfaces render without horizontal overflow; fixture risk text and product dialog footer differ from isolated reference artboards.',
  },
]));

const reportEntries: ReportEntry[] = [
  ...referenceArtboards.map((artboard) => ({
    label: `Reference ${artboard.label}`,
    group: 'reference',
    reference: `reference/${artboard.id}.png`,
    classification: 'match' as const,
    note: 'Reference artboard captured from the local fused HTML baseline.',
  })),
  ...liveCardEntries,
  ...liveDialogEntries,
];

const defaultSchedulePayload: ScheduleGameMock[] = [
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

let rangeSchedulePayload: ScheduleGameMock[] = [...defaultSchedulePayload];
let gameDetailById: Record<string, GameDetailMock> = {};

const setScheduleData = (payload: ScheduleGameMock[]) => {
  rangeSchedulePayload = payload;
  gameDetailById = payload.reduce((acc, game) => {
    const isCompleted = Boolean(game.winner || game.homeScore !== null || game.awayScore !== null);
    acc[game.gameId] = {
      ...game,
      leagueType: game.leagueType || 'POST',
      startTime: '18:30',
      gameStatus: game.gameStatus || (isCompleted ? 'COMPLETED' : 'SCHEDULED'),
      gameStatusKr: game.gameStatusKr || (isCompleted ? '경기 종료' : '경기 예정'),
    };
    return acc;
  }, {} as Record<string, GameDetailMock>);
};

const defaultRankings = [
  { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
  { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 },
  { teamId: 'LG', teamName: 'LG 트윈스', rank: 3, wins: 75, losses: 60, draws: 0, winRate: '0.556', games: 135, gamesBehind: 2.0 },
  { teamId: 'KT', teamName: 'KT 위즈', rank: 4, wins: 70, losses: 65, draws: 0, winRate: '0.518', games: 135, gamesBehind: 3.0 },
];

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

const parseCoachRequestBody = (rawBody: unknown): Record<string, unknown> => {
  if (rawBody == null) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof rawBody === 'object') return rawBody as Record<string, unknown>;
  return {};
};

const structuredCoachResponse = ({
  headline,
  note,
  dataQuality = 'grounded',
}: {
  headline: string;
  note: string;
  dataQuality?: 'grounded' | 'partial';
}) => ({
  headline,
  sentiment: 'positive',
  key_metrics: [
    { label: '최근 흐름', value: 'HH 7승 3패 · SS 6승 4패', status: 'good', trend: 'up' },
    { label: '불펜 소모', value: 'HH 28% · SS 36%', status: 'warning', trend: 'neutral' },
    { label: '발표 선발', value: '홈 선발 안정 우위', status: 'good', trend: 'up' },
  ],
  analysis: {
    verdict: note,
    summary: note,
    strengths: [
      '홈팀은 최근 장타 생산과 불펜 회복일 간격에서 우위를 보입니다.',
      '초반 득점권 진입 빈도가 높아 선취점 시나리오가 열려 있습니다.',
    ],
    weaknesses: [
      '중심 타선 뒤 연결 구간은 경기 중반 병살 리스크를 관리해야 합니다.',
    ],
    risks: [
      {
        area: '초반 선발 제구',
        description: '1~3회 볼넷이 누적되면 홈팀의 계획된 불펜 투입 시점이 앞당겨질 수 있습니다.',
        level: 1,
        inning_start: 1,
        inning_end: 3,
        inning_label: '1~3회',
        impact: '초반 실점 위험',
        impact_to: 'home',
      },
      {
        area: '후반 대타 매치업',
        description: '7회 이후 좌우 매치업이 꼬이면 원정팀도 한 번에 균형을 되찾을 수 있습니다.',
        level: 2,
        inning_start: 7,
        inning_end: 9,
        inning_label: '7~9회',
        impact: '후반 변동성',
        impact_to: 'both',
      },
      {
        area: '원정 불펜 소모',
        description: '원정팀은 최근 3경기 불펜 투구 수가 많아 접전 후반 운영 폭이 좁습니다.',
        level: 1,
        inning_start: 6,
        inning_end: 8,
        inning_label: '6~8회',
        impact: '불펜 부담',
        impact_to: 'away',
      },
    ],
    why_it_matters: [
      '예측 우위는 단일 수치보다 초반 선발 안정과 후반 불펜 여력의 조합에서 나옵니다.',
    ],
    swing_factors: [
      '선취점 이후 6회 이전 추가 득점 여부가 승부 스윙 포인트입니다.',
    ],
    watch_points: [
      '1회 선두 타자 출루와 7회 첫 불펜 교체 타이밍을 확인해야 합니다.',
    ],
    uncertainty: dataQuality === 'partial'
      ? ['일부 세부 근거가 비어 있어 최근 흐름 중심으로 보수 해석합니다.']
      : ['라인업 최종 발표 전까지 중심 타선 조합은 변동될 수 있습니다.'],
  },
  detailed_markdown: [
    '## 경기 컨텍스트',
    '- 경기 데이터 흐름을 바탕으로 홈팀 기준 판단을 구성했습니다.',
    '- 리스크는 회차와 영향 방향을 분리해 확인합니다.',
  ].join('\n'),
  coach_note: note,
});

const buildCoachMeta = ({
  headline = '한화가 초반 운영에서 근소하게 앞섭니다',
  note = '한화는 선발 안정감과 불펜 회복일에서 앞서지만, 7회 이후 대타 매치업은 끝까지 관리해야 합니다.',
  dataQuality = 'grounded',
}: {
  headline?: string;
  note?: string;
  dataQuality?: 'grounded' | 'partial';
} = {}) => ({
  validation_status: dataQuality === 'partial' ? 'fallback' : 'success',
  resolved_focus: ['recent_form', 'bullpen', 'starter', 'matchup'],
  focus_signature: 'recent_form+bullpen+starter+matchup',
  question_signature: 'auto',
  cache_key_version: 'v4',
  cached: false,
  cache_state: 'MISS_GENERATE',
  in_progress: false,
  generation_mode: dataQuality === 'partial' ? 'evidence_fallback' : 'deterministic_auto',
  data_quality: dataQuality,
  game_status_bucket: 'SCHEDULED',
  used_evidence: ['game', 'kbo_seasons', 'team_recent_form', 'game_lineups'],
  supported_fact_count: dataQuality === 'partial' ? 3 : 14,
  grounding_reasons: dataQuality === 'partial' ? ['missing_summary', 'missing_starters'] : [],
  grounding_warnings: dataQuality === 'partial' ? ['선발/라인업 일부 근거가 부족합니다.'] : [],
  win_probability_home: 0.62,
  structured_response: structuredCoachResponse({ headline, note, dataQuality }),
});

const installCoachAnalyzeResponse = ({
  dataQuality = 'grounded',
  delayMs = 0,
}: {
  dataQuality?: 'grounded' | 'partial';
  delayMs?: number;
} = {}) => {
  cy.intercept('POST', '**/coach/analyze*', (req) => {
    const body = parseCoachRequestBody(req.body);
    const requestMode = String(body.request_mode || 'auto_brief');
    (req as unknown as { alias?: string }).alias = requestMode === 'manual_detail'
      ? 'coachAnalyzeManualVisual'
      : 'coachAnalyzeAutoVisual';

    const headline = dataQuality === 'partial'
      ? '주요 흐름 중심 자동 브리핑'
      : requestMode === 'manual_detail'
        ? '상세 분석: 한화가 후반 운영에서 근소 우위'
        : '한화가 초반 운영에서 근소하게 앞섭니다';
    const note = dataQuality === 'partial'
      ? '현재 확인된 흐름에서는 한화의 불펜 운영 여지가 조금 더 큽니다.'
      : '한화는 선발 안정감과 불펜 회복일에서 앞서지만, 7회 이후 대타 매치업은 끝까지 관리해야 합니다.';

    req.reply({
      delay: delayMs,
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: buildSseResponse({
        delta: requestMode === 'auto_brief' && dataQuality !== 'partial'
          ? JSON.stringify({ headline, coach_note: note })
          : undefined,
        meta: {
          ...buildCoachMeta({ headline, note, dataQuality }),
          request_mode: requestMode,
          analysis_type: 'game_preview',
        },
      }),
    });
  }).as('coachAnalyzeAnyVisual');
};

const seedThemeAndMedia = (win: Window, theme: ThemeMode) => {
  win.localStorage.setItem('kbo-theme', theme);
  win.localStorage.removeItem('bega-theme');
  win.localStorage.removeItem('theme');

  const resolveMediaMatch = (query: string) => {
    if (query === '(prefers-reduced-motion: reduce)') return true;
    if (query === '(prefers-color-scheme: dark)') return theme === 'dark';
    const maxWidth = query.match(/\(\s*max-width\s*:\s*(\d+)px\s*\)/);
    if (maxWidth) return win.innerWidth <= Number(maxWidth[1]);
    const minWidth = query.match(/\(\s*min-width\s*:\s*(\d+)px\s*\)/);
    if (minWidth) return win.innerWidth >= Number(minWidth[1]);
    return false;
  };

  Object.defineProperty(win, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
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
};

const installMotionFreeze = () => {
  cy.document().then((document) => {
    if (document.getElementById('prediction-coach-visual-freeze')) return;
    const style = document.createElement('style');
    style.id = 'prediction-coach-visual-freeze';
    style.textContent = [
      '*,*::before,*::after{transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;}',
      'header,[data-testid="public-mobile-bottom-nav"],[data-testid="chatbot-request-launcher"]{display:none!important;}',
      'body{caret-color:transparent!important;}',
    ].join('\n');
    document.head.appendChild(style);
  });
};

const installPredictionApiMocks = () => {
  (cy as any).mockAPI({ skipRankings: true });
  installPredictionAuthenticatedSessionIntercept('getPredictionSessionCoachVisual');
  setScheduleData([...defaultSchedulePayload]);

  cy.intercept('GET', '**/api/matches/bounds*', {
    statusCode: 200,
    body: {
      hasData: true,
      earliestGameDate: rangeSchedulePayload[0]?.gameDate || '2026-06-01',
      latestGameDate: '2026-10-31',
    },
  }).as('getMatchBoundsCoachVisual');

  cy.intercept('**/api/predictions/my-votes*', {
    statusCode: 200,
    body: { votes: { '20260601HHSS0': null } },
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
    alias: 'getPredictionBootstrapCoachVisual',
    games: () => rangeSchedulePayload,
    detailByGameId: (gameId) => (gameId ? gameDetailById[gameId] : undefined),
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
  }).as('getRankingsCoachVisual');
};

const advanceTime = (ms: number) => {
  cy.tick(ms);
  cy.wait(50, { log: false });
};

const openPredictionPage = ({
  authenticated = true,
  theme,
  viewport,
  waitForVoteBootstrap = true,
}: {
  authenticated?: boolean;
  theme: ThemeMode;
  viewport: ViewportCase;
  waitForVoteBootstrap?: boolean;
}) => {
  cy.viewport(viewport.width, viewport.height);
  visitPredictionPage({
    path: buildDefaultPredictionPath(rangeSchedulePayload),
    token: 'coach-visual-test-token',
    authenticated,
    persistedAuthHint: authenticated,
    onBeforeLoad: (win) => seedThemeAndMedia(win, theme),
  });

  advanceTime(100);
  cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
  advanceTime(100);
  cy.wait('@getPredictionBootstrapCoachVisual');
  advanceTime(100);
  if (waitForVoteBootstrap) {
    waitForPredictionVoteBootstrap();
  }
  ensureCoachBriefingVisible();
  installMotionFreeze();
  if (theme === 'dark') {
    cy.document().its('documentElement.classList').invoke('contains', 'dark').should('eq', true);
  }
};

const assertNoHorizontalOverflow = (selector: string) => {
  cy.get(selector).then(($element) => {
    const element = $element[0];
    expect(element.scrollWidth, `${selector} scrollWidth`).to.be.lte(element.clientWidth + 2);
  });
};

const screenshotName = (folder: 'reference' | 'live', id: string) => (
  `${SCREENSHOT_PREFIX}/${folder}/${id}`
);

const captureElement = (selector: string, folder: 'reference' | 'live', id: string) => {
  cy.get(selector, { timeout: 60000 })
    .scrollIntoView({ duration: 0 })
    .should('be.visible')
    .then(($element) => {
      const rect = $element[0].getBoundingClientRect();
      expect(rect.width, `${id} width`).to.be.greaterThan(0);
      expect(rect.height, `${id} height`).to.be.greaterThan(0);
    });
  cy.get(selector).screenshot(screenshotName(folder, id), { overwrite: true });
};

const mountReferenceArtboardForCapture = (artboard: typeof referenceArtboards[number]) => {
  const sourceSelector = `[data-dc-slot="${artboard.id}"] .dc-card`;
  const captureSelector = `[data-testid="reference-artboard-${artboard.id}"]`;

  cy.get(sourceSelector, { timeout: 120000 })
    .should('exist')
    .then(($source) => {
      const source = $source[0] as HTMLElement;
      expect(source.scrollWidth, `${artboard.id} source scrollWidth`).to.be.greaterThan(0);
      expect(source.scrollHeight, `${artboard.id} source scrollHeight`).to.be.greaterThan(0);

      cy.document().then((document) => {
        let host = document.getElementById('prediction-coach-reference-capture-host');
        if (!host) {
          host = document.createElement('div');
          host.id = 'prediction-coach-reference-capture-host';
          document.body.appendChild(host);
        }

        host.innerHTML = '';
        host.setAttribute('aria-hidden', 'true');
        host.setAttribute('style', [
          'position:fixed',
          'left:0',
          'top:0',
          'z-index:2147483647',
          'width:max-content',
          'height:max-content',
          'overflow:visible',
          'background:transparent',
          'padding:0',
          'margin:0',
        ].join(';'));

        const clone = source.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-testid', `reference-artboard-${artboard.id}`);
        clone.setAttribute('style', [
          clone.getAttribute('style') || '',
          'position:relative!important',
          'left:0!important',
          'top:0!important',
          'transform:none!important',
          'visibility:visible!important',
          'opacity:1!important',
          'margin:0!important',
        ].filter(Boolean).join(';'));
        host.appendChild(clone);
      });
    });

  return captureSelector;
};

const loadReferenceCanvas = () => {
  const configuredEnv = ((Cypress.config() as unknown as { env?: Record<string, unknown> }).env) || {};
  cy.env<{ predictionCoachVisualAuditReferencePath?: string }>(['predictionCoachVisualAuditReferencePath'])
    .then((runtimeEnv) => {
      const referencePath = String(
        runtimeEnv?.predictionCoachVisualAuditReferencePath
        || configuredEnv.predictionCoachVisualAuditReferencePath
        || '',
      );
      expect(referencePath, 'reference html path').to.not.eq('');

      cy.task('predictionCoachVisualAudit:prepareReferenceHtml', { referencePath }).then((result) => {
        const preparedPath = String((result as { preparedPath?: string })?.preparedPath || '');
        expect(preparedPath, 'prepared reference html path').to.not.eq('');
        cy.readFile(preparedPath, 'utf8', { timeout: 10000 }).then((html) => {
          cy.visit('about:blank');
          cy.document().then((document) => {
            document.open();
            document.write(String(html));
            document.close();
          });
          cy.window().then((win) => {
            const errors = (win as unknown as { __REFERENCE_CANVAS_ERRORS?: string[] }).__REFERENCE_CANVAS_ERRORS || [];
            expect(errors, 'reference canvas boot errors').to.deep.eq([]);
          });
          cy.get('[data-dc-slot]', { timeout: 120000 }).should(($slots) => {
            expect($slots.length, 'reference artboard slots').to.be.greaterThan(0);
          });
        });
      });
    });
};

const captureReferenceArtboard = (artboard: typeof referenceArtboards[number]) => {
  cy.viewport(Math.max(artboard.width + 180, 1000), Math.max(artboard.height + 160, 700));
  const captureSelector = mountReferenceArtboardForCapture(artboard);
  captureElement(captureSelector, 'reference', artboard.id);
};

const captureBriefingCardState = (state: VisualState, theme: ThemeMode, viewport: ViewportCase) => {
  if (state === 'guest') {
    installPredictionGuestSessionIntercept('getPredictionGuestSessionCoachVisual');
    installCoachAnalyzeResponse();
    openPredictionPage({ authenticated: false, theme, viewport, waitForVoteBootstrap: false });
    cy.get('@coachAnalyzeAnyVisual.all').should('have.length', 0);
    cy.get('[data-testid="coach-briefing-card"]').should('contain.text', '경기 데이터 브리핑은 로그인 후 제공됩니다.');
  } else if (state === 'loading') {
    installCoachAnalyzeResponse({ delayMs: 30000 });
    openPredictionPage({ theme, viewport });
    cy.get('[data-testid="coach-briefing-card"]').should('contain.text', '경기 데이터 분석 중');
  } else {
    installCoachAnalyzeResponse({ dataQuality: state === 'partial' ? 'partial' : 'grounded' });
    openPredictionPage({ theme, viewport });
    cy.wait('@coachAnalyzeAutoVisual');
    advanceTime(600);
    if (state === 'partial') {
      cy.get('[data-testid="coach-briefing-card"]').should('contain.text', '주요 흐름 중심');
    } else {
      cy.get('[data-testid="coach-briefing-card"]').should('contain.text', '경기 데이터 반영');
    }
  }

  assertNoHorizontalOverflow('[data-testid="coach-briefing-card"]');
  captureElement('[data-testid="coach-briefing-card"]', 'live', `${viewport.id}-${theme}-${state}-card`);
};

const openAndCaptureDialog = (theme: ThemeMode, viewport: ViewportCase) => {
  installCoachAnalyzeResponse();
  openPredictionPage({ theme, viewport });
  cy.wait('@coachAnalyzeAutoVisual');
  cy.get('[data-testid="coach-analysis-open"]', { timeout: 20000 })
    .scrollIntoView({ duration: 0 })
    .should('be.visible')
    .click();
  cy.wait('@coachAnalyzeManualVisual', { timeout: 20000 });
  advanceTime(1000);
  cy.get('[data-testid="coach-analysis-dialog"]', { timeout: 30000 }).should('be.visible');
  cy.contains(
    '[data-testid="coach-analysis-dialog"]',
    '상세 분석: 한화가 후반 운영에서 근소 우위',
    { timeout: 30000 },
  ).should('exist');
  cy.get('[data-testid="coach-section-verdict"]', { timeout: 30000 }).should('exist');
  cy.get('[data-testid="coach-section-risks"]', { timeout: 30000 }).should('exist');
  installMotionFreeze();

  assertNoHorizontalOverflow('[data-testid="coach-analysis-dialog"]');
  assertNoHorizontalOverflow('[data-testid="coach-c1-versus-hero"]');
  assertNoHorizontalOverflow('[data-testid="coach-risk-versus"]');
  captureElement('[data-testid="coach-analysis-dialog"]', 'live', `${viewport.id}-${theme}-dialog-full`);
  captureElement('[data-testid="coach-section-verdict"]', 'live', `${viewport.id}-${theme}-dialog-verdict`);
  captureElement('[data-testid="coach-section-risks"]', 'live', `${viewport.id}-${theme}-dialog-risks`);
};

after(() => {
  cy.task('predictionCoachVisualAudit:writeReport', { entries: reportEntries }).then((result) => {
    cy.task('log', `Prediction coach visual audit report: ${JSON.stringify(result)}`);
  });
});

describe('Prediction coach visual reference capture', () => {
  it('captures reference artboards from the fused HTML', () => {
    loadReferenceCanvas();
    cy.get('[data-dc-slot="v5-default-light"] .dc-card', { timeout: 120000 }).should('exist');
    referenceArtboards.forEach(captureReferenceArtboard);
  });
});

describe('Prediction coach live visual capture', () => {
  beforeEach(() => {
    cy.clock(fixedNow).as('appClock');
    cy.visit('about:blank');
    cy.window().then((win) => {
      win.sessionStorage.clear();
      win.localStorage.clear();
    });
    installPredictionApiMocks();
  });

  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      visualStates.forEach((state) => {
        it(`captures ${state} briefing card in ${theme} mode at ${viewport.id}`, () => {
          captureBriefingCardState(state, theme, viewport);
        });
      });

      it(`captures detailed coach analysis dialog in ${theme} mode at ${viewport.id}`, () => {
        openAndCaptureDialog(theme, viewport);
      });
    });
  });
});
