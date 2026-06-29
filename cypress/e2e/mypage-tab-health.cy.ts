/// <reference types="cypress" />

import {
    DEFAULT_CYPRESS_AUTH_TOKEN,
    seedCypressAuthState,
    toAuthApiUser,
    type CypressAuthUser,
} from '../support/auth';

type ApiCall = {
    activation: string;
    label: string;
    method: string;
    path: string;
    status: number;
};

type ActivationMetric = {
    label: string;
    elapsedMs: number;
    requestCount: number;
    requests: ApiCall[];
};

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ThemePreference = 'dark' | 'light';

type ThemeSnapshot = {
    rootBg: string;
    rootText: string;
    sideBg: string;
    mainBg: string;
    screenBg: string;
    screenText: string;
};

type TestWindowWithThemeControls = Window & {
    __setPrefersColorSchemeDark?: (prefersDark: boolean) => void;
};

type ParsedRgb = {
    r: number;
    g: number;
    b: number;
    a: number;
};

const authUser: CypressAuthUser = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
};

const diaryEntries = [
    {
        id: 1,
        date: '2026-06-12',
        type: 'attended',
        emoji: '😊',
        emojiName: 'happy',
        winningName: 'WIN',
        gameId: 11,
        memo: '대전 홈 응원석 분위기 최고였습니다.',
        photos: [],
        team: '한화 vs LG',
        stadium: '대전 한화생명 볼파크',
        section: '1루',
        block: '101',
        seatRow: 'A',
        seatNumber: '12',
        ticketVerified: true,
    },
];

const diaryStatistics = {
    totalCount: 3,
    totalWins: 2,
    totalLosses: 1,
    totalDraws: 0,
    winRate: 67,
    monthlyCount: 2,
    yearlyCount: 3,
    yearlyWins: 2,
    yearlyWinRate: 67,
    mostVisitedStadium: '대전 한화생명 볼파크',
    mostVisitedCount: 2,
    monthlyVisitCounts: { 6: 2, 7: 1 },
    stadiumVisitCounts: { '대전 한화생명 볼파크': 2, 잠실: 1 },
    homeVisitCount: 2,
    awayVisitCount: 1,
    scheduledCount: 0,
    happiestMonth: '6월',
    happiestCount: 2,
    firstDiaryDate: '2026-06-01',
    cheerPostCount: 4,
    mateParticipationCount: 2,
    currentWinStreak: 1,
    longestWinStreak: 2,
    currentLossStreak: 0,
    opponentWinRates: {
        LG: { wins: 1, losses: 0, draws: 0, winRate: 100 },
        두산: { wins: 1, losses: 1, draws: 0, winRate: 50 },
    },
    bestOpponent: 'LG',
    worstOpponent: '두산',
    dayOfWeekStats: {},
    luckyDay: '금요일',
    earnedBadges: ['FIRST_VISIT'],
};

const games = [
    {
        id: 11,
        homeTeam: 'HH',
        awayTeam: 'LG',
        stadium: '대전 한화생명 볼파크',
        score: '5:3',
        date: '2026-06-12',
    },
];

const myCheerPost = {
    id: 9001,
    teamId: 'HH',
    teamColor: '#f37321',
    content: '오늘 응원석 분위기 최고였습니다.',
    author: 'TestUser',
    authorId: 123,
    authorHandle: 'testuser',
    authorProfileImageUrl: null,
    authorTeamId: 'HH',
    createdAt: '2026-06-12T12:00:00Z',
    updatedAt: '2026-06-12T12:00:00Z',
    comments: 2,
    likes: 7,
    likeCount: 7,
    commentCount: 2,
    bookmarkCount: 1,
    repostCount: 0,
    views: 35,
    liked: false,
    bookmarkedByMe: false,
    isOwner: true,
    repostedByMe: false,
    isHot: false,
    postType: 'NORMAL',
    imageUrls: [],
};

const mateHistoryParty = {
    id: 501,
    hostId: 222,
    hostHandle: 'host',
    teamId: 'HH',
    cheeringSide: 'HOME',
    stadium: '대전 한화생명 볼파크',
    gameDate: '2026-06-20',
    gameTime: '18:30',
    section: '1루 응원석',
    currentParticipants: 2,
    maxParticipants: 4,
    status: 'COMPLETED',
    description: '응원석 메이트',
    homeTeam: 'HH',
    awayTeam: 'LG',
};

const pageOf = <T,>(content: T[], size = 20) => ({
    content,
    last: true,
    totalPages: content.length > 0 ? 1 : 0,
    totalElements: content.length,
    size,
    number: 0,
});

const routePath = (url: string) => {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
};

describe('MyPage tab backend health', () => {
    let apiCalls: ApiCall[];
    let activationMetrics: ActivationMetric[];
    let currentActivation: string;
    let activationStartedAt: number;

    const recordRoute = (
        label: string,
        method: RouteMethod,
        urlMatcher: string | RegExp,
        body: unknown,
        delay = 0,
    ) => {
        cy.intercept(method, urlMatcher, (req) => {
            const statusCode = 200;
            apiCalls.push({
                activation: currentActivation,
                label,
                method,
                path: routePath(req.url),
                status: statusCode,
            });
            req.reply({
                statusCode,
                delay,
                body,
            });
        }).as(label);
    };

    const startActivation = (label: string) => {
        cy.then(() => {
            currentActivation = label;
            activationStartedAt = Date.now();
        });
    };

    const recordActivation = (label: string) => {
        cy.then(() => {
            const requests = apiCalls.filter((call) => call.activation === label);
            activationMetrics.push({
                label,
                elapsedMs: Date.now() - activationStartedAt,
                requestCount: requests.length,
                requests,
            });
        });
    };

    const measureActivation = (
        label: string,
        action: () => void,
        ready: () => void,
        waitAliases: string[] = [],
    ) => {
        startActivation(label);
        action();
        waitAliases.forEach((alias) => cy.wait(alias));
        ready();
        recordActivation(label);
    };

    const seedAuth = (win: Window) => {
        seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
            theme: 'dark',
        });
    };

    const seedAuthWithSystemTheme = (win: Window, prefersDark: boolean) => {
        seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
        });

        win.localStorage.removeItem('kbo-theme');

        const mediaQuery = '(prefers-color-scheme: dark)';
        let prefersDarkState = prefersDark;
        const listeners = new Set<(event: MediaQueryListEvent) => void>();

        const createChangeEvent = () => {
            const event = new win.Event('change') as MediaQueryListEvent;
            Object.defineProperty(event, 'matches', { configurable: true, value: prefersDarkState });
            Object.defineProperty(event, 'media', { configurable: true, value: mediaQuery });
            return event;
        };

        const mediaQueryList = {
            get matches() {
                return prefersDarkState;
            },
            media: mediaQuery,
            onchange: null,
            addListener: (listener: (event: MediaQueryListEvent) => void) => {
                listeners.add(listener);
            },
            removeListener: (listener: (event: MediaQueryListEvent) => void) => {
                listeners.delete(listener);
            },
            addEventListener: (eventName: string, listener: (event: MediaQueryListEvent) => void) => {
                if (eventName === 'change') {
                    listeners.add(listener);
                }
            },
            removeEventListener: (eventName: string, listener: (event: MediaQueryListEvent) => void) => {
                if (eventName === 'change') {
                    listeners.delete(listener);
                }
            },
            dispatchEvent: (event: Event) => {
                listeners.forEach((listener) => listener(event as MediaQueryListEvent));
                if (typeof mediaQueryList.onchange === 'function') {
                    mediaQueryList.onchange(event as MediaQueryListEvent);
                }
                return true;
            },
        } as unknown as MediaQueryList;

        Object.defineProperty(win, 'matchMedia', {
            configurable: true,
            writable: true,
            value: (query: string) => (
                query === mediaQuery
                    ? mediaQueryList
                    : ({
                        matches: false,
                        media: query,
                        onchange: null,
                        addListener: () => {},
                        removeListener: () => {},
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        dispatchEvent: () => false,
                    } as unknown as MediaQueryList)
            ),
        });

        (win as TestWindowWithThemeControls).__setPrefersColorSchemeDark = (nextPrefersDark) => {
            prefersDarkState = nextPrefersDark;
            mediaQueryList.dispatchEvent(createChangeEvent());
        };
    };

    const seedAuthWithTheme = (win: Window, theme: ThemePreference) => {
        seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
            theme,
        });
    };

    const getThemeClassState = (mode: 'light' | 'dark') =>
        cy.document().its('documentElement.classList').should((classList) => {
            const hasMode = classList.contains(mode);
            const oppositeMode = mode === 'light' ? 'dark' : 'light';
            const hasOpposite = classList.contains(oppositeMode);

            expect(hasMode, `documentElement should have ${mode}`).to.be.true;
            expect(hasOpposite, `documentElement should not have ${oppositeMode}`).to.be.false;
        });

    const parseCssRgb = (value: string): ParsedRgb => {
        const rgbMatch = value.match(/^rgba?\((.+)\)$/);
        const srgbMatch = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);

        if (srgbMatch) {
            return {
                r: Number(srgbMatch[1]) * 255,
                g: Number(srgbMatch[2]) * 255,
                b: Number(srgbMatch[3]) * 255,
                a: srgbMatch[4] ? Number(srgbMatch[4]) : 1,
            };
        }

        expect(rgbMatch, `${value} should be an rgb color`).to.not.equal(null);
        const parts = rgbMatch![1].replace(/\//g, ' ').split(/[,\s]+/).filter(Boolean);
        const parseChannel = (part: string) =>
            part.endsWith('%') ? Number.parseFloat(part) * 2.55 : Number.parseFloat(part);

        return {
            r: parseChannel(parts[0]),
            g: parseChannel(parts[1]),
            b: parseChannel(parts[2]),
            a: parts[3] ? Number.parseFloat(parts[3]) : 1,
        };
    };

    const getRelativeLuminance = ({ r, g, b }: ParsedRgb) => {
        const toLinear = (channel: number) => {
            const normalized = channel / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const getContrastRatio = (foreground: string, background: string) => {
        const foregroundLuminance = getRelativeLuminance(parseCssRgb(foreground));
        const backgroundLuminance = getRelativeLuminance(parseCssRgb(background));
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    };

    const getEffectiveBackgroundColor = (element: Element) => {
        const view = element.ownerDocument.defaultView;
        let current: Element | null = element;

        while (current && view) {
            const backgroundColor = view.getComputedStyle(current).backgroundColor;
            const parsed = parseCssRgb(backgroundColor);
            if (parsed.a > 0.05) {
                return backgroundColor;
            }
            current = current.parentElement;
        }

        return view?.getComputedStyle(element.ownerDocument.body).backgroundColor || 'rgb(255, 255, 255)';
    };

    const assertReadableContrast = (selector: string, label: string, minContrast = 4.5) => {
        cy.get(selector).should(($element) => {
            const element = $element[0];
            const view = element.ownerDocument.defaultView;
            expect(view, `${label} owner window`).to.not.equal(null);

            const foreground = view!.getComputedStyle(element).color;
            const background = getEffectiveBackgroundColor(element);
            const contrastRatio = getContrastRatio(foreground, background);

            expect(contrastRatio, `${label} contrast`).to.be.gte(minContrast);
            expect(foreground, `${label} foreground should differ from background`).not.to.eq(background);
        });
    };

    const getComputedTokenCssValue = (selector: string, propertyName: keyof CSSStyleDeclaration) =>
        cy.get(selector).invoke('css', propertyName).then((value) => value);

    const getRoundedHeight = (selector: string) =>
        cy.get(selector).then(($target) => Math.round($target[0].getBoundingClientRect().height));

    const visibleScreen = (label: string) => {
        cy.get(`section[data-screen-label="${label}"]`, { timeout: 20000 }).should('be.visible');
    };

    const waitForThemeMeasurementSettle = () => {
        cy.get('.mypage-season-root', { timeout: 20000 }).should('not.contain.text', '불러오는 중');
        cy.wait(150, { log: false });
    };

    const setSystemPrefersDark = (prefersDark: boolean) => {
        cy.window().then((win) => {
            const setPrefersColorSchemeDark = (win as TestWindowWithThemeControls).__setPrefersColorSchemeDark;
            expect(setPrefersColorSchemeDark, 'system theme test control').to.be.a('function');
            setPrefersColorSchemeDark!(prefersDark);
        });
    };

    const setStoredThemePreference = (mode: ThemePreference) => {
        cy.window().then((win) => {
            const oldValue = win.localStorage.getItem('kbo-theme');
            win.localStorage.setItem('kbo-theme', mode);
            win.dispatchEvent(new win.StorageEvent('storage', {
                key: 'kbo-theme',
                oldValue,
                newValue: mode,
            }));
        });
    };

    const toggleThemeTo = (mode: ThemePreference) => {
        const buttonLabel = mode === 'light' ? '라이트 모드로 변경' : '다크 모드로 변경';

        cy.get('body').then(($body) => {
            const visibleButton = $body
                .find(`button[aria-label="${buttonLabel}"]`)
                .filter(':visible')
                .first();

            if (visibleButton.length > 0) {
                cy.wrap(visibleButton).click();
                return;
            }

            const visibleMenuButton = $body
                .find('button[aria-label="메뉴 열기"]')
                .filter(':visible')
                .first();

            if (visibleMenuButton.length > 0) {
                cy.wrap(visibleMenuButton).click();
                cy.get('#mobile-menu-popup', { timeout: 10000 }).should('be.visible');
                cy.get(`button[aria-label="${buttonLabel}"]`, { timeout: 10000 })
                    .filter(':visible')
                    .first()
                    .click();
                cy.get('button[aria-label="메뉴 닫기"]', { timeout: 10000 })
                    .filter(':visible')
                    .first()
                    .click();
                cy.get('#mobile-menu-popup', { timeout: 10000 }).should('not.exist');
                return;
            }

            setStoredThemePreference(mode);
        });
    };

    const uploadFixtureFiles = (
        selector: string,
        count = 1,
        prefix = 'mypage-theme-diary-photo',
    ) => {
        cy.fixture('tiny-image.base64').then((base64) => {
            const contents = Cypress.Buffer.from(base64, 'base64');
            const files = Array.from({ length: count }, (_, index) => ({
                contents,
                fileName: `${prefix}-${index + 1}.png`,
                mimeType: 'image/png',
                lastModified: Date.now() + index,
            }));

            cy.get(`[data-testid="${selector}"]`).selectFile(files, { force: true });
        });
    };

    const interceptDiaryMediaUploads = (aliasPrefix: string) => {
        let nextAssetId = 9300;

        cy.intercept('POST', '**/api/media/uploads/init', (req) => {
            expect(req.body.domain).to.eq('DIARY');
            const assetId = nextAssetId++;
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        assetId,
                        uploadUrl: `https://object.example.com/upload/mypage-theme-diary-${assetId}`,
                        stagingObjectKey: `media/staging/diary/123/${assetId}-${req.body.fileName}`,
                        expiresAt: '2026-06-13T00:00:00Z',
                        requiredHeaders: {
                            'Content-Type': req.body.contentType || 'image/png',
                        },
                    },
                },
            });
        }).as(`${aliasPrefix}InitDiaryMediaUpload`);

        cy.intercept('PUT', 'https://object.example.com/upload/mypage-theme-diary-*', {
            statusCode: 200,
            body: '',
        }).as(`${aliasPrefix}PutDiaryMediaUpload`);

        cy.intercept('POST', /\/api\/media\/uploads\/\d+\/finalize$/, (req) => {
            const match = req.url.match(/\/api\/media\/uploads\/(\d+)\/finalize$/);
            const assetId = Number(match?.[1] || 0);
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        assetId,
                        storagePath: `media/diary/123/${assetId}.webp`,
                        publicUrl: `https://cdn.example.com/media/diary/123/${assetId}.webp`,
                    },
                },
            });
        }).as(`${aliasPrefix}FinalizeDiaryMediaUpload`);
    };

    const interceptSeatViewDialogFlow = (diaryId: number, aliasPrefix: string) => {
        cy.intercept('POST', '**/api/diary/save*', (req) => {
            expect(req.body.type).to.eq('attended');
            expect(req.body.gameId).to.eq(11);
            expect(req.body.winningName).to.eq('WIN');
            req.reply({
                statusCode: 201,
                body: {
                    id: diaryId,
                    date: '2026-06-13',
                    type: 'attended',
                    ticketVerified: false,
                },
            });
        }).as(`${aliasPrefix}SaveDiary`);

        interceptDiaryMediaUploads(aliasPrefix);

        cy.intercept('POST', `**/api/diary/${diaryId}/seat-view-candidates`, (req) => {
            expect(req.body.storagePaths).to.have.length(1);
            expect(req.body.sourceTypes).to.deep.equal(['DIARY_UPLOAD']);
            req.reply({
                statusCode: 200,
                body: {
                    data: {
                        candidates: [
                            {
                                id: diaryId + 1000,
                                storagePath: req.body.storagePaths[0],
                                previewUrl: 'https://cdn.example.com/media/diary/123/9300.webp',
                                sourceType: 'DIARY_UPLOAD',
                                aiSuggestedLabel: 'SEAT_VIEW',
                                aiConfidence: 0.92,
                                shareEligible: true,
                            },
                        ],
                    },
                },
            });
        }).as(`${aliasPrefix}CreateSeatViewCandidates`);

        cy.intercept('POST', `**/api/diary/${diaryId}/modify*`, (req) => {
            expect(req.body.photos).to.have.length(1);
            expect(req.body.photos[0]).to.match(/^media\/diary\/123\/\d+\.webp$/);
            req.reply({
                statusCode: 200,
                body: { success: true },
            });
        }).as(`${aliasPrefix}UpdateDiaryAfterUpload`);

        cy.intercept('POST', `**/api/diary/${diaryId}/seat-view-selections*`, (req) => {
            expect(req.body.candidateIds).to.deep.equal([diaryId + 1000]);
            req.reply({
                statusCode: 200,
                body: {
                    candidates: [],
                },
            });
        }).as(`${aliasPrefix}SubmitSeatViewSelections`);
    };

    const openSeatViewDialog = (theme: ThemePreference, aliasPrefix: string, diaryId: number) => {
        interceptSeatViewDialogFlow(diaryId, aliasPrefix);

        cy.visit('/mypage?view=diaryEditor&date=2026-06-13', {
            onBeforeLoad: (win) => seedAuthWithTheme(win, theme),
        });

        cy.wait('@healthGetDiaryEntries');
        cy.wait('@healthGetDiaryGames');
        getThemeClassState(theme);
        cy.get('[data-testid="diary-editor-form-card"]', { timeout: 20000 }).should('be.visible');
        cy.get('select').select('11');
        cy.get('select').should('have.value', '11');
        cy.contains('button', '승').click();
        cy.get('textarea').type(`${aliasPrefix} theme seat-view contrast test`);
        cy.get('textarea').should('contain.value', `${aliasPrefix} theme seat-view contrast test`);
        uploadFixtureFiles('diary-photo-upload-input', 1, `${aliasPrefix}-photo`);
        cy.get('.diary-photo-grid img[alt="업로드 1"]', { timeout: 10000 }).should('be.visible');
        cy.contains('.diary-photo-tile', '일반', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="save-diary-btn"]').should('not.be.disabled').click();

        cy.wait(`@${aliasPrefix}SaveDiary`);
        cy.wait(`@${aliasPrefix}InitDiaryMediaUpload`);
        cy.wait(`@${aliasPrefix}PutDiaryMediaUpload`);
        cy.wait(`@${aliasPrefix}FinalizeDiaryMediaUpload`);
        cy.wait(`@${aliasPrefix}CreateSeatViewCandidates`);
        cy.wait(`@${aliasPrefix}UpdateDiaryAfterUpload`);

        cy.get('[data-testid="diary-seat-view-dialog"]', { timeout: 20000 }).should('be.visible');
    };

    const assertSeatViewDialogContrast = (label: string) => {
        assertReadableContrast('[data-testid="diary-seat-view-dialog"]', `${label} dialog`);
        assertReadableContrast('[data-testid="diary-seat-view-dialog"] h2', `${label} dialog title`);
        assertReadableContrast('.diary-seat-view-candidate', `${label} candidate card`, 3);
        assertReadableContrast('.diary-seat-view-candidate p', `${label} candidate description`, 3);
        assertReadableContrast('[data-testid="diary-seat-view-submit-button"]', `${label} submit button`);

        cy.get('[data-testid="diary-seat-view-dialog"]').then(($dialog) => {
            const dialog = $dialog[0];
            const rect = dialog.getBoundingClientRect();
            const viewportWidth = dialog.ownerDocument.documentElement.clientWidth;
            expect(rect.width, `${label} dialog width`).to.be.lte(viewportWidth);
            expect(rect.height, `${label} dialog height`).to.be.greaterThan(120);
        });
    };

    const collectThemeSnapshot = (screenSelector: string) => cy.document().then((doc) => {
        const pickStyle = (selector: string, property: string) => {
            const node = doc.querySelector(selector) as Element | null;
            expect(node, `요소 ${selector}가 렌더링되어야 함`).to.not.equal(null);
            return window.getComputedStyle(node!).getPropertyValue(property).trim();
        };
        const pickBackground = (selector: string) => {
            const node = doc.querySelector(selector) as Element | null;
            expect(node, `요소 ${selector}가 렌더링되어야 함`).to.not.equal(null);
            return getEffectiveBackgroundColor(node!);
        };

        return {
            rootBg: pickBackground('.mypage-season-root'),
            rootText: pickStyle('.mypage-season-root', 'color'),
            sideBg: pickBackground('.mypage-season-side'),
            mainBg: pickBackground('.mypage-season-main'),
            screenBg: pickBackground(screenSelector),
            screenText: pickStyle(screenSelector, 'color'),
        };
    });

    const assertThemeDelta = (dark: ThemeSnapshot, light: ThemeSnapshot, viewLabel: string) => {
        expect(light.rootBg, `root background should change in ${viewLabel}`).not.to.eq(dark.rootBg);
        expect(light.rootText, `root text color should change in ${viewLabel}`).not.to.eq(dark.rootText);
        expect(light.mainBg, `main background should change in ${viewLabel}`).not.to.eq(dark.mainBg);
        expect(light.screenBg, `screen background should change in ${viewLabel}`).not.to.eq(dark.screenBg);
        expect(light.screenText, `screen text should change in ${viewLabel}`).not.to.eq(dark.screenText);
    };

    const runThemeToggleForScreen = (
        viewLabel: string,
        screenSelector: string,
        openScreen: () => void,
        assertScreenVisible?: () => void,
    ) => {
        openScreen();
        (assertScreenVisible ?? (() => visibleScreen(viewLabel)))();
        waitForThemeMeasurementSettle();

        let beforeHeight = 0;
        let darkSnapshot: ThemeSnapshot | null = null;

        getRoundedHeight('.mypage-season-app').then((height) => {
            beforeHeight = height;
        });

        collectThemeSnapshot(screenSelector).then((snapshot) => {
            darkSnapshot = snapshot;
        });
        assertReadableContrast('.mypage-season-side', `${viewLabel} dark sidebar`);
        assertReadableContrast(screenSelector, `${viewLabel} dark screen`);

        toggleThemeTo('light');
        getThemeClassState('light');
        getRoundedHeight('.mypage-season-app').then((height) => {
            expect(Math.abs(height - beforeHeight), `${viewLabel} height should remain stable in light mode`).to.be.lte(2);
        });
        assertReadableContrast('.mypage-season-side', `${viewLabel} light sidebar`);
        assertReadableContrast(screenSelector, `${viewLabel} light screen`);

        collectThemeSnapshot(screenSelector).then((lightSnapshot) => {
            expect(darkSnapshot, 'dark snapshot must exist').to.not.equal(null);
            assertThemeDelta(darkSnapshot!, lightSnapshot, viewLabel);
        });

        toggleThemeTo('dark');
        getThemeClassState('dark');
        getRoundedHeight('.mypage-season-app').then((height) => {
            expect(Math.abs(height - beforeHeight), `${viewLabel} height should return after theme restore`).to.be.lte(2);
        });
    };

    beforeEach(() => {
        apiCalls = [];
        activationMetrics = [];
        currentActivation = 'bootstrap';
        activationStartedAt = Date.now();

        cy.mockAPI();
        cy.failOnUnexpectedApi401();

        recordRoute('healthGetMyPageProfile', 'GET', '**/auth/mypage*', {
            success: true,
            data: toAuthApiUser(authUser),
        });
        recordRoute('healthGetFollowCounts', 'GET', '**/api/users/me/follow-counts*', {
            followerCount: 10,
            followingCount: 20,
            isFollowedByMe: false,
            notifyNewPosts: false,
            blockedByMe: false,
            blockingMe: false,
        });
        recordRoute('healthGetDiaryEntries', 'GET', '**/api/diary/entries*', diaryEntries, 80);
        recordRoute('healthGetDiaryStatistics', 'GET', '**/api/diary/statistics*', diaryStatistics, 120);
        recordRoute('healthGetDiaryGames', 'GET', '**/api/diary/games*', games, 70);
        recordRoute('healthGetMyCheerPosts', 'GET', '**/api/cheer/me/posts*', pageOf([myCheerPost], 10), 90);
        recordRoute('healthGetMateHistory', 'GET', '**/api/parties/my/history*', pageOf([mateHistoryParty]), 100);
        recordRoute('healthGetProviders', 'GET', '**/api/auth/providers*', {
            success: true,
            data: [
                { provider: 'GOOGLE', connected: true, email: 'test@google.com' },
                { provider: 'KAKAO', connected: false },
            ],
        }, 60);
        recordRoute('healthGetSessions', 'GET', '**/api/auth/sessions*', {
            success: true,
            data: [
                {
                    id: 'session-1',
                    deviceLabel: 'Cypress Test Browser',
                    deviceType: 'desktop',
                    browser: 'Electron',
                    os: 'macOS',
                    ip: '127.0.0.1',
                    lastActiveAt: '2026-06-12T10:00:00Z',
                    isCurrent: true,
                },
            ],
        }, 80);
        recordRoute('healthGetSecurityEvents', 'GET', '**/api/auth/security-events*', {
            success: true,
            data: [
                {
                    id: 1,
                    eventType: 'LOGIN_SUCCESS',
                    message: '새 기기 로그인',
                    occurredAt: '2026-06-12T10:00:00Z',
                    deviceLabel: 'Cypress Test Browser',
                    browser: 'Electron',
                    os: 'macOS',
                    ip: '127.0.0.1',
                },
            ],
        }, 80);
        recordRoute('healthGetBlockedUsers', 'GET', '**/api/users/me/blocked*', {
            success: true,
            data: pageOf([], 20),
        }, 50);
        recordRoute('healthGetNotificationUnreadCount', 'GET', /\/api\/notifications\/my\/unread-count(?:\?.*)?$/, 0, 30);
        recordRoute('healthGetNotifications', 'GET', /\/api\/notifications\/my(?:\?.*)?$/, [], 40);
    });

    it('records backend calls and activation timing for each MyPage tab', () => {
        startActivation('seasonLog');
        cy.visit('/mypage', { onBeforeLoad: seedAuth });
        cy.wait('@healthGetMyPageProfile');
        cy.wait('@healthGetFollowCounts');
        cy.wait('@healthGetDiaryEntries');
        cy.wait('@healthGetDiaryStatistics');
        visibleScreen('시즌 로그');
        recordActivation('seasonLog');

        measureActivation(
            'statsFromSeasonLog',
            () => cy.get('[data-testid="mypage-toggle-stats"]').first().click(),
            () => visibleScreen('나의 기록'),
        );

        measureActivation(
            'cheerPosts',
            () => cy.get('[data-testid="mypage-cheer-posts-nav"]').click(),
            () => visibleScreen('응원석 글'),
            ['@healthGetMyCheerPosts'],
        );

        measureActivation(
            'mateHistoryAll',
            () => cy.get('[data-testid="mypage-mate-history-nav"]').click(),
            () => visibleScreen('메이트 내역'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'mateHistoryCompleted',
            () => cy.get('[data-testid="mypage-mate-history-tabs"]').contains('button', '완료됨').click(),
            () => cy.get('[data-testid="mypage-mate-card"]').should('be.visible'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'mateHistoryOngoing',
            () => cy.get('[data-testid="mypage-mate-history-tabs"]').contains('button', '진행 중').click(),
            () => cy.get('[data-testid="mypage-mate-card"]').should('be.visible'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'settingsHome',
            () => cy.contains('button', '설정').click(),
            () => visibleScreen('설정'),
        );

        measureActivation(
            'accountSettings',
            () => cy.contains('button', '계정 설정').click(),
            () => {
                cy.contains('h2', '계정 설정', { timeout: 20000 }).should('be.visible');
                cy.contains('최근 보안 활동', { timeout: 20000 }).should('be.visible');
            },
            ['@healthGetProviders', '@healthGetSessions', '@healthGetSecurityEvents'],
        );

        measureActivation(
            'blockedUsers',
            () => {
                cy.contains('button', '설정').click();
                cy.contains('button', '차단한 사용자').click();
            },
            () => cy.contains('차단한 사용자가 없습니다.', { timeout: 20000 }).should('be.visible'),
            ['@healthGetBlockedUsers'],
        );

        measureActivation(
            'diaryEditorDirect',
            () => cy.visit('/mypage?view=diaryEditor&date=2026-06-12', { onBeforeLoad: seedAuth }),
            () => cy.get('[data-testid="diary-editor-calendar-card"]', { timeout: 20000 }).should('be.visible'),
            [
                '@healthGetMyPageProfile',
                '@healthGetFollowCounts',
                '@healthGetDiaryEntries',
                '@healthGetDiaryGames',
            ],
        );

        cy.then(() => {
            const failedCalls = apiCalls.filter((call) => call.status >= 400);
            expect(failedCalls, 'failed MyPage backend calls').to.deep.equal([]);

            const statsMetric = activationMetrics.find((metric) => metric.label === 'statsFromSeasonLog');
            expect(statsMetric?.requestCount, 'stats tab should reuse season log diary/statistics cache').to.equal(0);

            const settingsMetric = activationMetrics.find((metric) => metric.label === 'settingsHome');
            expect(settingsMetric?.requestCount, 'settings home should not trigger backend fetches').to.equal(0);

            const profileCallCountByActivation = (label: string) =>
                activationMetrics
                    .find((metric) => metric.label === label)
                    ?.requests.filter((call) => call.path === '/api/auth/mypage').length ?? 0;

            expect(
                profileCallCountByActivation('seasonLog'),
                'season log should not add a redundant MyPage profile fetch after auth bootstrap',
            ).to.be.lte(2);
            expect(
                profileCallCountByActivation('diaryEditorDirect'),
                'diary editor should not add a redundant MyPage profile fetch after auth bootstrap',
            ).to.be.lte(2);
        });

        cy.writeFile('reports/mypage-tab-health.json', {
            generatedAt: new Date().toISOString(),
            route: '/mypage',
            activations: activationMetrics,
        });
    });

    it('toggles MyPage between dark and light themes without layout jitter', () => {
        let darkRootBg = '';
        let lightRootBg = '';
        let darkAppHeight = 0;

        cy.visit('/mypage', { onBeforeLoad: (win) => seedAuthWithTheme(win, 'dark') });
        waitForThemeMeasurementSettle();

        getThemeClassState('dark');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((value) => {
            darkRootBg = String(value);
        });
        getRoundedHeight('.mypage-season-app').then((height) => {
            darkAppHeight = height;
        });

        cy.get('button[aria-label="라이트 모드로 변경"]').should('be.visible').click();

        getThemeClassState('light');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((value) => {
            lightRootBg = String(value);
            expect(lightRootBg).not.to.eq(darkRootBg);
        });

        getRoundedHeight('.mypage-season-app').then((height) => {
            expect(Math.abs(height - darkAppHeight), 'layout height should be stable after theme toggle').to.be.lte(2);
            cy.document().its('documentElement.classList').then((classList) => {
                expect(classList.contains('light')).to.be.true;
                expect(classList.contains('dark')).to.be.false;
            });
        });

        getComputedTokenCssValue('section[data-screen-label="시즌 로그"]', 'color').then((textColor) => {
            expect(textColor).not.to.eq(lightRootBg);
        });

        cy.get('button[aria-label="다크 모드로 변경"]').should('be.visible').click();

        getThemeClassState('dark');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((value) => {
            expect(String(value)).to.eq(darkRootBg);
        });
        getRoundedHeight('.mypage-season-app').then((height) => {
            expect(Math.abs(height - darkAppHeight), 'layout height should return after second toggle').to.be.lte(2);
        });
    });

    it('verifies theme contrast across major MyPage screens', () => {
        cy.visit('/mypage', { onBeforeLoad: (win) => seedAuthWithTheme(win, 'dark') });

        runThemeToggleForScreen(
            '시즌 로그',
            'section[data-screen-label="시즌 로그"]',
            () => visibleScreen('시즌 로그'),
        );

        runThemeToggleForScreen(
            '나의 기록',
            'section[data-screen-label="나의 기록"]',
            () => cy.get('[data-testid="mypage-toggle-stats"]').click(),
        );

        runThemeToggleForScreen(
            '응원석 글',
            'section[data-screen-label="응원석 글"]',
            () => cy.get('[data-testid="mypage-cheer-posts-nav"]').click(),
        );

        runThemeToggleForScreen(
            '메이트 내역',
            'section[data-screen-label="메이트 내역"]',
            () => cy.get('[data-testid="mypage-mate-history-nav"]').click(),
        );

        runThemeToggleForScreen(
            '알림',
            'section[data-screen-label="알림"]',
            () => cy.get('[aria-label="마이페이지 더보기"] button').contains('알림').click(),
        );

        runThemeToggleForScreen(
            '배지 도감',
            'section[data-screen-label="배지 도감"]',
            () => {
                cy.get('[aria-label="마이페이지 더보기"] button').contains('배지 도감').click();
                visibleScreen('배지 도감');
            },
        );

        runThemeToggleForScreen(
            '설정',
            'section[data-screen-label="설정"]',
            () => cy.get('.mypage-season-nav').contains('button', '설정').click(),
        );

        runThemeToggleForScreen(
            '내 정보 수정',
            '.mypage-season-main',
            () => {
                cy.get('.mypage-season-nav').contains('button', '설정').click();
                cy.get('section[data-screen-label="설정"]').should('be.visible');
                cy.contains('button', '프로필 정보').click();
            },
            () => {
                cy.contains('h2', '내 정보 수정', { timeout: 20000 }).should('be.visible');
            },
        );
    });

    it('keeps theme flip stable in mobile viewport', () => {
        cy.viewport(390, 844);
        cy.visit('/mypage', { onBeforeLoad: (win) => seedAuthWithTheme(win, 'dark') });

        runThemeToggleForScreen(
            '시즌 로그',
            'section[data-screen-label="시즌 로그"]',
            () => visibleScreen('시즌 로그'),
        );

        runThemeToggleForScreen(
            '다이어리 편집',
            '.diary-green-surface',
            () => {
                cy.get('[data-testid="mypage-season-sidebar-record-cta"]').click();
                cy.get('.diary-green-surface', { timeout: 20000 }).should('be.visible');
            },
            () => cy.get('.diary-green-surface', { timeout: 20000 }).should('be.visible'),
        );
    });

    it('keeps diary seat-view dialog readable in light theme after mobile resize', () => {
        openSeatViewDialog('light', 'lightSeatViewDialog', 811);
        cy.viewport(390, 844);

        assertSeatViewDialogContrast('light mobile-resized seat-view');
        cy.get('[data-testid="diary-seat-view-submit-button"]').click();
        cy.wait('@lightSeatViewDialogSubmitSeatViewSelections');
    });

    it('keeps diary seat-view dialog readable in dark desktop viewport', () => {
        openSeatViewDialog('dark', 'darkSeatViewDialog', 812);

        assertSeatViewDialogContrast('dark desktop seat-view');
        cy.get('[data-testid="diary-seat-view-submit-button"]').click();
        cy.wait('@darkSeatViewDialogSubmitSeatViewSelections');
    });

    it('boots and updates MyPage in system theme for dark and light OS preference', () => {
        let darkBackground = '';
        let lightBackground = '';

        cy.visit('/mypage', {
            onBeforeLoad: (win) => seedAuthWithSystemTheme(win, true),
        });

        getThemeClassState('dark');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((darkThemeBg) => {
            darkBackground = String(darkThemeBg);
        });

        setSystemPrefersDark(false);
        getThemeClassState('light');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((lightThemeBg) => {
            lightBackground = String(lightThemeBg);
            expect(lightBackground).not.to.eq(darkBackground);
        });

        setSystemPrefersDark(true);
        getThemeClassState('dark');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((darkThemeBg) => {
            expect(String(darkThemeBg)).to.eq(darkBackground);
        });

        cy.visit('/mypage', {
            onBeforeLoad: (win) => seedAuthWithSystemTheme(win, false),
        });

        getThemeClassState('light');
        getComputedTokenCssValue('.mypage-season-root', 'backgroundColor').then((lightThemeBg) => {
            expect(String(lightThemeBg)).to.eq(lightBackground);
        });

        getRoundedHeight('.mypage-season-root').then((heightBefore) => {
            expect(heightBefore).to.be.greaterThan(0);
        });
    });
});
