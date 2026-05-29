export type SeatCategory = 'CHEERING' | 'TABLE' | 'EXCITING' | 'COMFORT' | 'OUTFIELD' | 'PREMIUM' | 'SPECIAL';

export interface StadiumZone {
    id: string;
    name: string;
    category: SeatCategory;
    keywords: string[];
    description?: string;
    color?: string; // Optional: specific color for identifying this zone in UI (e.g. Orange for Jamsil Orange seats)
    price?: {
        weekday: string;
        weekend: string;
    };
}

export interface StadiumConfig {
    id: string;
    name: string;
    homeTeam: string; // 'LG', 'Doosan', 'Samsung' etc.
    zones: StadiumZone[];
}

export const KBO_STADIUMS: Record<string, StadiumConfig> = {
    'Jamsil': {
        id: 'Jamsil',
        name: '서울잠실야구장',
        homeTeam: 'LG/Doosan',
        zones: [
            {
                id: 'orange',
                name: '오렌지석',
                category: 'CHEERING',
                keywords: ['오렌지', '응원', '단상'],
                description: '응원단상 바로 앞! 예매 경쟁이 가장 치열한 응원 지정석',
                color: '#F97316', // Orange
                price: { weekday: '18,000~20,000원', weekend: '20,000~22,000원' }
            },
            {
                id: 'red',
                name: '레드석',
                category: 'CHEERING',
                keywords: ['레드', '1층', '2층'],
                description: '응원석 주변으로 가성비와 열기를 동시에 즐기는 구역',
                color: '#EF4444', // Red
                price: { weekday: '16,000~17,000원', weekend: '18,000~19,000원' }
            },
            {
                id: 'premium',
                name: '프리미엄석',
                category: 'PREMIUM',
                keywords: ['프리미엄', '포수'],
                description: '포수 바로 뒤편 최상급 좌석 (가죽 쿠션, 테이블)',
                price: { weekday: '80,000~90,000원', weekend: '90,000원' }
            },
            {
                id: 'table',
                name: '테이블석',
                category: 'TABLE',
                keywords: ['테이블', '보라색'],
                description: '1·3루 내야 하단에 위치한 편안한 테이블 좌석',
                price: { weekday: '47,000~53,000원', weekend: '53,000~58,000원' }
            },
            {
                id: 'blue',
                name: '블루석',
                category: 'COMFORT',
                keywords: ['블루', '내야'],
                description: '그라운드와 가까워 경기에 집중하기 좋은 내야 하단석',
                price: { weekday: '20,000~22,000원', weekend: '22,000~24,000원' }
            },
            {
                id: 'navy',
                name: '네이비석',
                category: 'COMFORT',
                keywords: ['네이비', '3층', '중앙'],
                description: '경기 전체 조망이 좋고 우천 시 비를 피하기 유리함',
                price: { weekday: '13,000~14,000원', weekend: '15,000~16,000원' }
            },
            {
                id: 'exciting',
                name: '익사이팅존',
                category: 'EXCITING',
                keywords: ['익사이팅'],
                description: '그라운드 눈높이 관람 (헬멧 필수, 미취학 아동 입장 제한)',
                price: { weekday: '25,000~28,000원', weekend: '30,000~33,000원' }
            },
            {
                id: 'outfield',
                name: '외야 일반석',
                category: 'OUTFIELD',
                keywords: ['외야'],
                description: '홈런볼을 잡을 수 있는 외야 지정석',
                price: { weekday: '8,000~9,000원', weekend: '9,000~10,000원' }
            }
        ]
    },
    'Incheon': {
        id: 'Incheon',
        name: '인천SSG랜더스필드',
        homeTeam: 'SSG',
        zones: [
            {
                id: 'eusseuk',
                name: '으쓱이존',
                category: 'CHEERING',
                keywords: ['으쓱이', '응원'],
                description: '1루 응원단상 앞 응원 지정석 (구 응원지정석)',
                color: '#CE0E2D' // SSG Red
            },
            {
                id: 'live',
                name: '라이브존',
                category: 'PREMIUM',
                keywords: ['라이브', '포수', '라운지'],
                description: '포수 뒤 최고급 좌석 (라운지 이용 포함)'
            },
            {
                id: 'table',
                name: '테이블석',
                category: 'TABLE',
                keywords: ['테이블', '피코크', '노브랜드'],
                description: '1층 및 2층에 위치한 다양한 테이블석'
            },
            {
                id: 'chair',
                name: '의자지정석',
                category: 'COMFORT',
                keywords: ['의자지정', '컵홀더'],
                description: '응원석 주변 일반 내야석 (컵홀더 보유)'
            },
            {
                id: 'bbq',
                name: '이마트 바비큐존',
                category: 'SPECIAL',
                keywords: ['바비큐', '고기', '그릴'],
                description: '전기 그릴을 대여하여 고기를 구워먹을 수 있는 존'
            },
            {
                id: 'mollys',
                name: '몰리스 그린존',
                category: 'OUTFIELD',
                keywords: ['그린존', '잔디', '텐트', '반려견'],
                description: '외야 잔디석 (텐트 가능, 반려견 동반 가능일 별도 운영)'
            },
            {
                id: 'sky',
                name: 'SKY석',
                category: 'COMFORT',
                keywords: ['SKY', '스카이', '4층'],
                description: '4층 최상단에서 내려다보는 뷰'
            }
        ]
    },
    'Daegu': {
        id: 'Daegu',
        name: '대구 삼성 라이온즈파크',
        homeTeam: 'Samsung',
        zones: [
            {
                id: 'blue',
                name: '블루존',
                category: 'CHEERING',
                keywords: ['블루존', '3루', '응원'],
                description: '삼성의 홈인 3루 내야 응원 지정석. 가장 열광적인 구역',
                color: '#074CA1', // Samsung Blue
                price: { weekday: '15,000원', weekend: '18,000~20,000원' }
            },
            {
                id: 'vip',
                name: 'VIP석',
                category: 'PREMIUM',
                keywords: ['VIP', '포수'],
                description: '포수 후면 하단 프리미엄 좌석',
                price: { weekday: '40,000원~', weekend: '50,000원~' }
            },
            {
                id: 'table',
                name: '테이블석 (지브로존)',
                category: 'TABLE',
                keywords: ['테이블', '지브로', 'Zibro'],
                description: '1·3루 내야 하단 테이블석'
            },
            {
                id: 'exciting',
                name: '익사이팅존',
                category: 'EXCITING',
                keywords: ['익사이팅'],
                description: '1·3루 베이스 터치라인 인근'
            },
            {
                id: 'sky',
                name: 'SKY 지정석',
                category: 'COMFORT',
                keywords: ['SKY', '스카이', '상단', '하단'],
                description: '4~5층 내야 상단석 (가성비 우수)',
                price: { weekday: '9,000원~', weekend: '11,000원~' }
            },
            {
                id: 'outfield_family',
                name: '외야 패밀리/잔디석',
                category: 'OUTFIELD',
                keywords: ['패밀리', '잔디', '돗자리'],
                description: '돗자리를 펴고 관람할 수 있는 외야 구역'
            }
        ]
    },
    'Gwangju': {
        id: 'Gwangju',
        name: '광주기아챔피언스필드',
        homeTeam: 'KIA',
        zones: [
            {
                id: 'k7',
                name: 'K7석',
                category: 'CHEERING',
                keywords: ['K7', '응원', '단상'],
                description: '응원단상 앞 응원 지정석이 포함된 핵심 구역',
                color: '#EA0029', // KIA Red
                price: { weekday: '13,000~14,000원', weekend: '16,000~17,000원' }
            },
            {
                id: 'champion',
                name: '챔피언석',
                category: 'PREMIUM',
                keywords: ['챔피언', '포수'],
                description: '포수 후면 최고급석',
                price: { weekday: '45,000원', weekend: '50,000원' }
            },
            {
                id: 'central_table',
                name: '중앙 테이블석',
                category: 'TABLE',
                keywords: ['중앙 테이블', '테이블'],
                description: '중앙 테이블석 (2인/3인)',
                price: { weekday: '40,000원 (1인)', weekend: '45,000원 (1인)' }
            },
            {
                id: 'k9',
                name: 'K9석',
                category: 'COMFORT',
                keywords: ['K9', '중앙'],
                description: '내야 중앙 및 테이블석 주변, 시야가 가장 좋은 일반석',
                price: { weekday: '15,000~16,000원', weekend: '18,000~20,000원' }
            },
            {
                id: 'k5',
                name: 'K5석',
                category: 'COMFORT',
                keywords: ['K5', '외곽'],
                description: '내야 상단 및 외곽 가성비 좌석',
                price: { weekday: '9,000~11,000원', weekend: '10,000~13,000원' }
            },
            {
                id: 'k3',
                name: 'K3석',
                category: 'COMFORT',
                keywords: ['K3', '5층'],
                description: '5층 최상단 전체 뷰 관람석',
                price: { weekday: '9,000~11,000원', weekend: '10,000~13,000원' }
            },
            {
                id: 'eco',
                name: '에코다이나믹스 가족석',
                category: 'SPECIAL',
                keywords: ['에코', '가족', '테이블', '마루'],
                description: '외야 테이블/마루 형태 좌석'
            },
            {
                id: 'surprise',
                name: '서프라이즈존',
                category: 'EXCITING',
                keywords: ['서프라이즈', '익사이팅'],
                description: '그라운드 레벨에서 즐기는 익사이팅존'
            },
            {
                id: 'outfield',
                name: '외야석',
                category: 'OUTFIELD',
                keywords: ['외야'],
                description: '외야 자유석/지정석',
                price: { weekday: '9,000원', weekend: '10,000~11,000원' }
            }
        ]
    },
    'Suwon': {
        id: 'Suwon',
        name: '수원KT위즈파크',
        homeTeam: 'KT',
        zones: [
            {
                id: 'cheer',
                name: '응원지정석',
                category: 'CHEERING',
                keywords: ['응원지정', '응원', '1루'],
                description: '1루 내야 응원단상 앞',
                color: '#000000' // KT Black (or Red/White accents)
            },
            {
                id: 'genie',
                name: '지니존 / BC카드존',
                category: 'PREMIUM',
                keywords: ['지니', 'BC카드', '포수'],
                description: '포수 후면 최고급 테이블석'
            },
            {
                id: 'highfive',
                name: '하이파이브존',
                category: 'EXCITING',
                keywords: ['하이파이브', '익사이팅'],
                description: '선수들과 가장 가까운 익사이팅존'
            },
            {
                id: 'camping',
                name: '키즈랜드 캠핑존',
                category: 'SPECIAL',
                keywords: ['키즈랜드', '캠핑', '텐트'],
                description: '외야 높게 설치된 텐트형 좌석'
            },
            {
                id: 'sky',
                name: '스카이존',
                category: 'COMFORT',
                keywords: ['스카이', '5층'],
                description: '5층 내야 상단석'
            },
            {
                id: 'outfield_grass',
                name: '외야 잔디 자유석',
                category: 'OUTFIELD',
                keywords: ['잔디', '자유석', '돗자리'],
                description: '돗자리 관람이 가능한 외야 잔디 구역'
            }
        ]
    },
    'Changwon': {
        id: 'Changwon',
        name: '창원NC파크',
        homeTeam: 'NC',
        zones: [
            {
                id: 'inner_cheer',
                name: '내야 응원석',
                category: 'CHEERING',
                keywords: ['내야 응원', '105', '106', '107', '108'],
                description: '1루 내야 105~108 블록 인근',
                color: '#315288' // NC Dark Blue
            },
            {
                id: 'premium_table',
                name: '프리미엄 테이블석',
                category: 'PREMIUM',
                keywords: ['프리미엄', '포수', '테이블'],
                description: '포수 뒤편 프리미엄 테이블석'
            },
            {
                id: 'inner_general',
                name: '내야 일반석',
                category: 'COMFORT',
                keywords: ['내야 일반', '1층'],
                description: '단차가 낮아 시야가 우수한 1층 내야석'
            },
            {
                id: 'fork',
                name: '포크밸리 바베큐석',
                category: 'SPECIAL',
                keywords: ['포크밸리', '바베큐', '고기'],
                description: '외야에서 고기를 구워먹을 수 있는 좌석'
            },
            {
                id: 'picnic',
                name: '피크닉 테이블석',
                category: 'SPECIAL',
                keywords: ['피크닉', '소풍'],
                description: '외야 소풍 컨셉 좌석'
            },
            {
                id: 'round',
                name: '라운드 테이블석',
                category: 'SPECIAL',
                keywords: ['라운드', '원형'],
                description: '외야 원형 테이블석'
            }
        ]
    },
    'Sajik': {
        id: 'Sajik',
        name: '사직야구장',
        homeTeam: 'Lotte',
        zones: [
            {
                id: 'inner_field',
                name: '내야 필드석',
                category: 'CHEERING',
                keywords: ['내야 필드', '1층', '응원'],
                description: '1층 그라운드와 가깝고 응원 열기가 가장 높은 곳',
                color: '#041E42' // Lotte Navy
            },
            {
                id: 'central_table',
                name: '중앙 탁자석',
                category: 'TABLE',
                keywords: ['중앙 탁자', '포수'],
                description: '포수 후면 테이블석'
            },
            {
                id: 'wide_table',
                name: '와이드/일반 테이블석',
                category: 'TABLE',
                keywords: ['와이드', '3인', '4인'],
                description: '3인, 4인 단위 관람에 적합한 테이블석'
            },
            {
                id: 'inner_upper',
                name: '내야 상단석',
                category: 'COMFORT',
                keywords: ['내야 상단', '2층'],
                description: '2층 좌석'
            },
            {
                id: 'central_upper',
                name: '중앙 상단석',
                category: 'COMFORT',
                keywords: ['중앙 상단', '기록', '분석'],
                description: '포수 뒤편 2층, 전체 흐름을 보기 좋은 기록/분석 뷰'
            }
        ]
    },
    'Gocheok': {
        id: 'Gocheok',
        name: '고척스카이돔',
        homeTeam: 'Kiwoom',
        zones: [
            {
                id: 'burgundy',
                name: '버건디석',
                category: 'CHEERING',
                keywords: ['버건디', '응원'],
                description: '팀 컬러(버건디) 의자로 된 내야 응원 지정석',
                color: '#570514' // Kiwoom Burgundy
            },
            {
                id: 'diamond',
                name: '다이아몬드 클럽',
                category: 'PREMIUM',
                keywords: ['다이아몬드', '포수', '가죽'],
                description: '포수 뒤 최상급 가죽 시트 좌석 (식음료 서비스)'
            },
            {
                id: 'dark_burgundy',
                name: '다크버건디석',
                category: 'COMFORT',
                keywords: ['다크버건디', '중앙'],
                description: '버건디석보다 조금 더 중앙/상단에 위치해 시야가 좋음'
            },
            {
                id: 'gold',
                name: '골드 내야석',
                category: 'TABLE',
                keywords: ['골드', '테이블'],
                description: '테이블석 등급의 내야석'
            },
            {
                id: 'outfield',
                name: '외야 지정석',
                category: 'OUTFIELD',
                keywords: ['외야', '1층', '2층'],
                description: '외야 1, 2층 지정석'
            }
        ]
    },
    'Daejeon': {
        id: 'Daejeon',
        name: '대전 한화생명볼파크',
        homeTeam: 'Hanwha',
        zones: [
            {
                id: 'vip',
                name: 'VIP 프리미엄석',
                category: 'PREMIUM',
                keywords: ['VIP', '프리미엄'],
                description: '신축 구장의 최상급 좌석',
                price: { weekday: '50,000~67,000원', weekend: '(변동 가능)' }
            },
            {
                id: 'home_plate',
                name: '홈 플레이트 테이블석',
                category: 'PREMIUM',
                keywords: ['홈 플레이트', '포수'],
                description: '신축 구장의 포수 후면 최고급석'
            },
            {
                id: 'central_table',
                name: '중앙 탁자석',
                category: 'TABLE',
                keywords: ['중앙 탁자'],
                description: '중앙 테이블석',
                price: { weekday: '25,000~30,000원', weekend: '(변동 가능)' }
            },
            {
                id: 'inner_lower',
                name: '내야 하단 지정석',
                category: 'CHEERING',
                keywords: ['내야 하단', '응원'],
                description: '그라운드와 가장 가까운 일반석 및 응원 구역',
                color: '#F37321', // Hanwha Orange
                price: { weekday: '12,000원~', weekend: '15,000원~' }
            },
            {
                id: 'infield_box',
                name: '인필드 박스',
                category: 'SPECIAL',
                keywords: ['인필드', '박스'],
                description: '내야 2층 등에 위치한 독립된 박스형 좌석'
            },
            {
                id: 'exciting',
                name: '익사이팅존',
                category: 'EXCITING',
                keywords: ['익사이팅', '파울라인'],
                description: '1·3루 파울라인 근접 좌석'
            },
            {
                id: 'outfield_basic',
                name: '외야 일반석',
                category: 'OUTFIELD',
                keywords: ['외야', '일반'],
                description: '피크닉 컨셉의 외야석 (신축)',
                price: { weekday: '7,500~9,000원', weekend: '10,000원~' }
            },
            {
                id: 'outfield_lounge',
                name: '외야 라운지/테라스',
                category: 'SPECIAL',
                keywords: ['라운지', '테라스', '외야'],
                description: '외야의 특화된 라운지 및 테라스 공간'
            }
        ]
    }
};

export const SEAT_CATEGORIES: Record<SeatCategory, { label: string; icon: string }> = {
    CHEERING: { label: '응원석', icon: '📣' },
    TABLE: { label: '테이블석', icon: '🍽️' },
    PREMIUM: { label: '프리미엄', icon: '💎' },
    EXCITING: { label: '익사이팅', icon: '⚡' },
    COMFORT: { label: '일반/시야', icon: '👀' },
    SPECIAL: { label: '이색좌석', icon: '⛺' },
    OUTFIELD: { label: '외야석', icon: '⚾' }
};

// Helper: Get keyword list for a generalized category
export const getKeywordsForCategory = (category: SeatCategory): string[] => {
    const allKeywords = new Set<string>();
    Object.values(KBO_STADIUMS).forEach(stadium => {
        stadium.zones
            .filter(z => z.category === category)
            .forEach(z => z.keywords.forEach(k => allKeywords.add(k)));
    });
    return Array.from(allKeywords);
};
