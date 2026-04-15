/// <reference types="cypress" />

describe('My Page (User Profile)', () => {
    const uploadedProfileImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2X5ZkAAAAASUVORK5CYII=';
    const existingProfileImage =
        'data:image/gif;base64,R0lGODdhAQABAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

    const openPasswordChangePage = () => {
        cy.contains('button', '비밀번호 변경').click();
        cy.contains('button', '안전하게 진행').should('be.visible').click();
        cy.url().should('include', 'view=changePassword');
    };

    const createAuthState = (userOverrides: Partial<typeof authStateUser> = {}) => ({
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

    const authStateUser = {
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

    beforeEach(() => {
        cy.mockAPI();

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

        visitMyPage();
        cy.wait('@getMeInitial');
        cy.wait(300);
        // Wait for profile readiness
        cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
    });

    describe('Profile Management', () => {
        it('should show default avatar when profile image is not set', () => {
            cy.get('img[alt="Profile"]').should('not.exist');
            cy.get('[data-testid="profile-avatar-fallback"]').should('exist');
            cy.get('button', { timeout: 20000 }).contains('내 정보 수정').should('be.visible');
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
            // Check top profile card
            cy.contains('TestUser').should('be.visible');
            cy.contains('test@example.com').should('be.visible');
            // Team badge can render with localized name, so use stable test id.
            cy.get('[data-testid="mypage-favorite-team-logo"]').should('be.visible');
            // Check for points
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
            cy.contains('내 정보 수정').click();
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
            cy.get('[data-testid="profile-avatar-image"]')
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
            cy.contains('button', '메이트 내역').should('be.visible');
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
            cy.contains('내 정보 수정').click();
            cy.get('input#name').clear().type('ChangedName');
            cy.contains('button', '저장하기').click();
            cy.wait('@updateProfileWithoutImage');

            cy.contains('변경사항이 적용되었습니다').should('be.visible');
            cy.url().should('include', '/mypage');
            cy.contains('내 정보 수정').should('be.visible');
            cy.get('[data-testid="profile-avatar-image"]').should('have.attr', 'src').and('include', existingProfileImage);
        });

        it('should allow editing nickname', () => {
            cy.wait(500);
            cy.contains('내 정보 수정').click();

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
            cy.contains('내 정보 수정').click();

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

    describe('Account Settings', () => {
        beforeEach(() => {
            // Need to be in edit mode to see account settings
            cy.wait(500);
            cy.contains('내 정보 수정').click();
            cy.contains('계정 설정').click();
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

            cy.contains('내 정보 수정').click();
            cy.contains('계정 설정').click();
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
            cy.contains('내 정보 수정').click();
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

        const openAccountSettingsPage = () => {
            cy.contains('button', '내 정보 수정').click();
            cy.url().should('include', 'view=editProfile');
            cy.contains('button', '계정 설정').click();
            cy.url().should('include', 'view=accountSettings');
        };

        const openBlockedUsersPage = () => {
            cy.contains('button', '내 정보 수정').click();
            cy.url().should('include', 'view=editProfile');
            cy.contains('button', '차단 관리').click();
            cy.url().should('include', 'view=blockedUsers');
        };

        it('should return to 내 정보 수정 from password change with browser back', () => {
            visitMypageFromPrediction();
            cy.contains('button', '내 정보 수정').click();
            cy.url().should('include', 'view=editProfile');

            openPasswordChangePage();

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=editProfile');
            cy.contains('내 정보 수정').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');
        });

        it('should return to 내 정보 수정 from account settings with browser back', () => {
            visitMypageFromPrediction();
            openAccountSettingsPage();

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('include', 'view=editProfile');
            cy.contains('내 정보 수정').should('be.visible');

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
            cy.url().should('include', 'view=editProfile');
            cy.contains('내 정보 수정').should('be.visible');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');

            cy.go('back');
            cy.url().should('include', '/prediction');
        });

        it('should unwind mypage history by repeated browser back', () => {
            visitMypageFromPrediction();
            cy.contains('button', '내 정보 수정').click();
            openPasswordChangePage();

            cy.go('back');
            cy.url().should('include', 'view=editProfile');

            cy.go('back');
            expectMypageBasePath();
            cy.url().should('not.include', 'view=');

            cy.go('back');
            cy.url().should('include', '/prediction');
        });
    });
});
