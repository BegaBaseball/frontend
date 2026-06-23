/// <reference types="cypress" />

type DiaryEntry = {
    id: number;
    date: string;
    type: 'attended' | 'scheduled';
    emoji: string;
    emojiName: string;
    winningName: 'WIN' | 'LOSE' | 'DRAW' | '' | null;
    gameId: number;
    memo: string;
    photos: string[];
    team: string;
    stadium: string;
    section?: string;
    block?: string;
    seatRow?: string;
    seatNumber?: string;
    ticketVerified?: boolean;
};

const defaultEmoji = '/emojis/happy.png';
const lightsOutDarkSurfaceToken = '0 0% 0%';
const lightsOutDarkSurfaceColor = 'rgb(0, 0, 0)';
const lightsOutTextColor = 'rgb(255, 255, 255)';

const buildStatistics = (overrides: Record<string, unknown> = {}) => ({
    totalCount: 1,
    totalWins: 1,
    totalLosses: 0,
    totalDraws: 0,
    winRate: 100,
    monthlyCount: 1,
    yearlyCount: 1,
    yearlyWins: 1,
    yearlyWinRate: 100,
    mostVisitedStadium: '대전',
    mostVisitedCount: 1,
    happiestMonth: '5월',
    happiestCount: 1,
    firstDiaryDate: '2024-05-10',
    cheerPostCount: 2,
    mateParticipationCount: 1,
    currentWinStreak: 1,
    longestWinStreak: 3,
    currentLossStreak: 0,
    opponentWinRates: {
        삼성: {
            wins: 1,
            losses: 0,
            draws: 0,
            winRate: 100,
        },
    },
    bestOpponent: '삼성',
    worstOpponent: '삼성',
    dayOfWeekStats: {
        금: {
            count: 1,
            wins: 1,
            winRate: 100,
        },
    },
    luckyDay: '금요일',
    earnedBadges: ['첫 직관'],
    ...overrides,
});

const gameOptions = [
    {
        id: 101,
        homeTeam: '한화',
        awayTeam: '삼성',
        stadium: '대전',
        date: '2024-05-15',
        score: '5:2',
    },
    {
        id: 102,
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실',
        date: '2024-05-16',
    },
];

const seedDiaryEntry = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({
    id: 1,
    date: '2024-05-10',
    type: 'attended',
    emoji: defaultEmoji,
    emojiName: '최고',
    winningName: 'WIN',
    gameId: 101,
    memo: 'Original content',
    photos: [],
    team: '한화 vs 삼성',
    stadium: '대전',
    section: '1루 레드석',
    block: '101블록',
    seatRow: '5열',
    seatNumber: '12번',
    ticketVerified: false,
    ...overrides,
});

const uploadFixtureFiles = (
    selector: string,
    count = 1,
    prefix = 'diary-photo',
) => {
    cy.fixture('tiny-image.base64').then((base64) => {
        const contents = Cypress.Buffer.from(base64, 'base64');
        const files = Array.from({ length: count }, (_, index) => ({
            contents,
            fileName: `${prefix}-${index + 1}.png`,
            mimeType: 'image/png',
            lastModified: Date.now() + index,
        }));

        cy.getBySel(selector).selectFile(files, { force: true });
    });
};

const interceptDiaryMediaUploads = () => {
    let nextAssetId = 9100;

    cy.intercept('POST', '**/api/media/uploads/init', (req) => {
        expect(req.body.domain).to.eq('DIARY');
        const assetId = nextAssetId++;
        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: {
                    assetId,
                    uploadUrl: `https://object.example.com/upload/diary-${assetId}`,
                    stagingObjectKey: `media/staging/diary/123/${assetId}-${req.body.fileName}`,
                    expiresAt: '2026-04-14T00:00:00Z',
                    requiredHeaders: {
                        'Content-Type': req.body.contentType || 'image/png',
                    },
                },
            },
        });
    }).as('initDiaryMediaUpload');

    cy.intercept('PUT', 'https://object.example.com/upload/diary-*', {
        statusCode: 200,
        body: '',
    }).as('putDiaryMediaUpload');

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
    }).as('finalizeDiaryMediaUpload');
};

const expectToast = (message: string) => {
    cy.contains('[role="status"]', message, { timeout: 10000 }).should('be.visible');
};

describe('Personal Diary', () => {
    let diaryEntries: DiaryEntry[];
    let diaryStatistics: Record<string, unknown>;

    const visitMyPage = (path = '/mypage?view=diaryEditor&date=2024-05-15') => {
        cy.visit(path);
        cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
        cy.contains('직관 기록').should('be.visible');
        cy.wait('@getDiaries', { timeout: 15000 });
    };

    const visitSeasonLog = () => {
        cy.visit('/mypage');
        cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
        cy.contains('시즌 로그').should('be.visible');
        cy.wait('@getDiaries', { timeout: 15000 });
    };

    beforeEach(() => {
        const now = new Date('2024-05-15T12:00:00').getTime();
        cy.clock(now, ['Date']);

        cy.login('user');
        cy.mockAPI();

        diaryEntries = [
            seedDiaryEntry({
                id: 1,
                date: '2024-05-10',
                memo: 'Original content',
            }),
        ];
        diaryStatistics = buildStatistics();

        cy.intercept('GET', '**/api/diary/entries*', (req) => {
            req.reply({
                statusCode: 200,
                body: diaryEntries,
            });
        }).as('getDiaries');

        cy.intercept('GET', '**/api/diary/games*', {
            statusCode: 200,
            body: gameOptions,
        }).as('getGames');

        cy.intercept('GET', '**/api/diary/statistics*', (req) => {
            req.reply({
                statusCode: 200,
                body: diaryStatistics,
            });
        }).as('getDiaryStats');

        cy.intercept('GET', '**/api/kbo/league-start-dates*', {
            statusCode: 200,
            body: {
                regularSeasonStart: '2025-03-22',
                postseasonStart: '2025-10-06',
                koreanSeriesStart: '2025-10-26',
            },
        }).as('getLeagueDatesLocal');
    });

    it('displays the calendar', () => {
        visitMyPage();

        cy.contains('년').should('be.visible');
        cy.contains('월').should('be.visible');
        cy.get('button').filter('.border.rounded-lg').should('have.length.at.least', 28);
    });

    it('uses the lights out dark surface tone inside the diary editor', () => {
        visitMyPage();

        cy.document().should((document) => {
            const style = getComputedStyle(document.documentElement);
            expect(style.getPropertyValue('--surface-app-dark').trim()).to.eq(lightsOutDarkSurfaceToken);
            expect(style.getPropertyValue('--surface-panel-dark').trim()).to.eq(lightsOutDarkSurfaceToken);
            expect(style.getPropertyValue('--surface-panel-raised-dark').trim()).to.eq(lightsOutDarkSurfaceToken);
        });
        cy.get('.mypage-season-root').should(($root) => {
            const style = getComputedStyle($root[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.color).to.eq(lightsOutTextColor);
        });
        cy.getBySel('diary-editor-calendar-card').should(($card) => {
            const style = getComputedStyle($card[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.borderTopColor).to.eq('rgba(138, 159, 153, 0.16)');
        });
        cy.getBySel('diary-editor-form-card').should(($card) => {
            const style = getComputedStyle($card[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
        });
        cy.get('.diary-green-surface select').should(($select) => {
            const style = getComputedStyle($select[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.color).to.eq(lightsOutTextColor);
        });
        cy.get('.diary-green-surface textarea').should(($textarea) => {
            const style = getComputedStyle($textarea[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.color).to.eq(lightsOutTextColor);
        });
        cy.getBySel('diary-editor-seat-panel').should(($panel) => {
            const style = getComputedStyle($panel[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.borderTopColor).to.eq('rgba(138, 159, 153, 0.16)');
        });
    });

    it('opens the diary editor from the default season log', () => {
        visitSeasonLog();

        cy.location('search').should('eq', '');
        cy.contains('2024 시즌 로그').should('be.visible');
        cy.getBySel('mypage-season-write-cta').click();
        cy.url().should('include', 'view=diaryEditor');
        cy.url().should('include', 'date=2024-05-15');
        cy.contains('5월 15일 직관 기록').should('be.visible');
    });

    it('scrolls and highlights a timeline entry from the heatmap', () => {
        visitSeasonLog();

        cy.getBySel('mypage-season-heatmap').should('be.visible');
        cy.getBySel('mypage-season-heatmap-cell').first().click();
        cy.get('#mypage-log-entry-1').should('have.class', 'is-flash');
    });

    it('does not post when saving without a selected game', () => {
        diaryEntries = [];
        let saveCalled = false;
        cy.intercept('POST', '**/api/diary/save*', (req) => {
            saveCalled = true;
            req.reply({ statusCode: 500, body: {} });
        }).as('unexpectedSaveDiary');

        visitMyPage();

        cy.getBySel('day-15').click({ force: true });
        cy.wait('@getGames');
        cy.getBySel('save-diary-btn').click();

        expectToast('경기를 선택해주세요.');
        cy.then(() => {
            expect(saveCalled).to.eq(false);
        });
    });

    it('does not post an attended diary without a winning result', () => {
        diaryEntries = [];
        let saveCalled = false;
        cy.intercept('POST', '**/api/diary/save*', (req) => {
            saveCalled = true;
            req.reply({ statusCode: 500, body: {} });
        }).as('unexpectedSaveDiary');

        visitMyPage();

        cy.getBySel('day-15').click({ force: true });
        cy.wait('@getGames');
        cy.get('select').select('101');
        cy.getBySel('save-diary-btn').click();

        expectToast('승패를 선택해주세요.');
        cy.then(() => {
            expect(saveCalled).to.eq(false);
        });
    });

    it('creates a scheduled diary record', () => {
        diaryEntries = [];

        cy.intercept('POST', '**/api/diary/save*', (req) => {
            expect(req.body.type).to.eq('scheduled');
            expect(req.body.gameId).to.eq(101);
            expect([null, '']).to.include(req.body.winningName);
            expect(req.body.photos).to.deep.equal([]);
            expect(req.body.memo).to.eq('');
            expect(req.body.ticketVerificationToken).to.eq(undefined);
            diaryEntries = [
                seedDiaryEntry({
                    id: 20,
                    date: '2024-05-15',
                    type: 'scheduled',
                    winningName: null,
                    memo: '',
                    team: '한화 vs 삼성',
                    ticketVerified: false,
                }),
            ];
            req.reply({
                statusCode: 201,
                body: { id: 20, date: '2024-05-15', type: 'scheduled' },
            });
        }).as('saveScheduledDiary');

        visitMyPage();

        cy.getBySel('day-15').click({ force: true });
        cy.wait('@getGames');

        cy.contains('button', '직관 예정').click();
        cy.get('textarea').should('be.disabled');
        cy.get('select').select('101');
        cy.getBySel('save-diary-btn').click();

        cy.wait('@saveScheduledDiary');
        expectToast('다이어리가 작성되었습니다');
        cy.getBySel('day-15').find('img').should('be.visible');
    });

    it('supports ticket scan autofill, multi-photo upload, and seat-view submission', () => {
        diaryEntries = [];
        diaryStatistics = buildStatistics({
            totalCount: 2,
            totalWins: 2,
            yearlyCount: 2,
            yearlyWins: 2,
        });

        cy.intercept('POST', '**/api/tickets/analyze', {
            statusCode: 200,
            body: {
                date: '2024-05-15',
                time: '18:30',
                stadium: '대전',
                homeTeam: '한화',
                awayTeam: '삼성',
                section: '1루 레드석',
                row: '5열',
                seat: '12번',
                peopleCount: 1,
                price: 22000,
                reservationNumber: 'ABC123',
                gameId: 101,
                verificationToken: 'ticket-verified-123',
            },
        }).as('analyzeTicket');

        cy.intercept('POST', '**/api/diary/save*', (req) => {
            expect(req.body.type).to.eq('attended');
            expect(req.body.gameId).to.eq(101);
            expect(req.body.ticketVerificationToken).to.eq('ticket-verified-123');
            expect(req.body.section).to.eq('1루 레드석');
            expect(req.body.seatRow).to.eq('5열');
            expect(req.body.seatNumber).to.eq('12번');
            req.reply({
                statusCode: 201,
                body: { id: 41, date: '2024-05-15', type: 'attended', ticketVerified: true },
            });
        }).as('saveDiary');

        interceptDiaryMediaUploads();

        cy.intercept('POST', '**/api/diary/41/seat-view-candidates', (req) => {
            expect(req.body.storagePaths).to.have.length(3);
            expect(req.body.sourceTypes).to.deep.equal(['TICKET_SCAN', 'DIARY_UPLOAD', 'DIARY_UPLOAD']);
            req.reply({
                statusCode: 200,
                body: {
                    data: {
                        candidates: [
                            {
                                id: 9001,
                                storagePath: req.body.storagePaths[1],
                                previewUrl: 'https://cdn.example.com/media/diary/123/9101.webp',
                                sourceType: 'DIARY_UPLOAD',
                                aiSuggestedLabel: 'SEAT_VIEW',
                                aiConfidence: 0.93,
                                shareEligible: true,
                            },
                            {
                                id: 9002,
                                storagePath: req.body.storagePaths[0],
                                previewUrl: 'https://cdn.example.com/media/diary/123/9100.webp',
                                sourceType: 'TICKET_SCAN',
                                aiSuggestedLabel: 'TICKET',
                                aiConfidence: 0.99,
                                shareEligible: false,
                            },
                        ],
                    },
                },
            });
        }).as('createSeatViewCandidates');

        cy.intercept('POST', '**/api/diary/41/modify*', (req) => {
            expect(req.body.photos).to.have.length(3);
            expect(req.body.photos.every((photo: string) => photo.startsWith('media/diary/123/'))).to.eq(true);
            expect(req.body.ticketVerificationToken).to.eq(undefined);
            req.reply({
                statusCode: 200,
                body: { success: true },
            });
        }).as('updateDiaryAfterUpload');

        cy.intercept('POST', '**/api/diary/41/seat-view-selections*', (req) => {
            expect(req.body.candidateIds).to.deep.equal([9001]);
            diaryEntries = [
                seedDiaryEntry({
                    id: 41,
                    date: '2024-05-15',
                    memo: '티켓 스캔과 사진 업로드를 함께 테스트합니다.',
                    photos: [
                        'https://cdn.example.com/media/diary/123/9100.webp',
                        'https://cdn.example.com/media/diary/123/9101.webp',
                        'https://cdn.example.com/media/diary/123/9102.webp',
                    ],
                    ticketVerified: true,
                }),
            ];
            req.reply({
                statusCode: 200,
                body: {
                    candidates: [
                        {
                            id: 9001,
                            storagePath: 'seat-view-1',
                            previewUrl: '/uploads/diary-photo-1.png',
                            sourceType: 'DIARY_UPLOAD',
                            aiSuggestedLabel: 'SEAT_VIEW',
                            aiConfidence: 0.93,
                            shareEligible: true,
                        },
                    ],
                },
            });
        }).as('submitSeatViewSelections');

        visitMyPage();

        cy.getBySel('day-15').click({ force: true });
        cy.wait('@getGames');

        uploadFixtureFiles('diary-ticket-scan-input', 1, 'ticket-scan');
        cy.wait('@analyzeTicket');

        cy.contains('티켓 인증 준비됨').should('be.visible');
        cy.get('input[placeholder="구역 (예: 1루 레드석)"]').should('have.value', '1루 레드석');
        cy.get('input[placeholder="열 (예: 5열)"]').should('have.value', '5열');
        cy.get('input[placeholder="번 (예: 13번)"]').should('have.value', '12번');

        uploadFixtureFiles('diary-photo-upload-input', 2, 'diary-photo');
        cy.contains('티켓').should('be.visible');
        cy.contains('일반').should('be.visible');

        cy.get('button').contains('최고').click();
        cy.get('select').select('101');
        cy.contains('button', '승').click();
        cy.get('textarea').type('티켓 스캔과 사진 업로드를 함께 테스트합니다.');
        cy.getBySel('save-diary-btn').click();

        cy.wait('@saveDiary');
        for (let i = 0; i < 3; i += 1) {
            cy.wait('@initDiaryMediaUpload');
        }
        for (let i = 0; i < 3; i += 1) {
            cy.wait('@putDiaryMediaUpload');
        }
        for (let i = 0; i < 3; i += 1) {
            cy.wait('@finalizeDiaryMediaUpload');
        }
        cy.wait('@createSeatViewCandidates');
        cy.wait('@updateDiaryAfterUpload');
        cy.contains('AI 추천 시야뷰 확인').should('be.visible');
        cy.getBySel('diary-seat-view-dialog').should(($dialog) => {
            const style = getComputedStyle($dialog[0]);
            expect(style.backgroundColor).to.eq(lightsOutDarkSurfaceColor);
            expect(style.color).to.eq(lightsOutTextColor);
            expect(style.borderTopColor).to.eq('rgba(138, 159, 153, 0.16)');
        });
        cy.getBySel('diary-seat-view-submit-button').click();

        cy.wait('@submitSeatViewSelections');
        expectToast('시야뷰가 검토 대기 상태로 제출되었습니다');
        expectToast('다이어리가 작성되었습니다');
        cy.getBySel('day-15').find('img').should('be.visible');
    });

    it('allows skipping seat-view sharing after photo upload', () => {
        diaryEntries = [];

        cy.intercept('POST', '**/api/diary/save*', (req) => {
            diaryEntries = [
                seedDiaryEntry({
                    id: 51,
                    date: '2024-05-15',
                    memo: '공유는 이번에 건너뜁니다.',
                    photos: ['https://cdn.example.com/media/diary/123/9100.webp'],
                    ticketVerified: false,
                }),
            ];
            req.reply({
                statusCode: 201,
                body: { id: 51, date: '2024-05-15', type: 'attended' },
            });
        }).as('saveDiaryWithSkip');

        interceptDiaryMediaUploads();

        cy.intercept('POST', '**/api/diary/51/seat-view-candidates', (req) => {
            expect(req.body.storagePaths).to.have.length(1);
            expect(req.body.sourceTypes).to.deep.equal(['DIARY_UPLOAD']);
            req.reply({
                statusCode: 200,
                body: {
                    data: {
                        candidates: [
                            {
                                id: 9101,
                                storagePath: req.body.storagePaths[0],
                                previewUrl: 'https://cdn.example.com/media/diary/123/9100.webp',
                                sourceType: 'DIARY_UPLOAD',
                                aiSuggestedLabel: 'SEAT_VIEW',
                                aiConfidence: 0.88,
                                shareEligible: true,
                            },
                        ],
                    },
                },
            });
        }).as('createSeatViewCandidatesForSkip');

        cy.intercept('POST', '**/api/diary/51/modify*', (req) => {
            expect(req.body.photos).to.deep.equal(['media/diary/123/9100.webp']);
            req.reply({
                statusCode: 200,
                body: { success: true },
            });
        }).as('updateDiaryForSkip');

        cy.intercept('POST', '**/api/diary/51/seat-view-selections*', (req) => {
            expect(req.body.candidateIds).to.deep.equal([]);
            req.reply({
                statusCode: 200,
                body: {
                    candidates: [],
                },
            });
        }).as('skipSeatViewSelections');

        visitMyPage();

        cy.getBySel('day-15').click({ force: true });
        cy.wait('@getGames');

        uploadFixtureFiles('diary-photo-upload-input', 1, 'skip-share');
        cy.get('button').contains('최고').click();
        cy.get('select').select('101');
        cy.contains('button', '승').click();
        cy.get('textarea').type('공유는 이번에 건너뜁니다.');
        cy.getBySel('save-diary-btn').click();

        cy.wait('@saveDiaryWithSkip');
        cy.wait('@initDiaryMediaUpload');
        cy.wait('@putDiaryMediaUpload');
        cy.wait('@finalizeDiaryMediaUpload');
        cy.wait('@createSeatViewCandidatesForSkip');
        cy.wait('@updateDiaryForSkip');
        cy.contains('AI 추천 시야뷰 확인').should('be.visible');
        cy.getBySel('diary-seat-view-skip-button').click({ force: true });
        cy.wait('@skipSeatViewSelections');

        cy.contains('AI 추천 시야뷰 확인').should('not.exist');
        cy.getBySel('day-15').find('img').should('be.visible');
    });

    it('allows modifying and deleting a record', () => {
        visitMyPage();

        cy.intercept('POST', '**/api/diary/save*', (req) => {
            expect(req.body.memo).to.eq('Fresh content');
            diaryEntries = [
                seedDiaryEntry({
                    id: 1,
                    date: '2024-05-10',
                    memo: 'Original content',
                }),
                seedDiaryEntry({
                    id: 61,
                    date: '2024-05-15',
                    memo: 'Fresh content',
                }),
            ];
            req.reply({
                statusCode: 201,
                body: { id: 61, date: '2024-05-15', type: 'attended' },
            });
        }).as('saveDiaryForEditDelete');

        cy.contains('5월 15일 직관 기록').should('be.visible');
        cy.get('button').contains('최고').click();
        cy.get('select').select('101');
        cy.contains('button', '승').click();
        cy.get('textarea').type('Fresh content');
        cy.getBySel('save-diary-btn').click();

        cy.wait('@saveDiaryForEditDelete');
        cy.wait('@getDiaries');
        expectToast('다이어리가 작성되었습니다');
        cy.getBySel('day-15').find('img').should('be.visible');
        cy.getBySel('diary-memo').should('contain', 'Fresh content');

        cy.intercept('POST', '**/api/diary/*/modify*', (req) => {
            expect(req.body.memo).to.eq('Modified content!');
            diaryEntries = [
                seedDiaryEntry({
                    id: 1,
                    date: '2024-05-10',
                    memo: 'Original content',
                }),
                seedDiaryEntry({
                    id: 61,
                    date: '2024-05-15',
                    memo: 'Modified content!',
                }),
            ];
            req.reply({
                statusCode: 200,
                body: { success: true },
            });
        }).as('updateDiary');

        cy.getBySel('edit-diary-btn').click();
        cy.get('textarea').should('have.value', 'Fresh content');
        cy.get('textarea').clear().type('Modified content!');
        cy.getBySel('save-diary-btn').click();

        cy.wait('@updateDiary');
        cy.wait('@getDiaries');
        expectToast('다이어리가 수정되었습니다');
        cy.getBySel('diary-memo').should('contain', 'Modified content!');

        cy.intercept('POST', '**/api/diary/*/delete*', {
            statusCode: 200,
            body: { success: true },
        }).as('deleteDiary');

        diaryEntries = [
            seedDiaryEntry({
                id: 1,
                date: '2024-05-10',
                memo: 'Original content',
            }),
        ];

        cy.getBySel('delete-diary-btn').should('be.visible').click();
        cy.get('[role="alertdialog"], [role="dialog"]').filter(':visible').last().should('be.visible');
        cy.get('[role="alertdialog"], [role="dialog"]').filter(':visible').last().contains('button', '삭제').click();

        cy.wait('@deleteDiary').then(({ request }) => {
            expect(request.url).to.include('/61/delete');
        });
        expectToast('다이어리가 삭제되었습니다');
        cy.get('@deleteDiary.all').should('have.length', 1);
    });

    it('toggles to the statistics view and renders diary analytics', () => {
        visitMyPage();

        cy.getBySel('mypage-toggle-stats').scrollIntoView({ offset: { top: -160, left: 0 } }).click();
        cy.wait('@getDiaryStats');

        cy.get('[data-screen-label="나의 기록"]').within(() => {
            cy.contains('h1', '나의 기록').should('be.visible');
            cy.contains('직관').should('be.visible');
            cy.contains('구장 방문').should('be.visible');
            cy.contains('상대팀별 전적').should('be.visible');
            cy.contains('직관 기분').should('be.visible');
        });
        cy.contains('상세 기록').should('not.exist');
    });
});
