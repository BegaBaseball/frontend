/// <reference types="cypress" />

describe('Stadium Guide', () => {
    const stadiums = [
        {
            stadiumId: 'JAMSIL',
            stadiumName: '잠실야구장',
            team: 'LG/두산',
            lat: 37.5122,
            lng: 127.0719,
            address: '서울특별시 송파구 올림픽로 25',
            phone: null,
        },
        {
            stadiumId: 'GOCHEOK',
            stadiumName: '고척 스카이돔',
            team: '키움',
            lat: 37.4981,
            lng: 126.8671,
            address: '서울특별시 구로구 경인로 430',
            phone: null,
        },
    ];

    const foodPlaces = [
        {
            id: 101,
            stadiumName: '잠실야구장',
            category: 'food',
            name: '잠실 인기 푸드존',
            description: '대표 먹거리 구역',
            lat: 37.5124,
            lng: 127.0721,
            address: '서울 송파구 올림픽로 25',
            phone: null,
            rating: 4.5,
            openTime: null,
            closeTime: null,
        },
    ];

    const deliveryPlaces = [
        {
            id: 201,
            stadiumName: '잠실야구장',
            category: 'delivery',
            name: '종합운동장역 6번 출구 픽업존',
            description: '잠실야구장 외부 배달 수령 권장 위치',
            lat: 37.51093,
            lng: 127.07271,
            address: '서울 송파구 종합운동장역 6번 출구',
            phone: null,
            rating: null,
            openTime: null,
            closeTime: null,
        },
        {
            id: 202,
            stadiumName: '잠실야구장',
            category: 'delivery',
            name: '잠실역 8번 출구 횡단보도 앞 픽업존',
            description: '혼잡 시간대 대체 수령 지점',
            lat: 37.5132,
            lng: 127.1026,
            address: '서울 송파구 잠실역 8번 출구 앞',
            phone: null,
            rating: null,
            openTime: null,
            closeTime: null,
        },
    ];

    const interceptStadiumApis = () => {
        cy.intercept('GET', '**/api/stadiums', {
            statusCode: 200,
            body: stadiums,
        }).as('getStadiums');

        cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
            statusCode: 200,
            body: foodPlaces,
        }).as('getFoodPlaces');

        cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=delivery', {
            statusCode: 200,
            body: deliveryPlaces,
        }).as('getDeliveryPlaces');
    };

    it('should allow guest access to /stadium and render delivery pickup zones', () => {
        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 401,
            body: { success: false, message: 'Unauthorized' },
        }).as('getMeUnauthorized');

        interceptStadiumApis();

        cy.visit('/stadium');
        cy.wait('@getStadiums');
        cy.wait('@getFoodPlaces');

        cy.contains('구장 가이드').should('be.visible');
        cy.get('button').contains('배달픽업존').click();
        cy.wait('@getDeliveryPlaces');

        cy.contains('배달픽업존 목록').should('be.visible');
        cy.contains('종합운동장역 6번 출구 픽업존').should('be.visible');
        cy.contains('잠실역 8번 출구 횡단보도 앞 픽업존').should('be.visible');
    });

    beforeEach(() => {
        cy.login('user');

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
                },
            },
        }).as('getMe');

        interceptStadiumApis();

        cy.visit('/stadium');
        cy.wait('@getStadiums');
        cy.wait('@getFoodPlaces');
    });

    it('should display stadium list or map', () => {
        cy.get('select').should('exist');
        cy.contains('잠실야구장').should('be.visible');
    });
});
