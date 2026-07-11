#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outputDir = path.resolve(frontendRoot, 'output/landing-showcase-capture');
const assetsDir = path.resolve(frontendRoot, 'src/assets');
const host = '127.0.0.1';
const port = Number(process.env.LANDING_SHOWCASE_PORT || 5179);
const baseUrl = `http://${host}:${port}`;
const viewport = { width: 1440, height: 900 };
const fixedBrowserTime = '2026-02-11T12:00:00+09:00';

const userProfile = {
  id: 123,
  email: 'showcase@example.com',
  name: 'BEGA User',
  handle: 'begauser',
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
  cheerPoints: 0,
};

const leagueStartDates = {
  regularSeasonStart: '2026-03-22',
  postseasonStart: '2026-10-06',
  koreanSeriesStart: '2026-10-26',
};

const stadiums = [
  { stadiumId: 'JAMSIL', stadiumName: '서울 · 잠실야구장', team: 'LG/두산', lat: 37.5122, lng: 127.0719, address: '서울특별시 송파구 올림픽로 25', phone: null },
  { stadiumId: 'DAEJEON', stadiumName: '대전 · 한화생명볼파크', team: '한화', lat: 36.317, lng: 127.4285, address: '대전광역시 중구 대종로 373', phone: null },
  { stadiumId: 'GOCHEOK', stadiumName: '서울 · 고척스카이돔', team: '키움', lat: 37.4981, lng: 126.8671, address: '서울특별시 구로구 경인로 430', phone: null },
  { stadiumId: 'DAEGU', stadiumName: '대구 · 삼성 라이온즈파크', team: '삼성', lat: 35.8411, lng: 128.6819, address: '대구광역시 수성구 야구전설로 1', phone: null },
];

const scheduleGames = [
  {
    gameId: '20260211LGHH0',
    gameDate: '2026-02-11',
    sourceDate: '2026-02-11',
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
    gameDate: '2026-02-11',
    sourceDate: '2026-02-11',
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
];

const hotCheerPosts = [
  {
    id: 101,
    teamId: 'HH',
    content: '오늘 선발 라인업 분위기 좋네요. 응원석에서 같이 달려봅시다.',
    author: 'OrangeWave',
    authorHandle: 'orangewave',
    authorTeamId: 'HH',
    createdAt: '2026-02-11T09:20:00Z',
    comments: 12,
    likes: 48,
    bookmarkCount: 5,
    views: 920,
    isHot: true,
    isBookmarked: false,
    isOwner: false,
    repostCount: 2,
    repostedByMe: false,
    postType: 'NORMAL',
    imageUrls: [],
  },
  {
    id: 102,
    teamId: 'LG',
    content: '잠실 원정석 처음 가는 분들 동선은 3루 쪽으로 잡으면 편합니다.',
    author: 'SeoulAway',
    authorHandle: 'seoulaway',
    authorTeamId: 'LG',
    createdAt: '2026-02-11T08:40:00Z',
    comments: 7,
    likes: 31,
    bookmarkCount: 4,
    views: 640,
    isHot: true,
    isBookmarked: false,
    isOwner: false,
    repostCount: 1,
    repostedByMe: false,
    postType: 'NORMAL',
    imageUrls: [],
  },
];

const cheerPage = {
  content: hotCheerPosts.map((post) => ({
    ...post,
    team: post.teamId,
    timeAgo: '방금 전',
    likeCount: post.likes,
    commentCount: post.comments,
    liked: false,
    bookmarked: false,
  })),
  last: true,
  totalPages: 1,
  totalElements: hotCheerPosts.length,
  size: 20,
  number: 0,
};

const featuredMates = [
  {
    id: 901,
    title: '잠실 3루 응원석 같이 가요',
    gameDate: '2026-02-11',
    stadium: '잠실구장',
    teamName: '한화 이글스',
    currentParticipants: 2,
    maxParticipants: 4,
    status: 'OPEN',
  },
];

const showcaseParties = [
  {
    id: 901,
    hostId: 123,
    hostHandle: 'begauser',
    hostName: 'BEGA User',
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'HH',
    hostBadge: 'TRUSTED',
    hostAverageRating: 4.8,
    hostReviewCount: 12,
    teamId: 'HH',
    cheeringSide: 'HOME',
    gameDate: '2026-02-11',
    gameTime: '18:30:00',
    stadium: '잠실구장',
    homeTeam: '한화 이글스',
    awayTeam: 'LG 트윈스',
    section: '3루 응원석',
    maxParticipants: 4,
    currentParticipants: 2,
    description: '경기 전 입장 동선과 응원 시작 시간을 맞춰요.',
    status: 'PENDING',
    ticketVerified: true,
    favorited: false,
    price: 22000,
    ticketPrice: 22000,
    reservationDepositAmount: 5000,
    seatDetail: '3루 214블록 앞열',
    hostTrustMetrics: {
      completedMateCount: 8,
      averageResponseMinutes: 11,
      recentNoShowCount: 0,
    },
  },
  {
    id: 902,
    hostId: 124,
    hostHandle: 'seoulaway',
    hostName: 'Seoul Away',
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'LG',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.7,
    hostReviewCount: 9,
    teamId: 'LG',
    cheeringSide: 'AWAY',
    gameDate: '2026-02-12',
    gameTime: '19:00:00',
    stadium: '고척스카이돔',
    homeTeam: '키움 히어로즈',
    awayTeam: 'LG 트윈스',
    section: '원정 응원석',
    maxParticipants: 3,
    currentParticipants: 1,
    description: '처음 가는 분도 같이 입장할 수 있게 동선을 공유합니다.',
    status: 'PENDING',
    ticketVerified: true,
    favorited: true,
    price: 18000,
    ticketPrice: 18000,
    reservationDepositAmount: 5000,
    seatDetail: '1루 외야 지정석',
    hostTrustMetrics: {
      completedMateCount: 5,
      averageResponseMinutes: 14,
      recentNoShowCount: 0,
    },
  },
];

const foodPlaces = [
  { id: 1, stadiumName: '잠실야구장', category: 'food', name: '통밥', description: '대표 먹거리 구역', lat: 37.5124, lng: 127.0721, address: '서울 송파구 올림픽로 25', phone: null, rating: 4.8, openTime: null, closeTime: null },
  { id: 2, stadiumName: '잠실야구장', category: 'food', name: '브뤼셀프라이', description: '경기 전후 빠르게 들르기 좋은 매장', lat: 37.5121, lng: 127.0723, address: '서울 송파구 올림픽로 25', phone: null, rating: 4.1, openTime: null, closeTime: null },
];

const matchDayNavigation = {
  date: '2026-02-11',
  games: scheduleGames.map((game) => ({
    gameId: game.gameId,
    gameDate: game.gameDate,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    stadium: game.stadium,
    startTime: game.time,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    gameStatus: game.gameStatus,
    leagueType: game.leagueType,
  })),
  prevDate: '2026-02-10',
  nextDate: '2026-02-12',
  hasPrev: true,
  hasNext: true,
};

const predictionDetail = {
  gameId: scheduleGames[0].gameId,
  gameDate: scheduleGames[0].gameDate,
  stadium: scheduleGames[0].stadium,
  stadiumName: scheduleGames[0].stadium,
  startTime: scheduleGames[0].time,
  homeTeam: scheduleGames[0].homeTeam,
  awayTeam: scheduleGames[0].awayTeam,
  homeScore: null,
  awayScore: null,
  homePitcher: '문동주',
  awayPitcher: '임찬규',
  gameStatus: 'SCHEDULED',
  summary: [
    { type: 'KEY', playerName: '문동주', detail: '초반 구위와 볼넷 관리가 승부처입니다.' },
    { type: 'KEY', playerName: '임찬규', detail: '좌타 라인 대응이 경기 흐름을 가릅니다.' },
  ],
};

const diaryEntries = [
  {
    id: 301,
    date: '2026-02-11',
    type: 'scheduled',
    emoji: '🔥',
    emojiName: '기대',
    winningName: null,
    gameId: 1,
    memo: '잠실 3루 응원석. 입장 전 먹거리 동선 확인.',
    photos: [],
    photoStoragePaths: [],
    gameScope: 'home',
    team: '한화 이글스',
    stadium: '잠실구장',
    section: '3루',
    block: '214',
    seatRow: '8',
    seatNumber: '12',
    ticketVerified: true,
  },
  {
    id: 302,
    date: '2026-02-02',
    type: 'attended',
    emoji: '👏',
    emojiName: '응원',
    winningName: 'WIN',
    gameId: 2,
    memo: '동행 메이트와 응원 타이밍이 잘 맞았던 경기.',
    photos: [],
    photoStoragePaths: [],
    gameScope: 'away',
    team: '한화 이글스',
    stadium: '고척스카이돔',
    section: '외야',
    block: '104',
    seatRow: '5',
    seatNumber: '9',
    ticketVerified: true,
  },
];

const diaryStatistics = {
  totalCount: 12,
  totalWins: 7,
  totalLosses: 4,
  totalDraws: 1,
  winRate: 58,
  monthlyCount: 3,
  yearlyCount: 12,
  yearlyWins: 7,
  yearlyWinRate: 58,
  mostVisitedStadium: '잠실구장',
  mostVisitedCount: 5,
  monthlyVisitCounts: { '2026-01': 4, '2026-02': 3, '2026-03': 5 },
  stadiumVisitCounts: { 잠실구장: 5, 고척스카이돔: 3, 대전한화생명볼파크: 4 },
  homeVisitCount: 8,
  awayVisitCount: 4,
  scheduledCount: 2,
  happiestMonth: '2026-03',
  happiestCount: 5,
  firstDiaryDate: '2026-01-04',
  cheerPostCount: 6,
  mateParticipationCount: 4,
  emojiCounts: { 응원: 5, 기대: 3, 환호: 4 },
  currentWinStreak: 2,
  longestWinStreak: 4,
  currentLossStreak: 0,
  opponentWinRates: {
    LG: { wins: 2, losses: 1, draws: 0, winRate: 67 },
    KT: { wins: 1, losses: 1, draws: 0, winRate: 50 },
  },
  bestOpponent: 'LG',
  worstOpponent: 'KT',
  dayOfWeekStats: {
    토: { count: 4, wins: 3, winRate: 75 },
    일: { count: 3, wins: 2, winRate: 67 },
  },
  luckyDay: '토',
  earnedBadges: ['첫 직관', '응원석 단골'],
};

const jsonResponse = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const sleep = async (ms) => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const isPortAvailable = async (candidatePort) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen({ port: candidatePort, host });
});

const waitForServer = async (url, timeoutMs = 60000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.listen(0, host, () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close(() => reject(new Error('Failed to resolve a free port.')));
      return;
    }

    const { port: availablePort } = address;
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(availablePort);
    });
  });
  server.on('error', reject);
});

const resolveChromeBinary = () => {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const check = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if ((check.status ?? 1) === 0) {
      return candidate;
    }
  }

  for (const command of ['google-chrome', 'chromium', 'chromium-browser', 'chrome']) {
    const check = spawnSync('which', [command], { encoding: 'utf8' });
    if ((check.status ?? 1) === 0) {
      return check.stdout.trim();
    }
  }

  return null;
};

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('This Node runtime does not provide a WebSocket client.');
    }

    this.socket = new WebSocket(this.wsUrl);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }

        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
          return;
        }

        pending.resolve(message.result);
        return;
      }

      const handlers = this.handlers.get(message.method) || [];
      for (const handler of handlers) {
        handler(message.params || {});
      }
    });

    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  async send(method, params = {}) {
    this.nextId += 1;
    const id = this.nextId;
    const socket = this.socket;
    if (!socket) {
      throw new Error('CDP socket is not connected.');
    }

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

    try {
      socket.close();
    } catch {
      return;
    }

    await Promise.race([
      new Promise((resolve) => {
        socket.addEventListener('close', resolve, { once: true });
        socket.addEventListener('error', resolve, { once: true });
      }),
      sleep(1000),
    ]);
  }
}

const getPageWebSocketUrl = async (debugPort, targetUrl = 'about:blank') => {
  const startedAt = Date.now();
  let createdTarget = false;
  while (Date.now() - startedAt < 20000) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`, {
        signal: AbortSignal.timeout(1500),
      });
      const pages = await response.json();
      const page = pages.find((item) => item.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }

      if (!createdTarget) {
        createdTarget = true;
        const createResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(targetUrl)}`, {
          method: 'PUT',
          signal: AbortSignal.timeout(1500),
        });
        if (createResponse.ok) {
          const createdPage = await createResponse.json();
          if (createdPage?.webSocketDebuggerUrl) {
            return createdPage.webSocketDebuggerUrl;
          }
        }
      }
    } catch {
      // Retry until Chrome exposes its debugger target.
    }

    await sleep(250);
  }

  throw new Error('Failed to resolve a Chrome DevTools target for showcase capture.');
};

const evaluateJson = async (client, expression, awaitPromise = false) => {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
  });

  if (result?.exceptionDetails) {
    const description = result.result?.description || result.exceptionDetails.text || 'Unknown CDP evaluation error.';
    throw new Error(`CDP evaluation failed: ${description}\n${expression.slice(0, 180)}`);
  }

  const rawValue = result?.result?.value;
  if (typeof rawValue === 'string') {
    return JSON.parse(rawValue);
  }

  if (rawValue && typeof rawValue === 'object') {
    return rawValue;
  }

  throw new Error(`CDP evaluation did not return a serializable JSON value.\n${expression.slice(0, 180)}`);
};

const startDevServer = async () => {
  if (!(await isPortAvailable(port))) {
    throw new Error(`Port ${port} is already in use. Set LANDING_SHOWCASE_PORT to another port.`);
  }

  const child = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    cwd: frontendRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    env: process.env,
  });

  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
  child.stderr.on('data', (chunk) => logs.push(chunk.toString()));

  try {
    await waitForServer(`${baseUrl}/`);
  } catch (error) {
    const recentLogs = logs.join('').split('\n').slice(-20).join('\n');
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${recentLogs}`);
  }

  return child;
};

const stopDevServer = async (child) => {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  const signal = (name) => {
    try {
      if (process.platform !== 'win32' && typeof child.pid === 'number') {
        process.kill(-child.pid, name);
      } else {
        child.kill(name);
      }
    } catch {
      // Ignore cleanup races.
    }
  };

  signal('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(2500),
  ]);
  signal('SIGKILL');
};

const patternMatches = (pattern, requestUrl) => {
  if (pattern === '**/*') {
    return true;
  }

  if (pattern instanceof RegExp) {
    return pattern.test(requestUrl);
  }

  if (typeof pattern === 'string' && pattern.endsWith('/**')) {
    return requestUrl.startsWith(pattern.slice(0, -2));
  }

  if (typeof pattern === 'string' && pattern.endsWith('*')) {
    return requestUrl.startsWith(pattern.slice(0, -1));
  }

  return requestUrl === pattern;
};

const encodeBody = (body) => Buffer.from(String(body ?? '')).toString('base64');

const createCDPPage = (client) => {
  const routes = [];

  const continueRequest = async (requestId) => {
    await client.send('Fetch.continueRequest', { requestId });
  };

  const captureViewportScreenshot = async (outputPath) => {
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        scale: 1,
      },
    });

    await fs.writeFile(outputPath, Buffer.from(screenshot.data, 'base64'));
  };

  client.on('Fetch.requestPaused', (event) => {
    void (async () => {
      const routeDefinition = routes.find((candidate) => patternMatches(candidate.pattern, event.request.url));
      if (!routeDefinition) {
        await continueRequest(event.requestId);
        return;
      }

      let handled = false;
      const route = {
        request: () => ({
          url: () => event.request.url,
        }),
        fulfill: async (response) => {
          handled = true;
          await client.send('Fetch.fulfillRequest', {
            requestId: event.requestId,
            responseCode: response.status || 200,
            responseHeaders: [
              { name: 'Content-Type', value: response.contentType || 'text/plain' },
              { name: 'Cache-Control', value: 'no-store' },
            ],
            body: encodeBody(response.body),
          });
        },
        abort: async () => {
          handled = true;
          await client.send('Fetch.failRequest', {
            requestId: event.requestId,
            errorReason: 'Failed',
          });
        },
        continue: async () => {
          handled = true;
          await continueRequest(event.requestId);
        },
      };

      await routeDefinition.handler(route);
      if (!handled) {
        await continueRequest(event.requestId);
      }
    })().catch(async () => {
      try {
        await continueRequest(event.requestId);
      } catch {
        // The request may already be resolved after a route handler failure.
      }
    });
  });

  return {
    addInitScript: async (fn, arg) => {
      await client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(${fn.toString()})(${JSON.stringify(arg)});`,
      });
    },
    addStyleTag: async ({ content }) => {
      await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const style = document.createElement('style');
            style.setAttribute('data-landing-showcase-capture', 'true');
            style.textContent = ${JSON.stringify(content)};
            document.head.appendChild(style);
            return 'ok';
          })()
        `,
        returnByValue: true,
      });
    },
    evaluate: async (fn) => {
      await client.send('Runtime.evaluate', {
        expression: `(${fn.toString()})()`,
        awaitPromise: true,
        returnByValue: true,
      });
    },
    getByText: (text) => ({
      first: () => ({
        waitFor: async ({ timeout = 20000 } = {}) => {
          const result = await evaluateJson(client, `
            new Promise((resolve) => {
              const target = ${JSON.stringify(text)};
              const deadline = Date.now() + ${Number(timeout)};
              const check = async () => {
                const bodyText = document.body?.innerText || '';
                if (bodyText.includes(target)) {
                  if (document.fonts?.ready) {
                    await document.fonts.ready;
                  }
                  resolve(JSON.stringify({ ready: true }));
                  return;
                }
                if (Date.now() >= deadline) {
                  resolve(JSON.stringify({
                    ready: false,
                    target,
                    url: location.href,
                    title: document.title,
                    sample: bodyText.slice(0, 500),
                  }));
                  return;
                }
                setTimeout(check, 100);
              };
              check();
            })
          `, true);

          if (!result.ready) {
            throw new Error(`Timed out waiting for text "${text}": ${JSON.stringify(result)}`);
          }
        },
      }),
    }),
    goto: async (targetUrl) => {
      await client.send('Page.navigate', { url: targetUrl });
    },
    route: async (pattern, handler) => {
      routes.push({ pattern, handler });
    },
    screenshot: async ({ path: outputPath }) => {
      await captureViewportScreenshot(outputPath);
    },
  };
};

const seedBrowserState = async (context) => {
  await context.addInitScript(({ profile, fixedNow }) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixedNow).getTime();
    class FixedDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }
        super(...args);
      }

      static now() {
        return fixedTime;
      }
    }
    Object.setPrototypeOf(FixedDate, RealDate);
    window.Date = FixedDate;
    window.__BEGA_TEST_AUTH_PROFILE__ = { data: profile };
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.document.documentElement.classList.add('dark');
    window.document.documentElement.style.colorScheme = 'dark';
    window.localStorage.setItem('kbo-theme', 'dark');
    window.localStorage.setItem('bega_has_visited', 'true');
    window.localStorage.setItem('bega_dont_show_guide', 'true');
    window.localStorage.setItem('auth-bootstrap-hint', '1');
    window.localStorage.setItem('auth-bootstrap-meta', JSON.stringify({
      version: 1,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
    }));
    window.localStorage.setItem('accessToken', 'landing-showcase-token');
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: profile,
        isLoggedIn: true,
        isAdmin: false,
        isAuthLoading: false,
        publicAuthBootstrapPhase: 'idle',
        showLoginRequiredDialog: false,
        pendingLoginRedirect: null,
      },
      version: 0,
    }));
  }, { profile: userProfile, fixedNow: fixedBrowserTime });
};

const installMocks = async (page) => {
  await page.route('https://dapi.kakao.com/**', (route) => route.abort());
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/auth/mypage') || pathname.endsWith('/api/auth/mypage')) {
      await route.fulfill(jsonResponse({ success: true, data: userProfile }));
      return;
    }
    if (pathname.endsWith('/api/auth/reissue')) {
      await route.fulfill(jsonResponse({ success: true, data: { accessToken: 'landing-showcase-token' } }));
      return;
    }
    if (pathname.endsWith('/api/chat/my/unread-counts')) {
      await route.fulfill(jsonResponse({ success: true, data: 0 }));
      return;
    }
    if (pathname.endsWith('/api/notifications/my/unread-count')) {
      await route.fulfill(jsonResponse(0));
      return;
    }
    if (pathname.endsWith('/api/notifications/my') || pathname.endsWith('/api/dm/rooms/my')) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (pathname.endsWith('/api/kbo/teams')) {
      await route.fulfill(jsonResponse([
        { teamId: 'HH', teamName: '한화 이글스' },
        { teamId: 'LG', teamName: 'LG 트윈스' },
        { teamId: 'KT', teamName: 'KT 위즈' },
        { teamId: 'NC', teamName: 'NC 다이노스' },
      ]));
      return;
    }
    if (pathname.endsWith('/api/home/bootstrap')) {
      await route.fulfill(jsonResponse({
        selectedDate: '2026-02-11',
        leagueStartDates,
        navigation: {
          hasPrev: true,
          hasNext: true,
          prevGameDate: '2026-02-10',
          nextGameDate: '2026-02-12',
        },
        games: [],
        scheduledGamesWindow: scheduleGames,
        loadState: {
          source: 'bootstrap',
          isFallback: false,
          timedOut: false,
          timedOutSections: [],
          failedSections: [],
          failureReason: null,
          manualDataRequest: null,
        },
      }));
      return;
    }
    if (pathname.endsWith('/api/home/widgets')) {
      await route.fulfill(jsonResponse({
        hotCheerPosts,
        featuredMates,
        rankingSnapshot: {
          rankingSeasonYear: 2026,
          rankingSourceMessage: '2026 시즌 운영 데이터',
          isOffSeason: false,
          rankings: [],
        },
      }));
      return;
    }
    if (pathname.endsWith('/api/matches/day')) {
      await route.fulfill(jsonResponse(matchDayNavigation));
      return;
    }
    if (pathname.endsWith('/api/predictions/bootstrap')) {
      await route.fulfill(jsonResponse({
        schedule: matchDayNavigation,
        selectedGameId: scheduleGames[0].gameId,
        selectedGameFound: true,
        detail: {
          ok: true,
          data: predictionDetail,
          error: null,
        },
        voteStatus: {
          ok: true,
          data: { home: 52, away: 48, homeVotes: 52, awayVotes: 48, totalVotes: 100 },
          error: null,
        },
      }));
      return;
    }
    if (pathname.endsWith('/api/kbo/schedule/navigation') || pathname.endsWith('/api/home/navigation')) {
      await route.fulfill(jsonResponse({
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-02-10',
        nextGameDate: '2026-02-12',
      }));
      return;
    }
    if (pathname.endsWith('/api/kbo/schedule')) {
      await route.fulfill(jsonResponse(scheduleGames));
      return;
    }
    if (pathname.endsWith('/api/kbo/league-start-dates')) {
      await route.fulfill(jsonResponse(leagueStartDates));
      return;
    }
    if (pathname.endsWith('/api/matches/bounds')) {
      await route.fulfill(jsonResponse({ hasData: true, earliestGameDate: '2026-01-01', latestGameDate: '2026-12-31' }));
      return;
    }
    if (pathname.endsWith('/api/matches/range')) {
      await route.fulfill(jsonResponse(scheduleGames));
      return;
    }
    if (pathname.includes('/api/matches/')) {
      await route.fulfill(jsonResponse({
        ...scheduleGames[0],
        startTime: '18:30',
      }));
      return;
    }
    if (pathname.endsWith('/api/predictions/my-votes')) {
      await route.fulfill(jsonResponse({ votes: {} }));
      return;
    }
    if (pathname.includes('/api/predictions/status/')) {
      await route.fulfill(jsonResponse({ homeVotes: 52, awayVotes: 48, totalVotes: 100 }));
      return;
    }
    if (pathname.endsWith('/api/prediction/stats/me')) {
      await route.fulfill(jsonResponse({ success: true, data: { accuracy: 0, streak: 0, totalPredictions: 0, correctPredictions: 0 } }));
      return;
    }
    if (pathname.endsWith('/api/kbo/rankings/snapshot')) {
      await route.fulfill(jsonResponse({
        rankingSeasonYear: 2026,
        rankingSourceMessage: '2026 시즌 운영 데이터',
        isOffSeason: false,
        rankings: [],
      }));
      return;
    }
    if (pathname.endsWith('/api/cheer/posts/hot')) {
      await route.fulfill(jsonResponse(cheerPage));
      return;
    }
    if (pathname.endsWith('/api/cheer/posts/changes')) {
      await route.fulfill(jsonResponse({ newCount: 0, latestId: 102 }));
      return;
    }
    if (pathname.endsWith('/api/cheer/posts')) {
      await route.fulfill(jsonResponse(cheerPage));
      return;
    }
    if (pathname.endsWith('/api/parties')) {
      await route.fulfill(jsonResponse({
        content: showcaseParties,
        totalElements: showcaseParties.length,
        totalPages: 1,
        number: 0,
        size: 9,
        last: true,
      }));
      return;
    }
    if (pathname.endsWith('/api/parties/search-terms/popular')) {
      await route.fulfill(jsonResponse(['잠실', '응원석', '원정', '고척']));
      return;
    }
    if (pathname.endsWith('/api/parties/my')) {
      await route.fulfill(jsonResponse({ content: showcaseParties.slice(0, 1) }));
      return;
    }
    if (pathname.endsWith('/api/parties/my/history')) {
      await route.fulfill(jsonResponse({
        content: showcaseParties,
        totalElements: showcaseParties.length,
        totalPages: 1,
        number: 0,
        size: 20,
        last: true,
      }));
      return;
    }
    if (pathname.endsWith('/api/applications/my')) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (pathname.endsWith('/api/stadiums')) {
      await route.fulfill(jsonResponse(stadiums));
      return;
    }
    if (pathname.endsWith('/api/stadiums/favorites')) {
      await route.fulfill(jsonResponse({ stadiumIds: [] }));
      return;
    }
    if (pathname.includes('/api/stadiums/') && pathname.endsWith('/places')) {
      await route.fulfill(jsonResponse(foodPlaces));
      return;
    }
    if (pathname.endsWith('/api/diary/seat-views')) {
      await route.fulfill(jsonResponse([]));
      return;
    }
    if (pathname.endsWith('/api/diary/entries')) {
      await route.fulfill(jsonResponse(diaryEntries));
      return;
    }
    if (pathname.endsWith('/api/diary/statistics')) {
      await route.fulfill(jsonResponse(diaryStatistics));
      return;
    }
    if (pathname.endsWith('/api/diary/games')) {
      await route.fulfill(jsonResponse([
        { id: 1, homeTeam: '한화 이글스', awayTeam: 'LG 트윈스', stadium: '잠실구장', date: '2026-02-11' },
        { id: 2, homeTeam: '키움 히어로즈', awayTeam: 'LG 트윈스', stadium: '고척스카이돔', date: '2026-02-02' },
      ]));
      return;
    }
    if (pathname.includes('/api/franchises/')) {
      await route.fulfill(jsonResponse({
        id: 1,
        name: 'Hanwha Eagles',
        originalCode: 'HH',
        currentCode: 'HH',
        webUrl: 'https://www.hanwhaeagles.co.kr',
        summary: '한화 이글스 공식 팀 소개',
        homeStadium: '대전 한화생명볼파크',
        foundedYear: 1986,
        owner: '한화그룹',
      }));
      return;
    }
    if (pathname.startsWith('/api/')) {
      await route.fulfill(jsonResponse({ success: true, data: [] }));
      return;
    }

    await route.continue();
  });
};

const captureRoute = async ({ page, routePath, waitText, outputName, settleMs = 1400 }) => {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.getByText(waitText, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 });
  } catch (error) {
    await page.screenshot({ path: path.join(outputDir, `${outputName}-debug-timeout.png`), fullPage: false });
    throw error;
  }
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
      body { caret-color: transparent !important; }
    `,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(settleMs);
  const outputPath = path.join(outputDir, `${outputName}.png`);
  await page.screenshot({ path: outputPath, fullPage: false });
  return outputPath;
};

const optimizeAssets = async (rawPaths) => {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch (error) {
    throw new Error(`Unable to load sharp for WebP output. Run npm install in bega_frontend. ${error instanceof Error ? error.message : String(error)}`);
  }

  const outputs = {};
  const qualityByKey = {
    home: 72,
    prediction: 70,
    mate: 70,
    cheer: 70,
    stadium: 68,
    diary: 70,
  };

  for (const [key, rawPath] of Object.entries(rawPaths)) {
    const output = path.join(assetsDir, `landing-showcase-${key}.webp`);
    await sharp(rawPath)
      .webp({ quality: qualityByKey[key] || 70, effort: 6 })
      .toFile(output);
    outputs[`${key}Output`] = output;
  }

  return outputs;
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });

  const chromeBinary = resolveChromeBinary();
  if (!chromeBinary) {
    throw new Error('Unable to locate Google Chrome or Chromium. Set CHROME_BIN to continue.');
  }

  let devServer = null;
  let chromeProcess = null;
  let client = null;
  let userDataDir = null;
  try {
    devServer = await startDevServer();
    const debugPort = await getFreePort();
    userDataDir = await fs.mkdtemp(path.join(tmpdir(), 'bega-landing-showcase-'));
    chromeProcess = spawn(chromeBinary, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-extensions',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${viewport.width},${viewport.height}`,
      'about:blank',
    ], {
      cwd: frontendRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: process.env,
    });

    const wsUrl = await getPageWebSocketUrl(debugPort);
    client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [
        { name: 'prefers-color-scheme', value: 'dark' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });

    const page = createCDPPage(client);
    await seedBrowserState(page);
    await installMocks(page);

    const home = await captureRoute({
      page,
      routePath: '/home',
      waitText: '곧 열리는 경기',
      outputName: 'home',
    });
    const cheer = await captureRoute({
      page,
      routePath: '/cheer',
      waitText: '응원석',
      outputName: 'cheer',
    });
    const stadium = await captureRoute({
      page,
      routePath: '/stadium',
      waitText: '구장 가이드',
      outputName: 'stadium',
    });
    const prediction = await captureRoute({
      page,
      routePath: '/prediction',
      waitText: 'LG',
      outputName: 'prediction',
      settleMs: 2200,
    });
    const mate = await captureRoute({
      page,
      routePath: '/mate',
      waitText: '3루 응원석',
      outputName: 'mate',
      settleMs: 1800,
    });
    const diary = await captureRoute({
      page,
      routePath: '/mypage',
      waitText: '직관',
      outputName: 'diary',
      settleMs: 1800,
    });

    const optimized = await optimizeAssets({ home, prediction, mate, cheer, stadium, diary });
    const sizes = await Promise.all(Object.entries(optimized).map(async ([key, file]) => {
      const stat = await fs.stat(file);
      return [key, stat.size];
    }));

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      `${JSON.stringify({
        capturedAt: new Date().toISOString(),
        viewport,
        raw: { home, prediction, mate, cheer, stadium, diary },
        optimized,
        sizes: Object.fromEntries(sizes),
      }, null, 2)}\n`,
      'utf-8',
    );

    console.log('[landing-showcase] replaced assets:');
    for (const [key, size] of sizes) {
      console.log(`- ${key}: ${(size / 1024).toFixed(1)} KB`);
    }
    console.log(`[landing-showcase] raw screenshots: ${outputDir}`);
  } finally {
    if (client) {
      await client.close();
    }
    await stopDevServer(chromeProcess);
    if (userDataDir) {
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
    await stopDevServer(devServer);
  }
};

main().catch((error) => {
  console.error(`[landing-showcase] failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
});
