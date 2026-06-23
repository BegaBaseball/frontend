/// <reference types="cypress" />

describe('My Page (User Profile)', () => {
    const uploadedProfileImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2X5ZkAAAAASUVORK5CYII=';
    const existingProfileImage = '/mock/existing-avatar.gif';
    const existingProfileImageBody =
        Cypress.Buffer.from('R0lGODdhAQABAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

    type AuthStateUserFixture = {
        id: number;
        email: string;
        name: string;
        handle: string;
        role: string;
        favoriteTeam: string;
        profileImageUrl: string | null;
        hasPassword: boolean;
    };

    const createAuthState = (userOverrides: Partial<AuthStateUserFixture> = {}) => ({
        state: {
            user: {
                ...authStateUser,
                ...userOverrides,
            },
            isLoggedIn: true,
            isAdmin: false,
        },
        version: 0,
    });

    const authStateUser: AuthStateUserFixture = {
        id: 123,
        email: 'test@example.com',
        name: 'TestUser',
        handle: '@testuser',
        role: 'ROLE_USER',
        favoriteTeam: 'HH',
        profileImageUrl: null,
        hasPassword: true,
    };

    const authState = createAuthState();
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

    const openSettingsHome = () => {
        cy.contains('button', '설정').click();
        cy.url().should('include', 'view=settings');
        cy.contains('button', '프로필 정보').should('be.visible');
    };

    const openProfileEditPage = () => {
        openSettingsHome();
        cy.contains('button', '프로필 정보').click();
        cy.url().should('include', 'view=editProfile');
        cy.contains('내 정보 수정').should('be.visible');
    };

    const openAccountSettingsPage = () => {
        openSettingsHome();
        cy.contains('button', '계정 설정').click();
        cy.url().should('include', 'view=accountSettings');
    };

    const openBlockedUsersPage = () => {
        openSettingsHome();
        cy.contains('button', '차단한 사용자').click();
        cy.url().should('include', 'view=blockedUsers');
    };

    const openPasswordChangePage = () => {
        openSettingsHome();
        cy.contains('button', '비밀번호 변경').click();
        cy.url().should('include', 'view=changePassword');
    };

    const openPasswordChangeFromProfileEdit = () => {
        cy.contains('button', '비밀번호 변경').click();
        cy.contains('button', '안전하게 진행').should('be.visible').click();
        cy.url().should('include', 'view=changePassword');
    };

    const bootstrapAuthenticatedWindow = (win: Window, nextAuthState = authState) => {
        const originalAddEventListener = win.addEventListener.bind(win);
        win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'auth-session-expired' || type === 'global-api-error') {
                return;
            }
            return originalAddEventListener(type, listener, options);
        }) as typeof win.addEventListener;
        win.localStorage.setItem('auth-storage', JSON.stringify(nextAuthState));
        win.localStorage.setItem('accessToken', 'fake-access-token');
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    const visitMyPage = (nextAuthState = authState) => {
        cy.visit('/mypage', {
            onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win, nextAuthState),
        });
    };

    const expectNoPageHorizontalOverflow = () => {
        cy.document().then((doc) => {
            const root = doc.documentElement;
            expect(root.scrollWidth).to.be.lte(root.clientWidth + 2);
        });
    };

    const expectGridColumnCount = (selector: string, count: number) => {
        cy.get(selector).should(($grid) => {
            const columns = getComputedStyle($grid[0]).gridTemplateColumns.split(' ').filter(Boolean);
            expect(columns).to.have.length(count);
        });
    };

    beforeEach(() => {
        cy.mockAPI();

        cy.intercept('GET', existingProfileImage, {
            statusCode: 200,
            headers: {
                'content-type': 'image/gif',
            },
            body: existingProfileImageBody,
        }).as('getExistingProfileImage');

        // Providers mock for account settings
        cy.intercept('GET', '**/api/auth/providers', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { provider: 'GOOGLE', connected: true, email: 'test@google.com' },
                    { provider: 'KAKAO', connected: false }
                ]
            }
        }).as('getProviders');

        // Ensure default mypage mock is available
        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 200,
            body: {
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
                }
            }
        }).as('getMeInitial');

        cy.intercept('GET', '**/api/cheer/me/posts*', {
            statusCode: 200,
            body: {
                content: [myCheerPost],
                last: true,
                totalPages: 1,
                totalElements: 1,
                size: 10,
                number: 0,
            },
        }).as('getMyCheerPosts');

        visitMyPage();
        // Note: getMeInitial alias may not fire when commands.ts mockAPI registers
        // an overlapping `**/auth/mypage*` intercept first; LIFO matching prefers the
        // later (test-local) intercept but its alias is occasionally not bound in time.
        // Content-based readiness wait below is sufficient and more robust.
        cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
    });

    describe('Profile Management', () => {
        it('should show default avatar when profile image is not set', () => {
            cy.get('img[alt="Profile"]').should('not.exist');
            cy.get('[data-testid="profile-avatar-fallback"]').should('exist');
            cy.get('[data-testid="mypage-season-sidebar-record-cta"]', { timeout: 20000 }).should('be.visible');
        });

        it('should show default avatar when profile image response is empty string', () => {
            cy.intercept(
                'GET',
                '**/api/auth/mypage*',
                {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            id: 123,
                            email: 'test@example.com',
                            name: 'TestUser',
                            handle: 'testuser',
                            favoriteTeam: 'HH',
                            role: 'ROLE_USER',
                            profileImageUrl: '',
                        },
                    },
                }
            ).as('getMeEmptyImage');

            visitMyPage();
            cy.wait(500);

            cy.get('[data-testid="profile-avatar-fallback"]').should('exist');
            cy.get('img[alt="Profile"]').should('not.exist');
        });

        it('should display user information', () => {
            cy.contains('TestUser').should('be.visible');
            cy.contains('@testuser').should('be.visible');
            cy.get('[data-testid="mypage-favorite-team-logo"]').should('be.visible');
            cy.contains('P').should('be.visible');
        });

        it('should apply uploaded image immediately after save', () => {
            const updatedProfileImage = '/mock/profile-avatar.svg';
            const uploadedProfileStoragePath = 'media/profile/123/31.webp';

            cy.intercept('GET', updatedProfileImage, {
                statusCode: 200,
                headers: {
                    'content-type': 'image/svg+xml',
                },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#16a34a"/></svg>',
            }).as('getUpdatedProfileImage');

            cy.intercept('GET', '**/api/auth/mypage*', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        id: 123,
                        email: 'test@example.com',
                        name: 'TestUser',
                        handle: 'testuser',
                        favoriteTeam: 'HH',
                        role: 'ROLE_USER',
                        profileImageUrl: updatedProfileImage,
                    },
                },
            }).as('getMeWithUpdatedImage');

            cy.intercept('POST', '**/api/media/uploads/init', (req) => {
                expect(req.body.domain).to.eq('PROFILE');
                req.reply({
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            assetId: 31,
                            uploadUrl: 'https://object.example.com/upload/profile-31',
                            stagingObjectKey: 'media/staging/profile/123/31-avatar.png',
                            expiresAt: '2026-04-14T00:00:00Z',
                            requiredHeaders: {
                                'Content-Type': 'image/png',
                            },
                        },
                    },
                });
            }).as('initProfileUpload');

            cy.intercept('PUT', 'https://object.example.com/upload/profile-31', {
                statusCode: 200,
                body: '',
            }).as('putProfileUpload');

            cy.intercept('POST', '**/api/media/uploads/31/finalize', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        assetId: 31,
                        storagePath: uploadedProfileStoragePath,
                        publicUrl: updatedProfileImage,
                    },
                },
            }).as('finalizeProfileUpload');

            cy.intercept('PUT', '**/api/auth/mypage', (req) => {
                expect(req.body.profileImageUrl).to.eq(uploadedProfileStoragePath);
                req.reply({
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            name: 'TestUser',
                            email: 'test@example.com',
                            favoriteTeam: 'HH',
                            bio: 'I love baseball!',
                            profileImageUrl: updatedProfileImage,
                        },
                    },
                });
            }).as('updateProfile');

            cy.wait(500);
            openProfileEditPage();
            cy.url().should('include', 'view=editProfile');

            cy.fixture('tiny-image.base64').then((base64) => {
                cy.get('[data-testid="profile-image-upload-input"]').selectFile({
                    contents: Cypress.Buffer.from(base64, 'base64'),
                    fileName: 'avatar.png',
                    mimeType: 'image/png',
                }, { force: true });
            });

            cy.contains('이미지가 선택되었습니다. 저장 버튼을 눌러주세요.').should('be.visible');
            cy.contains('저장되지 않은 변경사항이 있습니다.').should('be.visible');
            cy.get('[data-testid="profile-image-upload-input"]')
                .parents('.relative')
                .find('[data-testid="profile-avatar-image"]')
                .should('have.attr', 'src')
                .and('include', 'blob:');
            cy.contains('button', '저장하기').should('not.be.disabled').click();

            cy.wait('@initProfileUpload');
            cy.wait('@putProfileUpload');
            cy.wait('@finalizeProfileUpload');
            cy.wait('@updateProfile');
            cy.wait('@getMeWithUpdatedImage');

            cy.contains('변경사항이 적용되었습니다').should('be.visible');
            cy.url().should('include', '/mypage');
            cy.url().should('not.include', 'view=editProfile');
            cy.get('[data-testid="mypage-mate-history-nav"]').should('exist');
            cy.wait('@getUpdatedProfileImage');
            cy.get('[data-testid="profile-avatar-image"]', { timeout: 20000 }).should('have.attr', 'src', updatedProfileImage);
        });

        it('should not send profileImageUrl when image is not changed', () => {
            cy.intercept(
                'GET',
                '**/api/auth/mypage*',
                {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            id: 123,
                            email: 'test@example.com',
                            name: 'TestUser',
                            handle: 'testuser',
                            favoriteTeam: 'HH',
                            role: 'ROLE_USER',
                            profileImageUrl: existingProfileImage,
                        },
                    },
                }
            ).as('getMeWithImage');

            visitMyPage();
            cy.wait(500);

            cy.intercept('PUT', '**/api/auth/mypage', (req) => {
                expect(req.body.profileImageUrl).to.be.undefined;
                req.reply({
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            name: 'TestUser',
                            email: 'test@example.com',
                            favoriteTeam: 'HH',
                            bio: 'I love baseball!',
                            profileImageUrl: existingProfileImage,
                        },
                    },
                });
            }).as('updateProfileWithoutImage');

            cy.wait(500);
            openProfileEditPage();
            cy.get('input#name').clear().type('ChangedName');
            cy.contains('button', '저장하기').click();
            cy.wait('@updateProfileWithoutImage');

            cy.contains('변경사항이 적용되었습니다').should('be.visible');
            cy.url().should('include', '/mypage');
            cy.get('section[data-screen-label="시즌 로그"]').should('be.visible');
            cy.get('[data-testid="profile-avatar-image"]').should('have.attr', 'src').and('include', existingProfileImage);
        });

        it('should allow editing nickname', () => {
            cy.wait(500);
            openProfileEditPage();

            cy.intercept('PUT', '**/api/auth/mypage', {
                statusCode: 200,
                body: { success: true, data: { name: 'NewName' } }
            }).as('updateProfile');

            // Find name input. In ProfileEditSection.tsx
            cy.get('input#name').clear().type('NewName');
            cy.contains('button', '저장하기').click();

            cy.wait('@updateProfile');
            cy.contains('변경사항이 적용되었습니다').should('be.visible');
        });

        it('should show a sanitized message when profile save fails with a technical error', () => {
            cy.wait(500);
            openProfileEditPage();

            cy.intercept('PUT', '**/api/auth/mypage', {
                statusCode: 500,
                body: {
                    success: false,
                    message: 'Request failed with status code 500',
                },
            }).as('updateProfileFailure');

            cy.get('textarea#bio').clear().type('새 자기소개');
            cy.contains('button', '저장하기').click();

            cy.wait('@updateProfileFailure');
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains('Request failed with status code 500').should('not.exist');
        });
    });

    describe('Reference responsive shell', () => {
        it('uses the reference desktop sidebar without quick actions', () => {
            cy.viewport(1280, 900);

            cy.get('[data-testid="mypage-season-sidebar"]').should(($side) => {
                const style = getComputedStyle($side[0]);
                expect(style.position).to.eq('sticky');
                expect(style.flexDirection).to.eq('column');
            });
            cy.get('.mypage-season-app').should(($app) => {
                expect(getComputedStyle($app[0]).gridTemplateColumns).to.match(/^264px /);
            });
            cy.get('[aria-label="빠른 작업"]').should('not.exist');
            cy.get('[data-testid="mypage-season-sidebar-record-cta"]').should('be.visible');
            cy.get('[data-testid="mypage-cheer-posts-nav"]').then(($cheerNav) => {
                cy.get('[data-testid="mypage-mate-history-nav"]').then(($mateNav) => {
                    const order = $cheerNav[0].compareDocumentPosition($mateNav[0]);
                    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).to.not.eq(0);
                });
            });
            cy.get('.mypage-season-heat-months').should(($months) => {
                const style = getComputedStyle($months[0]);
                expect(style.columnGap).to.eq('3px');
                expect(style.marginLeft).to.eq('26px');
            });
            cy.get('.mypage-season-heat-grid').should(($grid) => {
                const style = getComputedStyle($grid[0]);
                expect(style.columnGap).to.eq('3px');
                expect(style.rowGap).to.eq('3px');
                expect(style.gridTemplateRows).to.match(/^13px /);
            });
        });

        it('shows the approved sidebar auxiliary links and excludes mate finder and goods shop', () => {
            cy.viewport(1280, 900);

            cy.get('[data-testid="mypage-season-sidebar-more"]').within(() => {
                cy.contains('a,button', '검색').should('be.visible');
                cy.contains('a,button', '알림').should('be.visible');
                cy.contains('a,button', '배지 도감').should('be.visible');
                cy.contains('a,button', '시즌 통계').should('be.visible');
                cy.contains('메이트 찾기').should('not.exist');
                cy.contains('굿즈샵').should('not.exist');
            });
        });

        it('renders backend-linked final stats cards, monthly bars, stadium visits, and home-away counts', () => {
            cy.viewport(1280, 900);

            cy.intercept('GET', '**/api/diary/statistics*', {
                statusCode: 200,
                body: {
                    totalCount: 14,
                    totalWins: 9,
                    totalLosses: 4,
                    totalDraws: 1,
                    winRate: 64.3,
                    monthlyCount: 2,
                    yearlyCount: 14,
                    yearlyWins: 9,
                    yearlyWinRate: 64.3,
                    mostVisitedStadium: '광주 챔피언스필드',
                    mostVisitedCount: 9,
                    happiestMonth: '5월',
                    happiestCount: 7,
                    firstDiaryDate: '2026-03-29',
                    cheerPostCount: 5,
                    mateParticipationCount: 3,
                    monthlyVisitCounts: {
                        3: 1,
                        4: 4,
                        5: 7,
                        6: 2,
                    },
                    stadiumVisitCounts: {
                        '광주 챔피언스필드': 9,
                        '잠실야구장': 2,
                        '대구 라이온즈파크': 2,
                        '수원 KT위즈파크': 1,
                    },
                    homeVisitCount: 9,
                    awayVisitCount: 5,
                    scheduledCount: 2,
                    emojiCounts: {
                        열광: 4,
                        즐거움: 6,
                        아쉬움: 3,
                        특별함: 1,
                    },
                    currentWinStreak: 2,
                    longestWinStreak: 4,
                    currentLossStreak: 0,
                    opponentWinRates: {
                        LG: { wins: 2, losses: 0, draws: 0, winRate: 100 },
                    },
                    bestOpponent: 'LG',
                    worstOpponent: 'NC',
                    dayOfWeekStats: {},
                    luckyDay: '토',
                    earnedBadges: ['ticket', 'flame', 'map-pin'],
                },
            }).as('getFinalStats');

            cy.visit('/mypage?view=stats', {
                onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
            });
            cy.wait('@getFinalStats');

            cy.get('section[data-screen-label="나의 기록"]', { timeout: 20000 }).within(() => {
                cy.contains('직관').should('be.visible');
                cy.contains('14').should('be.visible');
                cy.contains('직관 승률').should('be.visible');
                cy.contains('64').should('be.visible');
                cy.contains('홈 / 원정').should('be.visible');
                cy.contains('9').should('be.visible');
                cy.contains('5').should('be.visible');
                cy.contains('응원 포인트').should('be.visible');
                cy.contains('월별 직관 횟수').should('be.visible');
                cy.contains('5월').should('be.visible');
                cy.contains('7').should('be.visible');
                cy.contains('구장 방문').should('be.visible');
                cy.contains('광주 챔피언스필드').should('be.visible');
                cy.contains('9회').should('be.visible');
            });
        });

        it('keeps the season composer avatar compact when a profile image exists', () => {
            cy.viewport(1280, 900);

            cy.intercept('GET', '**/api/auth/mypage*', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        id: 123,
                        email: 'test@example.com',
                        name: 'TestUser',
                        handle: 'testuser',
                        favoriteTeam: 'HH',
                        role: 'ROLE_USER',
                        hasPassword: true,
                        profileImageUrl: existingProfileImage,
                    },
                },
            }).as('getMeWithComposerImage');

            visitMyPage(createAuthState({ profileImageUrl: existingProfileImage }));
            cy.contains('2026 시즌 로그', { timeout: 20000 }).should('be.visible');
            cy.get('.mypage-season-composer [data-testid="profile-avatar-image"]', { timeout: 20000 })
                .should(($image) => {
                    const rect = $image[0].getBoundingClientRect();
                    expect(rect.width).to.be.lessThan(40);
                    expect(rect.height).to.be.lessThan(40);
                });
            cy.get('.mypage-season-composer [data-testid="mypage-season-write-cta"]').should('be.visible');
        });

        it('turns the sidebar into a tablet profile bar', () => {
            cy.viewport(768, 1024);

            cy.get('[data-testid="mypage-season-sidebar"]').should(($side) => {
                const style = getComputedStyle($side[0]);
                expect(style.position).to.eq('static');
                expect(style.flexDirection).to.eq('row');
                expect(style.flexWrap).to.eq('wrap');
            });
            cy.get('.mypage-season-nav').should(($nav) => {
                const style = getComputedStyle($nav[0]);
                expect(style.position).to.not.eq('fixed');
                expect(style.flexDirection).to.eq('row');
            });
            cy.get('.mypage-season-composer').should(($composer) => {
                const style = getComputedStyle($composer[0]);
                expect(style.flexDirection).to.eq('row');
                expect(style.flexWrap).to.eq('wrap');
            });
            cy.get('.mypage-season-composer [data-testid="mypage-season-write-cta"]').should(($button) => {
                const buttonRect = $button[0].getBoundingClientRect();
                const composerRect = $button[0].closest('.mypage-season-composer')!.getBoundingClientRect();
                expect(buttonRect.width).to.be.lessThan(composerRect.width * 0.5);
            });
        });

        it('uses a fixed bottom nav and safe content padding on mobile', () => {
            cy.viewport(390, 844);

            cy.get('.mypage-season-nav').should(($nav) => {
                const style = getComputedStyle($nav[0]);
                expect(style.position).to.eq('fixed');
                expect(style.flexDirection).to.eq('row');
            });
            cy.get('.mypage-season-main').should(($main) => {
                expect(parseFloat(getComputedStyle($main[0]).paddingBottom)).to.be.greaterThan(80);
            });
            cy.visit('/mypage?view=stats', {
                onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
            });
            cy.get('section[data-screen-label="나의 기록"]', { timeout: 20000 }).should('be.visible');
            expectGridColumnCount('.mypage-season-stat-grid', 2);
            expectGridColumnCount('.mypage-season-badge-grid', 3);
            expectNoPageHorizontalOverflow();
        });

        it('keeps settings mapped to existing account functions only', () => {
            openSettingsHome();

            cy.get('.mypage-season-main').within(() => {
                cy.contains('button', '프로필 정보').should('be.visible');
                cy.contains('button', '계정 설정').should('be.visible');
                cy.contains('button', '비밀번호 변경').should('be.visible');
                cy.contains('button', '차단한 사용자').should('be.visible');
                cy.contains('button', '로그아웃').should('be.visible');
                cy.contains('알림 설정').should('not.exist');
                cy.contains('공개 범위').should('not.exist');
            });
        });

        it('shows authored cheer posts in a dedicated mypage tab', () => {
            cy.get('[data-testid="mypage-cheer-posts-nav"]').should('be.visible').click();

            cy.url().should('include', 'view=cheerPosts');
            cy.wait('@getMyCheerPosts');
            cy.get('section[data-screen-label="응원석 글"]', { timeout: 20000 }).should('be.visible');
            cy.contains('오늘 응원석 분위기 최고였습니다.').should('be.visible');
            cy.get('[data-testid="cheer-post-card"]').should('have.length', 1);
            cy.get('[data-testid="mypage-cheer-post-card"]').should('not.exist');
            cy.get('[aria-label="댓글 2개"]').should('be.visible');
            cy.get('[aria-label="좋아요 (현재 7개)"]').should('be.visible');
        });

        it('shows an empty state and write CTA when authored cheer posts are empty', () => {
            cy.intercept('GET', '**/api/cheer/me/posts*', {
                statusCode: 200,
                body: {
                    content: [],
                    last: true,
                    totalPages: 0,
                    totalElements: 0,
                    size: 10,
                    number: 0,
                },
            }).as('getEmptyMyCheerPosts');

            cy.get('[data-testid="mypage-cheer-posts-nav"]').should('be.visible').click();

            cy.url().should('include', 'view=cheerPosts');
            cy.wait('@getEmptyMyCheerPosts');
            cy.get('[data-testid="mypage-cheer-posts-empty"]').should('be.visible');
            cy.contains('작성한 응원석 글이 없습니다').should('be.visible');
            cy.contains('응원석에 첫 글을 남기고 팬들과 이야기를 시작해보세요.').should('be.visible');
            cy.get('[data-testid="mypage-cheer-post-card"]').should('not.exist');

            cy.get('[data-testid="mypage-cheer-posts-empty-write"]').should('be.visible').click();
            cy.location('pathname').should('eq', '/cheer/write');
        });

        it('shows an error state instead of the empty state when authored cheer posts fail to load', () => {
            let requestCount = 0;
            cy.intercept('GET', '**/api/cheer/me/posts*', (req) => {
                requestCount += 1;
                req.reply({
                    statusCode: 500,
                    body: {
                        success: false,
                        message: 'server error',
                    },
                });
            }).as('getMyCheerPostsError');

            cy.get('[data-testid="mypage-cheer-posts-nav"]').should('be.visible').click();

            cy.url().should('include', 'view=cheerPosts');
            cy.wait('@getMyCheerPostsError');
            cy.get('[data-testid="mypage-cheer-posts-error"]').should('be.visible');
            cy.contains('응원석 글을 불러오지 못했습니다.').should('be.visible');
            cy.get('[data-testid="mypage-cheer-posts-empty"]').should('not.exist');
            cy.get('[data-testid="mypage-cheer-post-card"]').should('not.exist');

            cy.get('[data-testid="mypage-cheer-posts-retry"]').should('be.visible').click();
            cy.wait('@getMyCheerPostsError');
            cy.wrap(null).then(() => {
                expect(requestCount).to.eq(2);
            });
        });

        it('shows an error state instead of the empty state when authored cheer posts endpoint returns 404', () => {
            cy.intercept('GET', '**/api/cheer/me/posts*', {
                statusCode: 404,
                body: {
                    success: false,
                    message: 'Not Found',
                },
            }).as('getMyCheerPostsNotFound');

            cy.get('[data-testid="mypage-cheer-posts-nav"]').should('be.visible').click();

            cy.url().should('include', 'view=cheerPosts');
            cy.wait('@getMyCheerPostsNotFound');
            cy.get('[data-testid="mypage-cheer-posts-error"]').should('be.visible');
            cy.contains('응원석 글 조회 경로를 찾을 수 없습니다.').should('be.visible');
            cy.get('[data-testid="mypage-cheer-posts-empty"]').should('not.exist');
            cy.get('[data-testid="mypage-cheer-post-card"]').should('not.exist');
        });

        it('keeps core mypage views within the reference breakpoints', () => {
            const viewports = [
                { name: 'desktop', width: 1440, height: 900 },
                { name: 'tablet', width: 768, height: 1024 },
                { name: 'mobile', width: 390, height: 844 },
            ];

            viewports.forEach(({ name, width, height }) => {
                cy.viewport(width, height);
                visitMyPage();
                cy.contains('2026 시즌 로그', { timeout: 20000 }).should('be.visible');
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-season-log`, { capture: 'viewport' });

                cy.visit('/mypage?view=stats', {
                    onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
                });
                cy.get('section[data-screen-label="나의 기록"]', { timeout: 20000 }).should('be.visible');
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-stats`, { capture: 'viewport' });

                cy.visit('/mypage?view=mateHistory', {
                    onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
                });
                cy.get('section[data-screen-label="메이트 내역"]', { timeout: 20000 }).should('be.visible');
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-mate-history`, { capture: 'viewport' });

                cy.visit('/mypage?view=cheerPosts', {
                    onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
                });
                cy.get('section[data-screen-label="응원석 글"]', { timeout: 20000 }).should('be.visible');
                cy.contains('오늘 응원석 분위기 최고였습니다.').should('be.visible');
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-cheer-posts`, { capture: 'viewport' });

                cy.visit('/mypage?view=settings', {
                    onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
                });
                cy.get('section[data-screen-label="설정"]', { timeout: 20000 }).within(() => {
                    cy.contains('button', '프로필 정보').should('be.visible');
                });
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-settings`, { capture: 'viewport' });

                cy.visit('/mypage?view=diaryEditor&date=2026-06-12', {
                    onBeforeLoad: (win) => bootstrapAuthenticatedWindow(win),
                });
                cy.url().should('include', 'view=diaryEditor');
                cy.contains('직관 기록').should('be.visible');
                cy.get('[data-testid="diary-editor-calendar-card"]').should('be.visible');
                cy.get('[data-testid="diary-editor-form-card"]').should('be.visible');
                if (name === 'mobile') {
                    cy.get('.diary-photo-grid').should('be.visible');
                    cy.get('.mypage-season-main').should(($main) => {
                        const nav = $main[0].ownerDocument.querySelector('.mypage-season-nav');
                        const navHeight = nav?.getBoundingClientRect().height || 0;
                        const paddingBottom = Number.parseFloat(getComputedStyle($main[0]).paddingBottom);
                        expect(paddingBottom).to.be.gte(navHeight + 12);
                    });
                    cy.get('[data-testid="save-diary-btn"]').scrollIntoView({ offset: { top: -160, left: 0 } });
                    cy.get('[data-testid="save-diary-btn"]').should(($button) => {
                        const nav = $button[0].ownerDocument.querySelector('.mypage-season-nav');
                        expect(nav, 'mobile bottom nav').to.not.equal(null);
                        const buttonRect = $button[0].getBoundingClientRect();
                        const navRect = nav!.getBoundingClientRect();
                        expect(buttonRect.bottom).to.be.lte(navRect.top + 1);
                    });
                }
                expectNoPageHorizontalOverflow();
                cy.screenshot(`mypage-reference/${name}-diary-editor`, { capture: 'viewport' });
            });
        });
    });

    describe('Account Settings', () => {
        beforeEach(() => {
            cy.wait(500);
            openAccountSettingsPage();
            cy.wait('@getProviders');
        });

        it('should show social linking status', () => {
            cy.contains('계정 설정').should('be.visible');
            cy.contains('Google').should('be.visible');
            cy.contains('test@google.com').should('be.visible');
            cy.contains('button', '해제').should('be.visible');
        });

        it('should request a link token before starting social account linking', () => {
            cy.intercept('GET', '**/api/auth/link-token', {
                statusCode: 500,
                body: {
                    message: '연동 토큰 발급에 실패했습니다. 다시 로그인해주세요.',
                },
            }).as('getLinkToken');

            cy.contains('button', '연동하기').first().click();

            cy.wait('@getLinkToken').its('response.statusCode').should('eq', 500);
            cy.url().should('include', '/mypage');
        });

        it('should show a visible explanation when the last login method cannot be unlinked', () => {
            cy.intercept('GET', '**/api/auth/providers', {
                statusCode: 200,
                body: {
                    success: true,
                    data: [
                        { provider: 'GOOGLE', connected: true, email: 'test@google.com' },
                    ]
                }
            }).as('getProvidersSocialOnly');

            cy.intercept('GET', '**/api/auth/mypage*', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        ...authStateUser,
                        provider: 'GOOGLE',
                        hasPassword: false,
                    }
                }
            }).as('getMeSocialOnly');

            visitMyPage(createAuthState({ hasPassword: false }));
            cy.wait('@getMeSocialOnly');
            cy.contains('TestUser', { timeout: 20000 }).should('be.visible');

            openAccountSettingsPage();
            cy.wait('@getProvidersSocialOnly');

            cy.contains('button', '현재 로그인 방식').should('be.disabled');
            cy.contains('현재 로그인 중인 유일한 수단이라 해제할 수 없습니다.').should('be.visible');
        });

        it('should show a sanitized message when provider unlink fails with a technical error', () => {
            cy.intercept('DELETE', '**/api/auth/providers/google', {
                statusCode: 500,
                body: {
                    success: false,
                    message: 'Request failed with status code 500',
                },
            }).as('unlinkGoogleFailure');

            cy.contains('button', '연동 해제').click();
            cy.contains('button', '연동 해제 진행').click();

            cy.wait('@unlinkGoogleFailure');
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains('Request failed with status code 500').should('not.exist');
        });
    });

    describe('Password Change', () => {
        beforeEach(() => {
            cy.wait(500);
            openPasswordChangePage();
        });

        it('should validate password change', () => {
            cy.intercept('PUT', '**/api/auth/password', {
                statusCode: 401,
                body: { success: false, message: '현재 비밀번호가 일치하지 않습니다.' }
            }).as('updatePassword');

            cy.get('input#currentPassword').type('wrongpassword');
            cy.get('input#newPassword').type('newpassword123');
            cy.get('input#confirmPassword').type('newpassword123');

            cy.contains('button', '비밀번호 변경').click();
            cy.wait('@updatePassword');

            cy.contains('현재 비밀번호가 일치하지 않습니다').should('be.visible');
        });

        it('should return to mypage after logging in again when password change succeeds', () => {
            cy.intercept('PUT', '**/api/auth/password', {
                statusCode: 200,
                body: { success: true }
            }).as('updatePasswordSuccess');

            cy.get('input#currentPassword').type('currentpassword123');
            cy.get('input#newPassword').type('newpassword123');
            cy.get('input#confirmPassword').type('newpassword123');

            cy.contains('button', '비밀번호 변경').click();
            cy.wait('@updatePasswordSuccess');

            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', '?redirect=%2Fmypage');
        });

        it('should show a sanitized message when password change fails with a technical error', () => {
            cy.intercept('PUT', '**/api/auth/password', {
                statusCode: 500,
                body: {
                    success: false,
                    message: 'Request failed with status code 500',
                }
            }).as('updatePasswordFailure');

            cy.get('input#currentPassword').type('currentpassword123');
            cy.get('input#newPassword').type('newpassword123');
            cy.get('input#confirmPassword').type('newpassword123');

            cy.contains('button', '비밀번호 변경').click();
            cy.wait('@updatePasswordFailure');

            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains('Request failed with status code 500').should('not.exist');
        });
    });

    describe('Back Navigation', () => {
        const expectMypageBasePath = () => {
            cy.url().should('include', '/mypage');
            cy.url().should('not.include', '/prediction');
        };

        const visitMypageFromPrediction = () => {
            cy.visit('/prediction', {
                onBeforeLoad: bootstrapAuthenticatedWindow,
            });
            cy.wait(500);
            visitMyPage();
            cy.wait(500);
        };

        it('should return to 내 정보 수정 from password change with browser back', () => {
            visitMypageFromPrediction();
            openProfileEditPage();
            cy.url().should('include', 'view=editProfile');

            openPasswordChangeFromProfileEdit();

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=editProfile');
            cy.contains('내 정보 수정').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=settings');
            cy.contains('프로필 정보').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');
        });

        it('should return to 내 정보 수정 from account settings with browser back', () => {
            visitMypageFromPrediction();
            openAccountSettingsPage();

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=settings');
            cy.contains('프로필 정보').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');

            cy.go('back');
            cy.url().should('include', '/prediction');
        });

        it('should return to 내 정보 수정 from blocked users with browser back', () => {
            visitMypageFromPrediction();
            openBlockedUsersPage();

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=settings');
            cy.contains('프로필 정보').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');

            cy.go('back');
            cy.url().should('include', '/prediction');
        });

        it('should unwind mypage history by repeated browser back', () => {
            visitMypageFromPrediction();
            openProfileEditPage();
            openPasswordChangeFromProfileEdit();

            cy.go('back');
            cy.url().should('include', 'view=editProfile');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=settings');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');

            cy.go('back');
            cy.url().should('include', '/prediction');
        });
    });
});
