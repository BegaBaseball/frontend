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

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        // Providers mock for account settings
        cy.intercept('GET', '**/api/auth/providers', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { provider: 'google', email: 'test@google.com' },
                    { provider: 'kakao', email: null }
                ]
            }
        }).as('getProviders');

        cy.visit('/mypage');
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
                '**/api/auth/mypage',
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

            cy.visit('/mypage');

            cy.get('[data-testid="profile-avatar-fallback"]').should('exist');
            cy.get('img[alt="Profile"]').should('not.exist');
        });

        it('should display user information', () => {
            // Check top profile card
            cy.contains('TestUser').should('be.visible');
            cy.contains('test@example.com').should('be.visible');
            // Team name might only be visible via logo, so we check for HH logo
            cy.get('img[alt*="HH"]').should('be.visible');
            // Check for points
            cy.contains('P').should('be.visible');
        });

        it('should apply uploaded image immediately after save', () => {
            const updatedProfileImage = uploadedProfileImage;

            cy.intercept('GET', '**/api/auth/mypage', {
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

            cy.intercept('POST', '**/api/profile/image', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        userId: 1,
                        storagePath: 'users/avatars/test-profile.png',
                        publicUrl: updatedProfileImage,
                        mimeType: 'image/png',
                        bytes: 1234,
                    },
                },
            }).as('uploadProfileImage');

            cy.intercept('PUT', '**/api/auth/mypage', (req) => {
                expect(req.body.profileImageUrl).to.eq(updatedProfileImage);
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

            cy.contains('내 정보 수정').click();
            cy.get('input[type="file"]').selectFile({
                contents: Cypress.Buffer.from('avatar image'),
                fileName: 'avatar.png',
                mimeType: 'image/png',
            }, { force: true });

            cy.contains('button', '저장하기').click();

            cy.wait('@uploadProfileImage');
            cy.wait('@updateProfile');
            cy.wait('@getMeWithUpdatedImage');
            cy.contains('변경사항이 적용되었습니다').should('be.visible');
            cy.url().should('include', '/mypage');
            cy.contains('내 정보 수정').should('be.visible');
            cy.get('[data-testid="profile-avatar-image"]').should('have.attr', 'src', updatedProfileImage);
        });

        it('should not send profileImageUrl when image is not changed', () => {
            cy.intercept(
                'GET',
                '**/api/auth/mypage',
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

            cy.visit('/mypage');

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
    });

    describe('Account Settings', () => {
        beforeEach(() => {
            // Need to be in edit mode to see account settings
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
    });

    describe('Password Change', () => {
        beforeEach(() => {
            cy.contains('내 정보 수정').click();
            openPasswordChangePage();
        });

        it('should validate password change', () => {
            cy.intercept('PUT', '**/api/auth/password', {
                statusCode: 400,
                body: { message: '현재 비밀번호가 일치하지 않습니다.' }
            }).as('updatePassword');

            cy.get('input#currentPassword').type('wrongpassword');
            cy.get('input#newPassword').type('newpassword123');
            cy.get('input#confirmPassword').type('newpassword123');

            cy.contains('button', '비밀번호 변경').click();
            cy.wait('@updatePassword');

            cy.contains('현재 비밀번호가 일치하지 않습니다').should('be.visible');
        });
    });

    describe('Back Navigation', () => {
        const expectMypageBasePath = () => {
            cy.url().should('include', '/mypage');
            cy.url().should('not.include', '/prediction');
        };

        const visitMypageFromPrediction = () => {
            cy.visit('/prediction');
            cy.visit('/mypage');
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
