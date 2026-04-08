/// <reference types="cypress" />

export {};

type AdminUserRecord = {
    id: number;
    email: string;
    name: string;
    favoriteTeam: string | null;
    createdAt: string;
    postCount: number;
    role: string;
};

type AdminReportRecord = {
    id: number;
    postId: number | null;
    postPreview: string | null;
    reporterId: number | null;
    reporterHandle: string | null;
    reason: string | null;
    description: string | null;
    status: string | null;
    adminAction: string | null;
    adminMemo: string | null;
    handledBy: number | null;
    handledAt: string | null;
    evidenceUrl: string | null;
    requestedAction: string | null;
    appealStatus: string | null;
    appealReason: string | null;
    appealCount: number | null;
    createdAt: string;
};

type SeatViewRecord = {
    id: number;
    diaryId: number;
    userId: number;
    photoUrl: string;
    storagePath: string;
    sourceType: string;
    aiSuggestedLabel: string | null;
    aiConfidence: number | null;
    aiReason: string | null;
    userSelected: boolean;
    moderationStatus: string | null;
    adminLabel: string | null;
    adminMemo: string | null;
    reviewedBy: number | null;
    reviewedAt: string | null;
    rewardGranted: boolean;
    stadium: string;
    section: string | null;
    block: string | null;
    seatRow: string | null;
    seatNumber: string | null;
    diaryDate: string | null;
    ticketVerified: boolean;
    ticketVerifiedAt: string | null;
};

type GameStatusMismatchRecord = {
    gameId: string;
    gameDate: string;
    startTime: string | null;
    rawStatus: string | null;
    normalizedRawStatus: string | null;
    effectiveStatus: string;
    homeScore: number | null;
    awayScore: number | null;
    inningScoreCount: number;
    hasKnownScore: boolean;
    hasInningScores: boolean;
    reasons: string[];
};

type GameScoreSyncRecord = {
    gameId: string;
    homeScore: number | null;
    awayScore: number | null;
    gameStatus: string;
    inningScoreCount: number;
    synced: boolean;
    usedInningScores: boolean;
    winningTeam: string | null;
    winningScore: number | null;
};

type OffseasonMovementRecord = {
    id: number;
    movementDate: string;
    section: string;
    teamCode: string;
    playerName: string;
    summary: string;
    details: string;
    contractTerm: string;
    contractValue: string;
    optionDetails: string;
    counterpartyTeam: string;
    counterpartyDetails: string;
    sourceLabel: string;
    sourceUrl: string;
    announcedAt: string;
    createdAt: string;
    updatedAt: string;
};

type PlaceRecord = {
    id: number;
    stadiumName: string;
    category: string;
    name: string;
    description?: string;
    lat: number;
    lng: number;
    address?: string;
    phone?: string;
    rating?: number;
    openTime?: string;
    closeTime?: string;
};

const ok = <T,>(data: T, message = 'ok') => ({
    success: true,
    data,
    message,
});

const readQuery = (url: string, key: string) => new URL(url).searchParams.get(key) ?? '';

const selectOption = (testId: string, optionText: string) => {
    cy.getBySel(testId).then(($element) => {
        if ($element.is('select')) {
            cy.wrap($element).select(optionText, { force: true });
            return;
        }

        cy.wrap($element).click({ force: true });
        cy.get('[role="option"]').contains(optionText).click({ force: true });
    });
};

const visibleAlertDialog = () => cy.get('[role="alertdialog"], [role="dialog"]').filter(':visible').last();

const visibleDialog = () => cy.get('[role="dialog"]').filter(':visible').last();

const authToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwibmFtZSI6IlN1cGVyQWRtaW5Vc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.admin-test-token';

describe('Admin page coverage', () => {
    let users: AdminUserRecord[];
    let reports: AdminReportRecord[];
    let seatViews: SeatViewRecord[];
    let offseasonMovements: OffseasonMovementRecord[];
    let placesByStadium: Record<string, PlaceRecord[]>;

    const superAdminProfile = {
        id: 3,
        email: 'superadmin@example.com',
        name: 'SuperAdminUser',
        handle: 'superadmin',
        favoriteTeam: 'LG',
        role: 'ROLE_SUPER_ADMIN',
        hasPassword: true,
        profileImageUrl: null,
    };

    const seedAuthenticatedWindow = (win: Window) => {
        const originalAddEventListener = win.addEventListener.bind(win);
        win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'auth-session-expired' || type === 'global-api-error') {
                return;
            }
            return originalAddEventListener(type, listener, options);
        }) as typeof win.addEventListener;

        win.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
                user: superAdminProfile,
                isLoggedIn: true,
                isAdmin: true,
            },
            version: 0,
        }));
        win.localStorage.setItem('accessToken', authToken);
        win.localStorage.setItem('auth-bootstrap-hint', '1');
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    const visitAdminPage = () => {
        cy.visit('/admin', {
            onBeforeLoad(win) {
                seedAuthenticatedWindow(win);
            },
        });
        cy.window().then((win) => {
            seedAuthenticatedWindow(win);
        });
        cy.setCookie('Authorization', authToken);
    };

    const stadiums = [
        {
            stadiumId: 'jamsil',
            stadiumName: '잠실 야구장',
            team: 'LG',
            lat: 37.512,
            lng: 127.071,
            address: '서울 송파구 올림픽로 25',
            phone: '02-2002-2222',
        },
        {
            stadiumId: 'daejeon',
            stadiumName: '대전 한화생명 이글스파크',
            team: 'HH',
            lat: 36.317,
            lng: 127.428,
            address: '대전 중구 대종로 373',
            phone: '042-222-1111',
        },
    ];

    const releasePresets = [
        {
            scenario: 'prod-release',
            task_prompt: '운영 배포 전 점검 초안을 작성합니다.',
            seed_paths: ['docs/release.md'],
            allowed_roots: ['docs', 'reports'],
        },
        {
            scenario: 'hotfix-check',
            task_prompt: '핫픽스 배포 리스크를 검토합니다.',
            seed_paths: ['docs/hotfix.md'],
            allowed_roots: ['docs/hotfix', 'reports/hotfix'],
        },
    ];

    const releaseDraftByScenario = {
        'hotfix-check': {
            result: {
                scenario: 'hotfix-check',
                model: 'gpt-5.4',
                task_prompt: '핫픽스 배포 리스크를 검토합니다.',
                seed_paths: ['docs/hotfix.md'],
                generated_at_utc: '2026-03-22T09:30:00Z',
                raw_response_text: 'NO_GO',
                draft: {
                    title: '핫픽스 검토',
                    decision: 'NO_GO',
                    summary: '에러 추적 회귀가 남아 있습니다.',
                    blockers: ['클라이언트 에러 재현 케이스 미해결'],
                    risks: ['배포 직후 5xx 증가 가능성'],
                    next_actions: ['오류 재현 후 핫픽스 재작성'],
                    evidence: [
                        {
                            claim: '클라이언트 에러가 재현됩니다.',
                            source: 'reports/client-errors.json',
                            excerpt: 'fingerprint fp-api-1 count 5',
                        },
                    ],
                    confidence: 'medium',
                },
                tool_trace: [
                    {
                        tool_name: 'read_file',
                        arguments: { path: 'docs/hotfix.md' },
                        result_preview: 'hotfix release checklist',
                    },
                ],
            },
            markdown: '# Hotfix Decision\n\nNO_GO\n',
        },
    };

    const releaseEvalCases = [
        {
            case_id: 'hotfix-check-1',
            scenario: 'hotfix-check',
            expected_decision: 'NO_GO',
            required_keywords: ['클라이언트', '에러'],
            required_sources: ['reports/client-errors.json'],
        },
        {
            case_id: 'prod-release-1',
            scenario: 'prod-release',
            expected_decision: 'GO',
            required_keywords: ['배포', '테스트'],
            required_sources: ['reports/ci.json'],
        },
    ];

    const releaseArtifacts = [
        {
            artifact_id: 'artifact-hotfix-001',
            scenario: 'hotfix-check',
            decision: 'NO_GO',
            eval_status: 'PASS',
            saved_at_utc: '2026-03-22T09:45:00Z',
            markdown_filename: 'artifact-hotfix-001.md',
            json_filename: 'artifact-hotfix-001.json',
        },
    ];

    const releaseArtifactDetail = {
        artifact_id: 'artifact-hotfix-001',
        saved_at_utc: '2026-03-22T09:45:00Z',
        scenario: 'hotfix-check',
        task_prompt: '핫픽스 배포 리스크를 검토합니다.',
        seed_paths: ['docs/hotfix.md'],
        allowed_roots: ['docs/hotfix', 'reports/hotfix'],
        draft_response: releaseDraftByScenario['hotfix-check'].result,
        markdown: '# Hotfix Decision\n\nNO_GO\n',
        evaluation: {
            case: releaseEvalCases[0],
            evaluation: {
                case_id: 'hotfix-check-1',
                status: 'PASS',
                decision_ok: true,
                keyword_hits: {
                    클라이언트: true,
                    에러: true,
                },
                source_hits: {
                    'reports/client-errors.json': true,
                },
                missing_keywords: [],
                missing_sources: [],
            },
        },
    };

    const coachAutoBriefOpsHealth = {
        window: 'today',
        date_window: '2026-04-08',
        generated_at_utc: '2026-04-08T09:00:00Z',
        runbook_path: 'task/operations/coach-auto-brief-prewarm-runbook.md',
        recommended_command:
            './.venv/bin/python scripts/batch_coach_auto_brief.py --years 2026 --date-window 2026-04-08 --eligible-only --prioritize-unresolved --quality-report reports/coach_auto_brief_prewarm_2026-04-08.json',
        summary: {
            loaded_target_count: 12,
            selected_target_count: 2,
            generated_success_count: 0,
            cache_hit_count: 1,
            in_progress_count: 1,
            failed_count: 1,
            unresolved_count: 2,
            completed_count: 0,
            cache_state_breakdown: {
                FAILED_LOCKED: 1,
                PENDING_WAIT: 1,
            },
            data_quality_breakdown: {
                insufficient: 1,
                partial: 1,
            },
        },
        unresolved_targets: [
            {
                game_id: '20260408KTLG0',
                game_date: '2026-04-08',
                away_team_id: 'KT',
                home_team_id: 'LG',
                stage_label: 'REGULAR',
                game_status_bucket: 'SCHEDULED',
                cache_key: 'cache-locked',
                cache_state: 'FAILED_LOCKED',
                data_quality: 'insufficient',
                headline: '근거 부족으로 운영 갱신이 필요합니다.',
                reason: 'failed_locked',
            },
            {
                game_id: '20260408HHSK0',
                game_date: '2026-04-08',
                away_team_id: 'HH',
                home_team_id: 'SK',
                stage_label: 'REGULAR',
                game_status_bucket: 'SCHEDULED',
                cache_key: 'cache-pending',
                cache_state: 'PENDING_WAIT',
                data_quality: 'partial',
                headline: '최신 브리핑 준비 중입니다.',
                reason: 'pending_wait',
            },
        ],
        latest_report: {
            path: 'reports/coach_auto_brief_prewarm_2026-04-08.json',
            run_started_at: '2026-04-08T08:55:00Z',
            run_finished_at: '2026-04-08T09:00:00Z',
            date_window: '2026-04-08',
            unresolved_count: 2,
            completed_count: 0,
            cache_state_breakdown: {
                FAILED_LOCKED: 1,
                PENDING_WAIT: 1,
            },
            data_quality_breakdown: {
                insufficient: 1,
                partial: 1,
            },
        },
    };

    beforeEach(() => {
        users = [
            {
                id: 3,
                email: 'superadmin@example.com',
                name: 'SuperAdminUser',
                favoriteTeam: 'LG',
                createdAt: '2026-01-01T10:00:00Z',
                postCount: 5,
                role: 'ROLE_SUPER_ADMIN',
            },
            {
                id: 11,
                email: 'fan@example.com',
                name: 'FanUser',
                favoriteTeam: 'HH',
                createdAt: '2026-02-05T10:00:00Z',
                postCount: 3,
                role: 'ROLE_USER',
            },
            {
                id: 12,
                email: 'mod@example.com',
                name: 'ModUser',
                favoriteTeam: 'LG',
                createdAt: '2026-02-10T10:00:00Z',
                postCount: 8,
                role: 'ROLE_ADMIN',
            },
        ];

        reports = [
            {
                id: 501,
                postId: 99,
                postPreview: '도배성 게시글 신고 미리보기',
                reporterId: 71,
                reporterHandle: '@reporter1',
                reason: 'SPAM',
                description: '홍보 링크가 반복됩니다.',
                status: 'PENDING',
                adminAction: null,
                adminMemo: null,
                handledBy: null,
                handledAt: null,
                evidenceUrl: 'https://example.com/evidence',
                requestedAction: 'TAKE_DOWN',
                appealStatus: 'NONE',
                appealReason: null,
                appealCount: 0,
                createdAt: '2026-03-20T09:00:00Z',
            },
        ];

        seatViews = [
            {
                id: 701,
                diaryId: 41,
                userId: 11,
                photoUrl: '/seat-view-701.png',
                storagePath: 'seat-view-701',
                sourceType: 'DIARY_UPLOAD',
                aiSuggestedLabel: 'SEAT_VIEW',
                aiConfidence: 0.93,
                aiReason: '전면 시야가 분명합니다.',
                userSelected: true,
                moderationStatus: 'PENDING',
                adminLabel: null,
                adminMemo: null,
                reviewedBy: null,
                reviewedAt: null,
                rewardGranted: false,
                stadium: '잠실',
                section: '1루',
                block: '101',
                seatRow: '5열',
                seatNumber: '12번',
                diaryDate: '2026-03-19',
                ticketVerified: true,
                ticketVerifiedAt: '2026-03-19T10:00:00Z',
            },
        ];

        offseasonMovements = [
            {
                id: 801,
                movementDate: '2026-01-10',
                section: 'FA',
                teamCode: 'LG',
                playerName: '김민수',
                summary: '4년 80억으로 잔류',
                details: '세부 옵션 5억 포함 잔류 계약',
                contractTerm: '4년',
                contractValue: '80억',
                optionDetails: '옵션 5억',
                counterpartyTeam: '',
                counterpartyDetails: '',
                sourceLabel: '구단 발표',
                sourceUrl: 'https://example.com/lg-fa',
                announcedAt: '2026-01-10T09:00',
                createdAt: '2026-01-10T09:00:00Z',
                updatedAt: '2026-01-10T09:00:00Z',
            },
        ];

        placesByStadium = {
            jamsil: [
                {
                    id: 901,
                    stadiumName: '잠실 야구장',
                    category: '음식점',
                    name: '잠실버거',
                    description: '대표 버거집',
                    lat: 37.511,
                    lng: 127.071,
                    address: '서울 송파구 올림픽로 25',
                    phone: '02-1234-5678',
                    rating: 4.4,
                    openTime: '09:00',
                    closeTime: '22:00',
                },
            ],
            daejeon: [
                {
                    id: 902,
                    stadiumName: '대전 한화생명 이글스파크',
                    category: '카페',
                    name: '이글스 카페',
                    description: '경기 전 커피',
                    lat: 36.317,
                    lng: 127.428,
                    address: '대전 중구 대종로 373',
                    phone: '042-111-1111',
                    rating: 4.2,
                    openTime: '10:00',
                    closeTime: '21:00',
                },
            ],
        };

        let gameStatusMismatches: GameStatusMismatchRecord[] = [
            {
                gameId: '20260329HTSK0',
                gameDate: '2026-03-29',
                startTime: '14:00:00',
                rawStatus: 'SCHEDULED',
                normalizedRawStatus: 'SCHEDULED',
                effectiveStatus: 'COMPLETED',
                homeScore: 11,
                awayScore: 6,
                inningScoreCount: 9,
                hasKnownScore: true,
                hasInningScores: true,
                reasons: ['inning scores present', 'known final score'],
            },
        ];

        const repairedGames: GameScoreSyncRecord[] = [
            {
                gameId: '20260329HTSK0',
                homeScore: 11,
                awayScore: 6,
                gameStatus: 'COMPLETED',
                inningScoreCount: 9,
                synced: true,
                usedInningScores: true,
                winningTeam: 'SSG 랜더스',
                winningScore: 11,
            },
        ];

        cy.mockAPI();

        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: ok(superAdminProfile),
        }).as('getSuperAdminMe');

        cy.intercept('GET', '**/api/admin/stats*', () => ({
            statusCode: 200,
            body: ok({
                totalUsers: users.length,
                totalPosts: 0,
                totalMates: 0,
            }),
        })).as('getAdminStats');

        cy.intercept('GET', '**/api/admin/users*', (req) => {
            const search = readQuery(req.url, 'search').trim().toLowerCase();
            const filteredUsers = search
                ? users.filter((user) => (
                    user.name.toLowerCase().includes(search)
                    || user.email.toLowerCase().includes(search)
                ))
                : users;

            req.reply({
                statusCode: 200,
                body: ok(filteredUsers),
            });
        }).as('getAdminUsers');

        cy.intercept('GET', '**/api/admin/posts*', {
            statusCode: 200,
            body: ok([]),
        }).as('getAdminPosts');

        cy.intercept('GET', '**/api/admin/mates*', {
            statusCode: 200,
            body: ok([]),
        }).as('getAdminMates');

        cy.intercept('POST', '**/api/admin/roles/users/*/promote', (req) => {
            const userId = Number(req.url.split('/').slice(-2)[0]);
            users = users.map((user) => (
                user.id === userId ? { ...user, role: 'ROLE_ADMIN' } : user
            ));

            req.reply({
                statusCode: 200,
                body: ok({
                    userId,
                    email: users.find((user) => user.id === userId)?.email,
                    name: users.find((user) => user.id === userId)?.name,
                    previousRole: 'ROLE_USER',
                    newRole: 'ROLE_ADMIN',
                    changedAt: '2026-03-22T10:00:00Z',
                }),
            });
        }).as('promoteAdminUser');

        cy.intercept('POST', '**/api/admin/roles/users/*/demote', (req) => {
            if (req.body?.reason === '권한 실패 테스트') {
                req.reply({
                    statusCode: 403,
                    body: {
                        success: false,
                        message: 'SUPER_ADMIN 권한이 필요합니다.',
                    },
                });
                return;
            }

            const userId = Number(req.url.split('/').slice(-2)[0]);
            users = users.map((user) => (
                user.id === userId ? { ...user, role: 'ROLE_USER' } : user
            ));

            req.reply({
                statusCode: 200,
                body: ok({
                    userId,
                    email: users.find((user) => user.id === userId)?.email,
                    name: users.find((user) => user.id === userId)?.name,
                    previousRole: 'ROLE_ADMIN',
                    newRole: 'ROLE_USER',
                    changedAt: '2026-03-22T10:00:00Z',
                }),
            });
        }).as('demoteAdminUser');

        cy.intercept('GET', '**/api/admin/reports*', (req) => {
            const status = readQuery(req.url, 'status');
            const reason = readQuery(req.url, 'reason');
            const filteredReports = reports.filter((report) => (
                (!status || report.status === status)
                && (!reason || report.reason === reason)
            ));

            req.reply({
                statusCode: 200,
                body: ok({
                    content: filteredReports,
                    totalElements: filteredReports.length,
                    totalPages: 1,
                    size: 100,
                    number: 0,
                    last: true,
                }),
            });
        }).as('getAdminReports');

        cy.intercept('GET', '**/api/admin/reports/*', (req) => {
            const reportId = Number(req.url.split('/').pop());
            req.reply({
                statusCode: 200,
                body: ok(reports.find((report) => report.id === reportId)),
            });
        }).as('getAdminReportDetail');

        cy.intercept('PATCH', '**/api/admin/reports/*', (req) => {
            const reportId = Number(req.url.split('/').pop());
            reports = reports.map((report) => (
                report.id === reportId
                    ? {
                        ...report,
                        status: req.body.action === 'DISMISS' ? 'CLOSED' : 'RESOLVED',
                        adminAction: req.body.action,
                        adminMemo: req.body.adminMemo ?? null,
                        handledBy: 3,
                        handledAt: '2026-03-22T10:30:00Z',
                    }
                    : report
            ));

            req.reply({
                statusCode: 200,
                body: ok(reports.find((report) => report.id === reportId)),
            });
        }).as('patchAdminReport');

        cy.intercept('GET', '**/api/admin/games/status-mismatches*', (req) => {
            const requestedStartDate = readQuery(req.url, 'startDate') || '2026-03-29';
            const requestedEndDate = readQuery(req.url, 'endDate') || requestedStartDate;

            req.alias = requestedStartDate === requestedEndDate
                ? 'getAdminGameStatusMismatches'
                : 'getAdminGameStatusRecommendationWindow';

            req.reply({
                statusCode: 200,
                body: ok({
                    startDate: requestedStartDate,
                    endDate: requestedEndDate,
                    totalGames: 5,
                    mismatchCount: gameStatusMismatches.length,
                    mismatches: gameStatusMismatches,
                }),
            });
        }).as('getAdminGameStatusMismatches');

        cy.intercept('POST', '**/api/admin/games/repair-status-mismatches*', (req) => {
            const requestedStartDate = readQuery(req.url, 'startDate') || '2026-03-29';
            const requestedEndDate = readQuery(req.url, 'endDate') || requestedStartDate;
            const dryRun = readQuery(req.url, 'dryRun') !== 'false';
            const currentMismatches = [...gameStatusMismatches];

            if (!dryRun) {
                gameStatusMismatches = [];
            }

            req.reply({
                statusCode: 200,
                body: ok({
                    startDate: requestedStartDate,
                    endDate: requestedEndDate,
                    dryRun,
                    totalGames: 5,
                    mismatchCount: currentMismatches.length,
                    repairedCount: currentMismatches.length,
                    mismatches: currentMismatches,
                    repairedGames: dryRun ? [] : repairedGames,
                }),
            });
        }).as('repairAdminGameStatusMismatches');

        cy.intercept('GET', '**/api/admin/client-errors/dashboard*', {
            statusCode: 200,
            body: ok({
                from: '2026-03-21T00:00:00Z',
                to: '2026-03-22T00:00:00Z',
                granularity: 'hour',
                totals: {
                    api: 12,
                    runtime: 4,
                    feedback: 2,
                    uniqueFingerprints: 3,
                    affectedRoutes: 2,
                },
                timeSeries: [
                    { bucketStart: '2026-03-21T22:00:00Z', api: 2, runtime: 1, feedback: 0 },
                    { bucketStart: '2026-03-21T23:00:00Z', api: 5, runtime: 2, feedback: 1 },
                ],
                topFingerprints: [
                    {
                        fingerprint: 'fp-api-1',
                        bucket: 'api',
                        source: 'api',
                        message: 'GET /api/admin/users failed',
                        route: '/admin',
                        endpoint: '/api/admin/users',
                        statusGroup: '5xx',
                        method: 'GET',
                        count: 5,
                        uniqueSessions: 3,
                        latestEventId: 'evt-api-1',
                        latestOccurredAt: '2026-03-22T00:00:00Z',
                        latestAlertSentAt: '2026-03-22T00:05:00Z',
                        latestAlertChannel: 'slack',
                    },
                ],
                recentFeedback: [
                    {
                        eventId: 'evt-api-1',
                        route: '/admin',
                        actionTaken: 'retry',
                        comment: '관리자 목록이 늦게 열립니다.',
                        occurredAt: '2026-03-22T00:02:00Z',
                    },
                ],
                recentAlerts: [
                    {
                        id: 1,
                        fingerprint: 'fp-api-1',
                        bucket: 'api',
                        source: 'api',
                        channel: 'slack',
                        route: '/admin',
                        statusGroup: '5xx',
                        observedCount: 5,
                        thresholdCount: 3,
                        windowMinutes: 5,
                        latestEventId: 'evt-api-1',
                        latestMessage: 'GET /api/admin/users failed',
                        latestOccurredAt: '2026-03-22T00:00:00Z',
                        notifiedAt: '2026-03-22T00:05:00Z',
                        deliveryStatus: 'SENT',
                        failureReason: null,
                    },
                ],
            }),
        }).as('getClientErrorDashboard');

        cy.intercept('GET', '**/api/admin/client-errors/events*', (req) => {
            const route = readQuery(req.url, 'route').trim();
            const search = readQuery(req.url, 'search').trim().toLowerCase();
            const bucket = readQuery(req.url, 'bucket').trim();

            const allEvents = [
                {
                    eventId: 'evt-api-1',
                    bucket: 'api',
                    source: 'api',
                    message: 'Gateway timeout in admin users API',
                    statusCode: 504,
                    statusGroup: '5xx',
                    responseCode: '504',
                    route: '/admin',
                    normalizedRoute: '/admin',
                    method: 'GET',
                    endpoint: '/api/admin/users',
                    normalizedEndpoint: '/api/admin/users',
                    fingerprint: 'fp-api-1',
                    occurredAt: '2026-03-22T00:00:00Z',
                    sessionId: 'sess-1',
                    userId: 3,
                    feedbackCount: 1,
                },
                {
                    eventId: 'evt-runtime-1',
                    bucket: 'runtime',
                    source: 'runtime',
                    message: 'TypeError in admin chart',
                    statusCode: null,
                    statusGroup: 'none',
                    responseCode: null,
                    route: '/admin',
                    normalizedRoute: '/admin',
                    method: null,
                    endpoint: null,
                    normalizedEndpoint: null,
                    fingerprint: 'fp-runtime-1',
                    occurredAt: '2026-03-22T00:10:00Z',
                    sessionId: 'sess-2',
                    userId: 3,
                    feedbackCount: 0,
                },
            ];

            const filteredEvents = allEvents.filter((event) => (
                (!bucket || event.bucket === bucket)
                && (!route || event.route.includes(route))
                && (!search || event.message.toLowerCase().includes(search) || event.eventId.toLowerCase().includes(search))
            ));

            req.reply({
                statusCode: 200,
                body: ok({
                    content: filteredEvents,
                    totalElements: filteredEvents.length,
                    totalPages: 1,
                    size: 20,
                    number: 0,
                    last: true,
                }),
            });
        }).as('getClientErrorEvents');

        cy.intercept('GET', '**/api/admin/client-errors/events/*', {
            statusCode: 200,
            body: ok({
                event: {
                    eventId: 'evt-api-1',
                    bucket: 'api',
                    source: 'api',
                    message: 'Gateway timeout in admin users API',
                    statusCode: 504,
                    statusGroup: '5xx',
                    responseCode: '504',
                    route: '/admin',
                    normalizedRoute: '/admin',
                    method: 'GET',
                    endpoint: '/api/admin/users',
                    normalizedEndpoint: '/api/admin/users',
                    fingerprint: 'fp-api-1',
                    occurredAt: '2026-03-22T00:00:00Z',
                    sessionId: 'sess-1',
                    userId: 3,
                    feedbackCount: 1,
                },
                stack: 'TypeError: Gateway timeout\n    at AdminPage.tsx:100',
                componentStack: 'in AdminPage\nin Suspense',
                feedback: [
                    {
                        eventId: 'evt-api-1',
                        route: '/admin',
                        actionTaken: 'retry',
                        comment: '관리자 목록이 늦게 열립니다.',
                        occurredAt: '2026-03-22T00:02:00Z',
                    },
                ],
                sameFingerprintRecentEvents: [
                    {
                        eventId: 'evt-api-older',
                        bucket: 'api',
                        source: 'api',
                        message: 'Earlier admin users timeout',
                        statusCode: 504,
                        statusGroup: '5xx',
                        responseCode: '504',
                        route: '/admin',
                        normalizedRoute: '/admin',
                        method: 'GET',
                        endpoint: '/api/admin/users',
                        normalizedEndpoint: '/api/admin/users',
                        fingerprint: 'fp-api-1',
                        occurredAt: '2026-03-21T23:30:00Z',
                        sessionId: 'sess-0',
                        userId: 3,
                        feedbackCount: 0,
                    },
                ],
            }),
        }).as('getClientErrorDetail');

        cy.intercept('GET', '**/api/admin/seat-views*', (req) => {
            const moderationStatus = readQuery(req.url, 'moderationStatus');
            const stadium = readQuery(req.url, 'stadium');

            const filteredSeatViews = seatViews.filter((seatView) => (
                (!moderationStatus || seatView.moderationStatus === moderationStatus)
                && (!stadium || seatView.stadium.includes(stadium))
            ));

            req.reply({
                statusCode: 200,
                body: ok(filteredSeatViews),
            });
        }).as('getAdminSeatViews');

        cy.intercept('GET', '**/api/admin/seat-views/*', (req) => {
            const seatViewId = Number(req.url.split('/').pop());
            req.reply({
                statusCode: 200,
                body: ok(seatViews.find((seatView) => seatView.id === seatViewId)),
            });
        }).as('getAdminSeatViewDetail');

        cy.intercept('PATCH', '**/api/admin/seat-views/*', (req) => {
            const seatViewId = Number(req.url.split('/').pop());
            seatViews = seatViews.map((seatView) => (
                seatView.id === seatViewId
                    ? {
                        ...seatView,
                        adminLabel: req.body.adminLabel,
                        moderationStatus: req.body.moderationStatus,
                        adminMemo: req.body.adminMemo ?? null,
                        reviewedBy: 3,
                        reviewedAt: '2026-03-22T11:00:00Z',
                    }
                    : seatView
            ));

            req.reply({
                statusCode: 200,
                body: ok(seatViews.find((seatView) => seatView.id === seatViewId)),
            });
        }).as('patchAdminSeatView');

        cy.intercept('GET', '**/api/admin/offseason/movements*', (req) => {
            const search = readQuery(req.url, 'search').trim().toLowerCase();
            const filteredMovements = search
                ? offseasonMovements.filter((movement) => (
                    movement.playerName.toLowerCase().includes(search)
                    || movement.summary.toLowerCase().includes(search)
                ))
                : offseasonMovements;

            req.reply({
                statusCode: 200,
                body: ok(filteredMovements),
            });
        }).as('getOffseasonMovements');

        cy.intercept('POST', '**/api/admin/offseason/movements', (req) => {
            const createdMovement: OffseasonMovementRecord = {
                id: 802,
                movementDate: req.body.movementDate,
                section: req.body.section,
                teamCode: req.body.teamCode,
                playerName: req.body.playerName,
                summary: req.body.summary ?? '',
                details: req.body.details ?? '',
                contractTerm: req.body.contractTerm ?? '',
                contractValue: req.body.contractValue ?? '',
                optionDetails: req.body.optionDetails ?? '',
                counterpartyTeam: req.body.counterpartyTeam ?? '',
                counterpartyDetails: req.body.counterpartyDetails ?? '',
                sourceLabel: req.body.sourceLabel ?? '',
                sourceUrl: req.body.sourceUrl ?? '',
                announcedAt: req.body.announcedAt ?? '',
                createdAt: '2026-03-22T12:00:00Z',
                updatedAt: '2026-03-22T12:00:00Z',
            };

            offseasonMovements = [createdMovement, ...offseasonMovements];
            req.reply({
                statusCode: 200,
                body: ok(createdMovement),
            });
        }).as('createOffseasonMovement');

        cy.intercept('PUT', '**/api/admin/offseason/movements/*', (req) => {
            const movementId = Number(req.url.split('/').pop());
            offseasonMovements = offseasonMovements.map((movement) => (
                movement.id === movementId
                    ? {
                        ...movement,
                        ...req.body,
                        updatedAt: '2026-03-22T12:30:00Z',
                    }
                    : movement
            ));

            req.reply({
                statusCode: 200,
                body: ok(offseasonMovements.find((movement) => movement.id === movementId)),
            });
        }).as('updateOffseasonMovement');

        cy.intercept('DELETE', '**/api/admin/offseason/movements/*', (req) => {
            const movementId = Number(req.url.split('/').pop());
            offseasonMovements = offseasonMovements.filter((movement) => movement.id !== movementId);

            req.reply({
                statusCode: 200,
                body: ok(true),
            });
        }).as('deleteOffseasonMovement');

        cy.intercept('GET', '**/api/stadiums', {
            statusCode: 200,
            body: stadiums,
        }).as('getAdminStadiums');

        cy.intercept('GET', '**/api/stadiums/*/places', (req) => {
            const stadiumId = req.url.split('/').slice(-2)[0];
            req.reply({
                statusCode: 200,
                body: placesByStadium[stadiumId] || [],
            });
        }).as('getStadiumPlaces');

        cy.intercept('POST', '**/api/admin/stadiums/*/places', (req) => {
            const stadiumId = req.url.split('/').slice(-2)[0];
            const stadiumName = stadiums.find((stadium) => stadium.stadiumId === stadiumId)?.stadiumName || stadiumId;
            const createdPlace = {
                id: 999,
                stadiumName,
                ...req.body,
            };

            placesByStadium[stadiumId] = [...(placesByStadium[stadiumId] || []), createdPlace];
            req.reply({
                statusCode: 200,
                body: ok(createdPlace),
            });
        }).as('createStadiumPlace');

        cy.intercept('PUT', '**/api/admin/stadiums/places/*', (req) => {
            const placeId = Number(req.url.split('/').pop());
            Object.keys(placesByStadium).forEach((stadiumId) => {
                placesByStadium[stadiumId] = placesByStadium[stadiumId].map((place) => (
                    place.id === placeId ? { ...place, ...req.body } : place
                ));
            });

            const updatedPlace = Object.values(placesByStadium).flat().find((place) => place.id === placeId);

            req.reply({
                statusCode: 200,
                body: ok(updatedPlace),
            });
        }).as('updateStadiumPlace');

        cy.intercept('DELETE', '**/api/admin/stadiums/places/*', (req) => {
            const placeId = Number(req.url.split('/').pop());
            Object.keys(placesByStadium).forEach((stadiumId) => {
                placesByStadium[stadiumId] = placesByStadium[stadiumId].filter((place) => place.id !== placeId);
            });

            req.reply({
                statusCode: 200,
                body: ok(true),
            });
        }).as('deleteStadiumPlace');

        cy.intercept('GET', '**/api/ai/release-decision/presets', {
            statusCode: 200,
            body: releasePresets,
        }).as('getReleasePresets');

        cy.intercept('GET', '**/api/ai/coach/auto-brief/ops/health*', {
            statusCode: 200,
            body: coachAutoBriefOpsHealth,
        }).as('getCoachAutoBriefOpsHealth');

        cy.intercept('POST', '**/api/ai/release-decision/draft', (req) => {
            req.reply({
                statusCode: 200,
                body: releaseDraftByScenario[req.body.scenario as keyof typeof releaseDraftByScenario],
            });
        }).as('postReleaseDraft');

        cy.intercept('GET', '**/api/ai/release-decision/eval-cases', {
            statusCode: 200,
            body: releaseEvalCases,
        }).as('getReleaseEvalCases');

        cy.intercept('POST', '**/api/ai/release-decision/evaluate', {
            statusCode: 200,
            body: {
                case: releaseEvalCases[0],
                evaluation: {
                    case_id: 'hotfix-check-1',
                    status: 'PASS',
                    decision_ok: true,
                    keyword_hits: {
                        클라이언트: true,
                        에러: true,
                    },
                    source_hits: {
                        'reports/client-errors.json': true,
                    },
                    missing_keywords: [],
                    missing_sources: [],
                },
            },
        }).as('postReleaseEvaluation');

        cy.intercept('GET', '**/api/ai/release-decision/artifacts', {
            statusCode: 200,
            body: releaseArtifacts,
        }).as('getReleaseArtifacts');

        cy.intercept('GET', '**/api/ai/release-decision/artifacts/*', {
            statusCode: 200,
            body: releaseArtifactDetail,
        }).as('getReleaseArtifactDetail');

        visitAdminPage();
        cy.get('[data-testid="admin-tab-users"]', { timeout: 20000 }).should('be.visible');
        cy.wait('@getAdminStats');
        cy.wait('@getAdminUsers');
    });

    it('covers users search, role changes, and permission failures', () => {
        cy.contains('FanUser').should('be.visible');

        cy.getBySel('admin-users-search').clear().type('FanUser');
        cy.wait('@getAdminUsers');
        cy.contains('FanUser').should('be.visible');
        cy.contains('ModUser').should('not.exist');

        selectOption('admin-user-role-trigger-11', '관리자');
        visibleAlertDialog().within(() => {
            cy.getBySel('admin-role-change-reason').type('운영 보조 권한 부여');
            cy.getBySel('admin-role-change-confirm').click();
        });

        cy.wait('@promoteAdminUser');
        cy.wait('@getAdminUsers');
        cy.contains('사용자를 관리자로 승격했습니다.').should('be.visible');
        cy.contains('관리자').should('be.visible');

        cy.getBySel('admin-users-search').clear().type('ModUser');
        cy.wait('@getAdminUsers');

        selectOption('admin-user-role-trigger-12', '일반 사용자');
        visibleAlertDialog().within(() => {
            cy.getBySel('admin-role-change-reason').type('권한 실패 테스트');
            cy.getBySel('admin-role-change-confirm').click();
        });

        cy.wait('@demoteAdminUser');
        cy.contains('SUPER_ADMIN 권한이 필요합니다.').should('be.visible');
    });

    it('covers game status mismatch diagnosis and repair workflow', () => {
        let createObjectUrlStub: sinon.SinonStub;

        cy.window().then((win) => {
            createObjectUrlStub = cy.stub(win.URL, 'createObjectURL').returns('blob:game-status-export');
        });

        cy.getBySel('admin-tab-game-status').click({ force: true });
        cy.wait('@getAdminGameStatusMismatches');
        cy.wait('@getAdminGameStatusRecommendationWindow');
        cy.contains('경기 상태 mismatch 진단 및 복구').should('be.visible');
        cy.getBySel('admin-game-status-mismatch-20260329HTSK0').should('be.visible');
        cy.contains('inning scores present').should('be.visible');
        cy.getBySel('admin-game-status-suggestion-2026-03-29').should('be.visible').click({ force: true });
        cy.wait('@getAdminGameStatusMismatches');
        cy.getBySel('admin-game-status-start-date').should('have.value', '2026-03-29');
        cy.getBySel('admin-game-status-end-date').should('have.value', '2026-03-29');
        cy.contains('불일치 1건을 찾았습니다.').should('be.visible');

        cy.getBySel('admin-game-status-diagnose').click({ force: true });
        cy.wait('@getAdminGameStatusMismatches');
        cy.contains('불일치 1건을 찾았습니다.').should('be.visible');
        cy.getBySel('admin-game-status-download-mismatches').click({ force: true });

        cy.getBySel('admin-game-status-dry-run').click({ force: true });
        cy.wait('@repairAdminGameStatusMismatches');
        cy.contains('dry-run 완료: mismatch 1건, 예상 복구 1건').should('be.visible');

        cy.getBySel('admin-game-status-apply').click({ force: true });
        visibleAlertDialog().within(() => {
            cy.contains('button', '복구 실행').click({ force: true });
        });

        cy.wait('@repairAdminGameStatusMismatches');
        cy.wait('@getAdminGameStatusMismatches');
        cy.wait('@getAdminGameStatusRecommendationWindow');
        cy.contains('실제 복구 완료: 1건 반영').should('be.visible');
        cy.contains('선택한 날짜 범위에서 경기 상태 불일치가 없습니다.').should('be.visible');
        cy.contains('최근 14일 범위에서 추천할 mismatch 날짜가 없습니다.').should('be.visible');
        cy.getBySel('admin-game-status-repaired-20260329HTSK0').should('be.visible');
        cy.getBySel('admin-game-status-download-repairs').click({ force: true });
        cy.wrap(null).then(() => {
            expect(createObjectUrlStub.callCount).to.eq(2);
        });
    });

    it('covers reports and client error operations', () => {
        cy.getBySel('admin-tab-reports').click();
        cy.wait('@getAdminReports');

        cy.getBySel('admin-reports-status-filter').select('PENDING');
        cy.wait('@getAdminReports');
        cy.getBySel('admin-reports-reason-filter').select('SPAM');
        cy.wait('@getAdminReports');
        cy.getBySel('admin-reports-reset-filters').click();
        cy.wait('@getAdminReports');

        cy.getBySel('admin-report-detail-501').click({ force: true });
        cy.wait('@getAdminReportDetail');
        cy.contains('Case #501').should('exist');
        cy.get('textarea[placeholder="조치 근거를 입력하세요."]').type('정책 위반으로 비공개 처리');
        cy.contains('button', 'TAKE_DOWN').click({ force: true });

        cy.wait('@patchAdminReport');
        cy.wait('@getAdminReports');
        cy.wait('@getAdminReportDetail');
        cy.contains('신고 케이스가 처리되었습니다.').should('be.visible');
        cy.contains('정책 위반으로 비공개 처리').should('be.visible');

        cy.getBySel('admin-tab-client-errors').click({ force: true });
        cy.wait('@getClientErrorDashboard');
        cy.wait('@getClientErrorEvents');
        cy.contains('클라이언트 에러 관제').should('be.visible');

        selectOption('admin-client-errors-window-trigger', '최근 1시간');
        cy.wait('@getClientErrorDashboard');
        cy.wait('@getClientErrorEvents');

        selectOption('admin-client-errors-bucket-trigger', 'API');
        cy.wait('@getClientErrorEvents');
        cy.getBySel('admin-client-errors-route-filter').type('/admin', { force: true });
        cy.wait('@getClientErrorEvents');
        cy.getBySel('admin-client-errors-search-filter').type('Gateway', { force: true });
        cy.wait('@getClientErrorEvents');

        cy.getBySel('admin-client-errors-refresh').click({ force: true });
        cy.wait('@getClientErrorDashboard');
        cy.wait('@getClientErrorEvents');

        cy.getBySel('admin-client-errors-detail-evt-api-1').click({ force: true });
        cy.wait('@getClientErrorDetail');
        cy.getBySel('admin-client-errors-detail-dialog').should('be.visible');
        cy.contains('Gateway timeout in admin users API').should('be.visible');
        cy.contains('TypeError: Gateway timeout').should('be.visible');
    });

    it('covers seat views and offseason management', () => {
        cy.getBySel('admin-tab-seat-views').click();
        cy.wait('@getAdminSeatViews');

        cy.getBySel('admin-seat-views-status-filter').select('PENDING');
        cy.wait('@getAdminSeatViews');
        cy.getBySel('admin-seat-views-stadium-filter').type('잠실');
        cy.wait('@getAdminSeatViews');

        cy.getBySel('admin-seat-view-detail-701').click({ force: true });
        cy.wait('@getAdminSeatViewDetail');
        cy.contains('Seat View #701').should('exist');
        cy.get('textarea[placeholder="분류 근거를 입력하세요."]').type('관리자 승인');
        cy.getBySel('admin-seat-view-approve-701').click({ force: true });

        cy.wait('@patchAdminSeatView');
        cy.wait('@getAdminSeatViews');
        cy.wait('@getAdminSeatViewDetail');
        cy.contains('시야뷰 후보가 처리되었습니다.').should('be.visible');
        cy.contains('APPROVED').should('be.visible');

        cy.getBySel('admin-tab-offseason').click({ force: true });
        cy.wait('@getOffseasonMovements');
        cy.contains('스토브리그 이동 관리').should('be.visible');

        cy.getBySel('admin-offseason-open-create').click({ force: true });
        cy.getBySel('admin-offseason-dialog').should('be.visible');
        cy.getBySel('admin-offseason-player-name').type('박신인');
        cy.getBySel('admin-offseason-summary').type('신인 계약 발표');
        cy.getBySel('admin-offseason-details').type('계약금과 옵션 조건 포함');
        cy.getBySel('admin-offseason-contract-term').type('1년');
        cy.getBySel('admin-offseason-contract-value').type('3억');
        cy.getBySel('admin-offseason-source-label').type('프런트 발표');
        cy.getBySel('admin-offseason-source-url').type('https://example.com/rookie');
        cy.getBySel('admin-offseason-dialog-submit').click({ force: true });

        cy.wait('@createOffseasonMovement');
        cy.wait('@getOffseasonMovements');
        cy.contains('박신인').should('be.visible');

        cy.getBySel('admin-offseason-edit-802').click({ force: true });
        cy.getBySel('admin-offseason-summary').clear().type('신인 계약 발표 수정');
        cy.getBySel('admin-offseason-dialog-submit').click({ force: true });

        cy.wait('@updateOffseasonMovement');
        cy.wait('@getOffseasonMovements');
        cy.contains('신인 계약 발표 수정').should('be.visible');

        cy.getBySel('admin-offseason-delete-802').click({ force: true });
        cy.getBySel('admin-offseason-delete-dialog').should('be.visible');
        cy.getBySel('admin-offseason-delete-confirm').click({ force: true });

        cy.wait('@deleteOffseasonMovement');
        cy.wait('@getOffseasonMovements');
        cy.contains('박신인').should('not.exist');
    });

    it('covers stadium place management and AI release decision tooling', () => {
        cy.getBySel('admin-tab-stadiums').click();
        cy.wait('@getAdminStadiums');
        cy.wait('@getStadiumPlaces');

        selectOption('admin-stadium-select-trigger', '대전 한화생명 이글스파크 (HH)');
        cy.wait('@getStadiumPlaces');
        cy.contains('이글스 카페').should('be.visible');

        cy.getBySel('admin-stadium-add-place').click();
        visibleDialog().within(() => {
            cy.get('input[placeholder="장소 이름"]').type('원정 라운지');
        });
        selectOption('admin-place-category-trigger', '음식점');
        visibleDialog().within(() => {
            cy.get('input[placeholder="도로명 주소"]').type('대전 중구 중앙로 10');
            cy.get('input[placeholder="02-1234-5678"]').type('042-555-1234');
            cy.get('input[placeholder="37.123456"]').clear().type('36.3201');
            cy.get('input[placeholder="126.987654"]').clear().type('127.4301');
            cy.contains('button', '추가').click();
        });

        cy.wait('@createStadiumPlace');
        cy.wait('@getStadiumPlaces');
        cy.contains('원정 라운지').should('be.visible');

        cy.getBySel('admin-place-edit-999').click();
        visibleDialog().within(() => {
            cy.get('input[placeholder="장소 이름"]').clear().type('원정 라운지 리뉴얼');
            cy.contains('button', '저장').click();
        });

        cy.wait('@updateStadiumPlace');
        cy.wait('@getStadiumPlaces');
        cy.contains('원정 라운지 리뉴얼').should('be.visible');

        cy.getBySel('admin-place-delete-999').click();
        visibleAlertDialog().within(() => {
            cy.contains('button', '삭제').click();
        });

        cy.wait('@deleteStadiumPlace');
        cy.wait('@getStadiumPlaces');
        cy.contains('원정 라운지 리뉴얼').should('not.exist');

        let createObjectUrlStub: sinon.SinonStub;

        cy.window().then((win) => {
            createObjectUrlStub = cy.stub(win.URL, 'createObjectURL').returns('blob:test-download');
        });

        cy.getBySel('admin-tab-ai').click();
        cy.wait('@getCoachAutoBriefOpsHealth');
        cy.wait('@getReleasePresets');
        cy.wait('@getReleaseEvalCases');
        cy.wait('@getReleaseArtifacts');
        cy.contains('Coach Auto Brief Ops').should('be.visible');
        cy.contains('FAILED_LOCKED').should('be.visible');
        cy.getBySel('admin-ai-auto-brief-unresolved-20260408KTLG0').should('be.visible');
        cy.contains('reports/coach_auto_brief_prewarm_2026-04-08.json').should('be.visible');
        cy.contains('릴리즈 결정 초안 생성').should('be.visible');

        cy.getBySel('admin-ai-refresh-presets').click();
        cy.wait('@getReleasePresets');
        selectOption('admin-ai-scenario-trigger', 'hotfix-check');
        cy.contains('docs/hotfix.md').should('be.visible');

        cy.getBySel('admin-ai-generate-draft').click();
        cy.wait('@postReleaseDraft');
        cy.contains('핫픽스 검토').should('be.visible');
        cy.contains('NO_GO').should('be.visible');

        cy.getBySel('admin-ai-refresh-eval-cases').click();
        cy.wait('@getReleaseEvalCases');
        selectOption('admin-ai-eval-case-trigger', 'hotfix-check-1');
        cy.getBySel('admin-ai-run-eval').click();

        cy.wait('@postReleaseEvaluation');
        cy.contains('PASS').should('be.visible');

        cy.getBySel('admin-ai-refresh-artifacts').click();
        cy.wait('@getReleaseArtifacts');
        cy.getBySel('admin-ai-load-artifact-artifact-hotfix-001').click();

        cy.wait('@getReleaseArtifactDetail');
        cy.contains('저장된 아티팩트를 불러왔습니다: artifact-hotfix-001').should('be.visible');

        cy.getBySel('admin-ai-download-markdown-artifact-hotfix-001').click();
        cy.wait('@getReleaseArtifactDetail');
        cy.getBySel('admin-ai-download-json-artifact-hotfix-001').click();
        cy.wait('@getReleaseArtifactDetail');
        cy.wrap(null).then(() => {
            expect(createObjectUrlStub.callCount).to.eq(2);
        });
    });
});
