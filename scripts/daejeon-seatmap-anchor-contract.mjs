import path from 'node:path';

export const coordinateChangeImpactContract = 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1';
export const cropGroupOrder = ['home', 'first', 'third', 'outfield', 'skybox', 'special'];
export const reviewContractVersion = 'DAEJEON_ANCHOR_CROP_REVIEW_V2';

const skyboxBlockIds = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => {
  const number = start + index;
  return `skybox-s01-s37__s${String(number).padStart(2, '0')}`;
});

export const cropReviewMeta = new Map([
  ['home-100', { group: 'home', purpose: '홈 뒤쪽 100A-100C 기준 좌표 검수', reviewFocus: '중앙/포수/탁자 100A-100C가 홈플레이트 뒤 공식 셀 안에 머무는지 확인' }],
  ['first-101-109', { group: 'first', purpose: '1루 101-109 연속 블록 drift 검수', reviewFocus: '104 단일 셀, 105-109 한 칸 밀림 회귀가 없는지 확인' }],
  ['first-104-106-detail', { group: 'first', purpose: '1루 104-106 단일화 상세 검수', reviewFocus: '104가 오른쪽 라벨 셀만 소유하고 105/106이 한 칸 밀리지 않는지 확인' }],
  ['first-107-110-detail', { group: 'first', purpose: '1루 107-110 경계 상세 검수', reviewFocus: '108/109/110 경계와 label top-hit 위치 확인' }],
  ['first-109-112-sequence', { group: 'first', purpose: '1루 109-112 하단 연속 블록 검수', reviewFocus: '109-112 순서와 각 path가 공식 색상 셀 밖으로 나가지 않는지 확인' }],
  ['cass-200-detail', { group: 'first', purpose: 'CASS 응원석 200 기준 검수', reviewFocus: '200 특수 셀이 인접 1루 내야/탁자석을 흡수하지 않는지 확인' }],
  ['third-121-124', { group: 'third', purpose: '3루 121-124 split/drift 검수', reviewFocus: '121 split-color 영역과 122-124 경계가 공식 셀과 맞는지 확인' }],
  ['third-120-122-detail', { group: 'third', purpose: '3루 120-122 경계 상세 검수', reviewFocus: '120/121/122 상단 경계가 반 칸 누락 없이 잡혔는지 확인' }],
  ['third-119-121-detail', { group: 'third', purpose: '3루 119-121 경계 상세 검수', reviewFocus: '119/120/121 owner point와 split 영역 확인' }],
  ['third-113-120-sequence', { group: 'third', purpose: '3루 113-120 연속 블록 drift 검수', reviewFocus: '113-120 순서가 밀리지 않고 100C/하단 블록을 흡수하지 않는지 확인' }],
  ['third-113-117-wide', { group: 'third', purpose: '3루 113-117 wide 검수', reviewFocus: '115-117 하단 경계와 113/114 경계의 전체 흐름 확인' }],
  ['third-115-117-detail', { group: 'third', purpose: '3루 115-117 상세 검수', reviewFocus: '115/116/117 path가 스크린샷 이슈 기준 셀에 맞는지 확인' }],
  ['third-116-121-detail', { group: 'third', purpose: '3루 116-121 연속 경계 상세 검수', reviewFocus: '116-121이 117/121 스크린샷 이슈 기준으로 한 칸씩 밀리지 않는지 확인' }],
  ['third-113-114-detail', { group: 'third', purpose: '3루 113/114 경계 상세 검수', reviewFocus: '113/114가 중앙 100C를 흡수하지 않는지 확인' }],
  ['third-213-225-sequence', { group: 'third', purpose: '3루 213-225 하단 소블록 검수', reviewFocus: '213-225 소블록 순서와 하단 좌측 외곽 셀 bounds 확인' }],
  ['third-221-225-detail', { group: 'third', purpose: '3루 221-225 상세 검수', reviewFocus: '221-225 좌측 외곽 소블록이 과대 확장되지 않는지 확인' }],
  ['third-213-219-detail', { group: 'third', purpose: '3루 213-219 상세 검수', reviewFocus: '213-219 하단 소블록 label과 공식 셀 bounds 확인' }],
  ['first-201-212-sequence', { group: 'first', purpose: '1루 201-212 하단 소블록 검수', reviewFocus: '201-212 소블록 순서와 owner point가 자기 블록 안에 있는지 확인' }],
  ['first-4f-table-301-413-sequence', { group: 'first', purpose: '1루 4층 탁자석 301/302/401-413 검수', reviewFocus: '공식 이미지에 없는 303-399가 없고 301/302/401-413만 보이는지 확인' }],
  ['third-4f-table-414-330-sequence', { group: 'third', purpose: '3루 4층 탁자석 414-423/326-330 검수', reviewFocus: '414-423/326-330 sequence와 retired P2 canonical owner 경계 확인' }],
  ['outfield-upper-500-509-sequence', { group: 'outfield', purpose: '외야 상단 500/501-509 검수', reviewFocus: '500 잔디석, 501-508 테이블, 509 지정석 경계 확인' }],
  ['skybox-s01-s12-sequence', { group: 'skybox', purpose: '스카이박스 S01-S12 검수', reviewFocus: '우측 상단 S01-S12 소형 셀이 label-only 예외 없이 crop으로 잠기는지 확인' }],
  ['skybox-s13-s25-sequence', { group: 'skybox', purpose: '스카이박스 S13-S25 검수', reviewFocus: '중앙 하단 S13-S25 소형 셀의 label/top-hit와 path 위치 확인' }],
  ['skybox-s26-s31-sequence', { group: 'skybox', purpose: '스카이박스 S26-S31 검수', reviewFocus: '좌측 S26-S31 소형 셀이 공식 외곽선을 벗어나지 않는지 확인' }],
  ['special-400-accessible-first', { group: 'special', purpose: '400 VIP 및 1루/우측 접근성 검수', reviewFocus: '400/1루 휠체어/우측 외야 휠체어 path가 인접 일반석을 먹지 않는지 확인' }],
  ['special-425-426-third-accessible', { group: 'special', purpose: '425/426/424 및 3루 접근성 검수', reviewFocus: '스플래시존 425/426, 424, 3루 휠체어 경계 확인' }],
  ['special-accessible-center', { group: 'special', purpose: '중앙 휠체어석 검수', reviewFocus: '중앙 접근성 소형 path가 중앙 100구역을 과대 선택하지 않는지 확인' }],
  ['special-accessible-outfield-third', { group: 'special', purpose: '좌측 외야 휠체어석 검수', reviewFocus: '좌측 외야 휠체어석과 501 인접 경계 확인' }],
]);

export const defaultPassCriteria = [
  'visible path stroke가 공식 이미지 색상 셀 내부 또는 실제 경계 위에 머문다.',
  'label dot이 해당 블록 내부의 시각 중심 또는 검수 가능한 라벨 위치에 있다.',
  '표시 highlight는 imageGeometry.d 기준이며 hitAreaD 확장분이 보이지 않는다.',
];

export const defaultRejectCriteria = [
  'path가 인접 공식 블록을 과대 선택하거나 한 칸 밀린 것처럼 보인다.',
  'label dot 또는 대표 owner point가 다른 블록의 top-hit으로 보인다.',
  '공식 이미지에 없는 blockCode나 retired P2 alias가 운영 geometry처럼 보인다.',
];

export const cropCriteriaByGroup = new Map([
  ['home', {
    pass: ['100A/100B/100C 세 계층이 홈 뒤쪽 공식 셀 안에 각각 분리되어 보인다.'],
    reject: ['100A/100B/100C 중 하나가 중앙 테이블/포수 뒤쪽 인접 셀을 흡수한다.'],
  }],
  ['first', {
    pass: ['104 단일 셀, 105-109, 201-212 순서가 공식 이미지 기준으로 밀리지 않는다.'],
    reject: ['104가 좌측 상단 셀까지 먹거나 105-109가 한 칸씩 밀려 보인다.'],
  }],
  ['third', {
    pass: ['121 split-color와 113-120/213-225 연속 블록의 경계가 공식 셀 순서를 유지한다.'],
    reject: ['121이 반 칸 누락되거나 113-117/213-225 중 하나가 인접 셀을 흡수한다.'],
  }],
  ['outfield', {
    pass: ['500/501-509 외야 상단 셀이 공식 외곽선과 색상 경계를 유지한다.'],
    reject: ['500 잔디석 또는 501-509 테이블/지정석이 서로 겹치거나 외곽을 벗어난다.'],
  }],
  ['skybox', {
    pass: ['S01-S31 소형 셀이 label-only 예외 없이 자동 owner-point 회귀 테스트로 잠긴다.'],
    reject: ['스카이박스 셀이 누락되거나 label/top-hit 회귀 테스트 없이 잠긴 것처럼 보인다.'],
  }],
  ['special', {
    pass: ['특수석/휠체어석 path가 인접 일반석을 과대 선택하지 않는다.'],
    reject: ['400/425/426/휠체어석이 주변 일반석 또는 외야 블록을 클릭 영역처럼 덮는다.'],
  }],
]);

export const p0ReviewCropIds = new Set([
  'first-101-109',
  'third-121-124',
  'third-120-122-detail',
  'third-113-117-wide',
]);

export const p1ReviewCropIds = new Set([
  'home-100',
  'first-109-112-sequence',
  'cass-200-detail',
  'third-113-120-sequence',
  'first-201-212-sequence',
  'first-4f-table-301-413-sequence',
  'third-4f-table-414-330-sequence',
  'outfield-upper-500-509-sequence',
]);

export const p2ManualOnlyCropIds = new Set([]);

export const p2ManualOnlyReasonByCropId = new Map([]);

export const riskTagsByCropId = new Map([
  ['home-100', ['100A-100C', 'home-stack', 'visible-path']],
  ['first-101-109', ['104-single-cell', '105-109-drift', 'first-base-sequence']],
  ['first-104-106-detail', ['104-single-cell', '105-106-drift', 'screenshot-regression']],
  ['first-107-110-detail', ['108-109-boundary', 'label-top-hit']],
  ['first-109-112-sequence', ['109-112-drift', 'lower-infield']],
  ['cass-200-detail', ['special-seat', 'adjacent-overlap']],
  ['third-121-124', ['121-split-color', '122-124-boundary', 'third-base-sequence']],
  ['third-120-122-detail', ['120-121-boundary', '121-split-color']],
  ['third-119-121-detail', ['119-121-boundary', 'owner-point']],
  ['third-113-120-sequence', ['113-120-drift', '100C-overlap']],
  ['third-113-117-wide', ['113-117-drift', 'dugout-boundary']],
  ['third-115-117-detail', ['115-117-boundary', 'screenshot-regression']],
  ['third-116-121-detail', ['116-121-drift', '121-split-color', 'screenshot-regression']],
  ['third-113-114-detail', ['113-114-boundary', '100C-overlap']],
  ['third-213-225-sequence', ['213-225-small-blocks', 'lower-third']],
  ['third-221-225-detail', ['221-225-small-blocks', 'left-edge']],
  ['third-213-219-detail', ['213-219-small-blocks', 'label-top-hit']],
  ['first-201-212-sequence', ['201-212-small-blocks', 'first-base-lower']],
  ['first-4f-table-301-413-sequence', ['301-302-401-413', 'no-303-399', 'p2-canonical-owner']],
  ['third-4f-table-414-330-sequence', ['414-423-326-330', 'p2-canonical-owner']],
  ['outfield-upper-500-509-sequence', ['500-509-outfield', 'outfield-boundary']],
  ['skybox-s01-s12-sequence', ['skybox', 'S01-S12', 'small-cell']],
  ['skybox-s13-s25-sequence', ['skybox', 'S13-S25', 'small-cell']],
  ['skybox-s26-s31-sequence', ['skybox', 'S26-S31', 'small-cell']],
  ['special-400-accessible-first', ['400-vip', 'accessible', 'special-overlap']],
  ['special-425-426-third-accessible', ['425-426-424', 'accessible', 'special-overlap']],
  ['special-accessible-center', ['accessible', 'center-small-path']],
  ['special-accessible-outfield-third', ['accessible', 'outfield-small-path']],
]);

export const regressionTestIdsByCropId = new Map([
  ['first-101-109', ['P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION']],
  ['third-121-124', ['P0_THIRD_121_124_SPLIT_COLOR_REGRESSION']],
  ['third-120-122-detail', ['P0_THIRD_120_122_BOUNDARY_REGRESSION']],
  ['third-113-117-wide', ['P0_THIRD_113_117_DRIFT_REGRESSION']],
  ['home-100', ['P1_HOME_100_STACK_REGRESSION']],
  ['first-109-112-sequence', ['P1_FIRST_109_112_SEQUENCE_REGRESSION']],
  ['cass-200-detail', ['P1_CASS_200_SPECIAL_CELL_REGRESSION']],
  ['third-113-120-sequence', ['P1_THIRD_113_120_SEQUENCE_REGRESSION']],
  ['first-201-212-sequence', ['P1_FIRST_201_212_SMALL_BLOCK_REGRESSION']],
  ['first-4f-table-301-413-sequence', ['P1_FIRST_4F_301_413_SEQUENCE_REGRESSION']],
  ['third-4f-table-414-330-sequence', ['P1_THIRD_4F_414_330_SEQUENCE_REGRESSION']],
  ['outfield-upper-500-509-sequence', ['P1_OUTFIELD_500_509_SEQUENCE_REGRESSION']],
  ['first-104-106-detail', ['P2_FIRST_104_106_DETAIL_REGRESSION']],
  ['first-107-110-detail', ['P2_FIRST_107_110_DETAIL_REGRESSION']],
  ['third-119-121-detail', ['P2_THIRD_119_121_DETAIL_REGRESSION']],
  ['third-115-117-detail', ['P2_THIRD_115_117_DETAIL_REGRESSION']],
  ['third-116-121-detail', ['P2_THIRD_116_121_DETAIL_REGRESSION']],
  ['third-113-114-detail', ['P2_THIRD_113_114_DETAIL_REGRESSION']],
  ['third-213-225-sequence', ['P2_THIRD_213_225_SEQUENCE_REGRESSION']],
  ['third-221-225-detail', ['P2_THIRD_221_225_DETAIL_REGRESSION']],
  ['third-213-219-detail', ['P2_THIRD_213_219_DETAIL_REGRESSION']],
  ['skybox-s01-s12-sequence', ['P2_SKYBOX_S01_S12_SEQUENCE_REGRESSION']],
  ['skybox-s13-s25-sequence', ['P2_SKYBOX_S13_S25_SEQUENCE_REGRESSION']],
  ['skybox-s26-s31-sequence', ['P2_SKYBOX_S26_S31_SEQUENCE_REGRESSION']],
  ['special-400-accessible-first', ['P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION']],
  ['special-425-426-third-accessible', ['P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION']],
  ['special-accessible-center', ['P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION']],
  ['special-accessible-outfield-third', ['P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION']],
]);

export const anchorReviewCropDefinitions = [
  {
    id: 'home-100',
    x: 300,
    y: 630,
    width: 270,
    height: 190,
    blocks: [
      'central-reserved-100__100a',
      'central-reserved-100__100b',
      'central-reserved-100__100c',
      'catcher-back-100__100a',
      'catcher-back-100__100b',
      'catcher-back-100__100c',
      'central-table-100__100a',
      'central-table-100__100b',
      'central-table-100__100c',
    ],
  },
  {
    id: 'first-101-109',
    x: 540,
    y: 340,
    width: 230,
    height: 360,
    blocks: [
      'first-infield-b-101-108__101',
      'first-infield-b-101-108__102',
      'first-infield-b-101-108__103',
      'first-infield-b-101-108__104',
      'first-infield-b-101-108__105',
      'first-infield-b-101-108__106',
      'first-infield-b-101-108__107',
      'first-infield-b-101-108__108',
      'first-infield-a-109-112-201-212__109',
    ],
  },
  {
    id: 'first-104-106-detail',
    x: 580,
    y: 455,
    width: 170,
    height: 120,
    blocks: [
      'first-infield-b-101-108__104',
      'first-infield-b-101-108__105',
      'first-infield-b-101-108__106',
    ],
  },
  {
    id: 'first-107-110-detail',
    x: 530,
    y: 540,
    width: 140,
    height: 170,
    blocks: [
      'first-infield-b-101-108__107',
      'first-infield-b-101-108__108',
      'first-infield-a-109-112-201-212__109',
      'first-infield-a-109-112-201-212__110',
    ],
  },
  {
    id: 'first-109-112-sequence',
    x: 495,
    y: 590,
    width: 170,
    height: 165,
    blocks: [
      'first-infield-a-109-112-201-212__109',
      'first-infield-a-109-112-201-212__110',
      'first-infield-a-109-112-201-212__111',
      'first-infield-a-109-112-201-212__112',
    ],
  },
  {
    id: 'cass-200-detail',
    x: 710,
    y: 350,
    width: 85,
    height: 125,
    blocks: [
      'cass-cheering-200__200',
    ],
  },
  {
    id: 'third-121-124',
    x: 130,
    y: 340,
    width: 180,
    height: 220,
    blocks: [
      'third-infield-b-121-124__121',
      'third-infield-b-121-124__122',
      'third-infield-b-121-124__123',
      'third-infield-b-121-124__124',
    ],
  },
  {
    id: 'third-120-122-detail',
    x: 145,
    y: 455,
    width: 150,
    height: 100,
    blocks: [
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
      'third-infield-b-121-124__122',
    ],
  },
  {
    id: 'third-119-121-detail',
    x: 145,
    y: 480,
    width: 190,
    height: 115,
    blocks: [
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
    ],
  },
  {
    id: 'third-113-120-sequence',
    x: 190,
    y: 500,
    width: 210,
    height: 270,
    blocks: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
      'third-infield-a-113-120-213-225__118',
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
    ],
  },
  {
    id: 'third-113-117-wide',
    x: 190,
    y: 540,
    width: 300,
    height: 290,
    blocks: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
    ],
  },
  {
    id: 'third-115-117-detail',
    x: 220,
    y: 575,
    width: 170,
    height: 135,
    blocks: [
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
    ],
  },
  {
    id: 'third-116-121-detail',
    x: 145,
    y: 445,
    width: 200,
    height: 230,
    blocks: [
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
      'third-infield-a-113-120-213-225__118',
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
    ],
  },
  {
    id: 'third-113-114-detail',
    x: 285,
    y: 650,
    width: 120,
    height: 120,
    blocks: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'central-table-100__100c',
    ],
  },
  {
    id: 'third-213-225-sequence',
    x: 105,
    y: 385,
    width: 270,
    height: 430,
    blocks: [
      'third-infield-a-113-120-213-225__213',
      'third-infield-a-113-120-213-225__214',
      'third-infield-a-113-120-213-225__215',
      'third-infield-a-113-120-213-225__216',
      'third-infield-a-113-120-213-225__217',
      'third-infield-a-113-120-213-225__218',
      'third-infield-a-113-120-213-225__219',
      'third-infield-a-113-120-213-225__220',
      'third-infield-a-113-120-213-225__221',
      'third-infield-a-113-120-213-225__222',
      'third-infield-a-113-120-213-225__223',
      'third-infield-a-113-120-213-225__224',
      'third-infield-a-113-120-213-225__225',
    ],
  },
  {
    id: 'third-221-225-detail',
    x: 112,
    y: 425,
    width: 78,
    height: 160,
    blocks: [
      'third-infield-a-113-120-213-225__221',
      'third-infield-a-113-120-213-225__222',
      'third-infield-a-113-120-213-225__223',
      'third-infield-a-113-120-213-225__224',
      'third-infield-a-113-120-213-225__225',
    ],
  },
  {
    id: 'third-213-219-detail',
    x: 230,
    y: 640,
    width: 135,
    height: 180,
    blocks: [
      'third-infield-a-113-120-213-225__213',
      'third-infield-a-113-120-213-225__214',
      'third-infield-a-113-120-213-225__215',
      'third-infield-a-113-120-213-225__216',
      'third-infield-a-113-120-213-225__217',
      'third-infield-a-113-120-213-225__218',
      'third-infield-a-113-120-213-225__219',
    ],
  },
  {
    id: 'first-201-212-sequence',
    x: 515,
    y: 440,
    width: 270,
    height: 380,
    blocks: [
      'first-infield-a-109-112-201-212__201',
      'first-infield-a-109-112-201-212__202',
      'first-infield-a-109-112-201-212__203',
      'first-infield-a-109-112-201-212__204',
      'first-infield-a-109-112-201-212__205',
      'first-infield-a-109-112-201-212__206',
      'first-infield-a-109-112-201-212__207',
      'first-infield-a-109-112-201-212__208',
      'first-infield-a-109-112-201-212__209',
      'first-infield-a-109-112-201-212__210',
      'first-infield-a-109-112-201-212__211',
      'first-infield-a-109-112-201-212__212',
    ],
  },
  {
    id: 'first-4f-table-301-413-sequence',
    x: 500,
    y: 435,
    width: 355,
    height: 500,
    blocks: [
      'first-table-4f-301-413__301',
      'first-table-4f-301-413__302',
      'first-table-4f-301-413__401',
      'first-table-4f-301-413__402',
      'first-table-4f-301-413__403',
      'first-table-4f-301-413__404',
      'first-table-4f-301-413__405',
      'first-table-4f-301-413__406',
      'first-table-4f-301-413__407',
      'first-table-4f-301-413__408',
      'first-table-4f-301-413__409',
      'first-table-4f-301-413__410',
      'first-table-4f-301-413__411',
      'first-table-4f-301-413__412',
      'first-table-4f-301-413__413',
    ],
  },
  {
    id: 'third-4f-table-414-330-sequence',
    x: 60,
    y: 470,
    width: 500,
    height: 470,
    blocks: [
      'third-table-4f-414-330__414',
      'third-table-4f-414-330__415',
      'third-table-4f-414-330__416',
      'third-table-4f-414-330__417',
      'third-table-4f-414-330__418',
      'third-table-4f-414-330__419',
      'third-table-4f-414-330__420',
      'third-table-4f-414-330__421',
      'third-table-4f-414-330__422',
      'third-table-4f-414-330__423',
      'third-table-4f-414-330__326',
      'third-table-4f-414-330__327',
      'third-table-4f-414-330__328',
      'third-table-4f-414-330__329',
      'third-table-4f-414-330__330',
    ],
  },
  {
    id: 'outfield-upper-500-509-sequence',
    x: 120,
    y: 0,
    width: 570,
    height: 340,
    blocks: [
      'outfield-lawn-500__500',
      'outfield-table-third-501-503__501',
      'outfield-table-third-501-503__502',
      'outfield-table-third-501-503__503',
      'outfield-table-first-504-508__504',
      'outfield-table-first-504-508__505',
      'outfield-table-first-504-508__506',
      'outfield-table-first-504-508__507',
      'outfield-table-first-504-508__508',
      'outfield-reserved-509__509',
    ],
  },
  {
    id: 'skybox-s01-s12-sequence',
    x: 650,
    y: 510,
    width: 145,
    height: 225,
    blocks: skyboxBlockIds(1, 12),
  },
  {
    id: 'skybox-s13-s25-sequence',
    x: 415,
    y: 700,
    width: 275,
    height: 170,
    blocks: skyboxBlockIds(13, 25),
  },
  {
    id: 'skybox-s26-s31-sequence',
    x: 155,
    y: 645,
    width: 280,
    height: 225,
    blocks: skyboxBlockIds(26, 31),
  },
  {
    id: 'special-400-accessible-first',
    x: 680,
    y: 400,
    width: 195,
    height: 235,
    blocks: [
      'first-infield-accessible__first-infield',
      'innings-vip-400__400',
      'outfield-accessible-first__right-outfield',
    ],
  },
  {
    id: 'special-425-426-third-accessible',
    x: 45,
    y: 560,
    width: 150,
    height: 175,
    blocks: [
      'splash-caravan-426__426',
      'splash-jacuzzi-425__425',
      'third-infield-accessible__third-infield',
      'outfield-reserved-third-423-330__424',
    ],
  },
  {
    id: 'special-accessible-center',
    x: 410,
    y: 775,
    width: 70,
    height: 50,
    blocks: [
      'central-accessible__center',
    ],
  },
  {
    id: 'special-accessible-outfield-third',
    x: 260,
    y: 25,
    width: 75,
    height: 75,
    blocks: [
      'outfield-accessible-third__left-outfield',
      'outfield-table-third-501-503__501',
    ],
  },
];

export const buildAnchorReviewCrops = (outputDir) => anchorReviewCropDefinitions.map((crop) => ({
  ...crop,
  purpose: cropReviewMeta.get(crop.id)?.purpose ?? 'anchor crop 검수',
  outputPath: path.join(outputDir, `${crop.id}.png`),
}));

const reviewPriorityRank = { P0: 0, P1: 1, P2: 2 };
const reviewModeRank = {
  AUTO_OWNER_POINT_REGRESSION: 0,
  VISUAL_CROP_REVIEW: 1,
  MANUAL_CROP_ONLY: 2,
};

const uniqueSorted = (values) => [...new Set(values)].sort();

export const reviewMetadataForCrop = (crop, blocksById = new Map()) => {
  const meta = cropReviewMeta.get(crop.id) ?? {
    group: 'other',
    purpose: 'anchor crop 검수',
    reviewFocus: '공식 이미지와 overlay path 정렬 확인',
  };
  const groupCriteria = cropCriteriaByGroup.get(meta.group) ?? { pass: [], reject: [] };
  const reviewPriority = p0ReviewCropIds.has(crop.id)
    ? 'P0'
    : p1ReviewCropIds.has(crop.id)
      ? 'P1'
      : 'P2';
  const regressionTestIds = regressionTestIdsByCropId.get(crop.id) ?? [];
  const manualOnlyReason = p2ManualOnlyReasonByCropId.get(crop.id) ?? null;
  const reviewMode = p2ManualOnlyCropIds.has(crop.id)
    ? 'MANUAL_CROP_ONLY'
    : regressionTestIds.length > 0
      ? 'AUTO_OWNER_POINT_REGRESSION'
      : 'VISUAL_CROP_REVIEW';
  const representativeBlocks = crop.blocks.map((blockId) => {
    const block = blocksById.get(blockId);
    return block ? `${block.blockCode} (${block.id})` : blockId;
  });

  return {
    ...meta,
    reviewPriority,
    reviewMode,
    manualOnlyReason,
    riskTags: riskTagsByCropId.get(crop.id) ?? ['anchor-crop'],
    regressionTestIds,
    representativeBlocks,
    passCriteria: [
      meta.reviewFocus,
      ...defaultPassCriteria,
      ...groupCriteria.pass,
    ],
    rejectCriteria: [
      ...defaultRejectCriteria,
      ...groupCriteria.reject,
    ],
  };
};

export const buildAnchorImpactByBlockId = (crops) => crops.reduce((map, crop) => {
  const metadata = reviewMetadataForCrop(crop);

  for (const blockId of crop.blocks) {
    const entries = map.get(blockId) ?? [];
    entries.push({
      cropId: crop.id,
      ...metadata,
    });
    map.set(blockId, entries);
  }

  return map;
}, new Map());

export const coordinateImpactForBlock = (anchorImpactByBlockId, blockId) => {
  const entries = anchorImpactByBlockId.get(blockId) ?? [];
  const reviewPriorities = uniqueSorted(entries.map((entry) => entry.reviewPriority))
    .sort((a, b) => reviewPriorityRank[a] - reviewPriorityRank[b]);
  const reviewModes = uniqueSorted(entries.map((entry) => entry.reviewMode))
    .sort((a, b) => reviewModeRank[a] - reviewModeRank[b]);
  const regressionTestIds = uniqueSorted(entries.flatMap((entry) => entry.regressionTestIds));
  const riskTags = uniqueSorted(entries.flatMap((entry) => entry.riskTags));
  const manualOnlyReasons = uniqueSorted(entries.map((entry) => entry.manualOnlyReason).filter(Boolean));

  return {
    anchorCropIds: uniqueSorted(entries.map((entry) => entry.cropId)),
    regressionTestIds,
    reviewPriority: reviewPriorities[0] ?? 'NONE',
    reviewPriorities,
    reviewMode: reviewModes[0] ?? 'NONE',
    reviewModes,
    riskTags,
    manualOnlyReasons,
  };
};

const impactBlockIds = (blocks, predicate) => blocks
  .filter(predicate)
  .map((block) => block.id);

export const buildCoordinateChangeImpact = (blocks) => {
  const impact = {
    contract: coordinateChangeImpactContract,
    note: '좌표를 수정한 블록은 anchorCropIds와 regressionTestIds를 기준으로 재검수한다.',
    p0BlockIds: impactBlockIds(blocks, (block) => block.reviewPriorities.includes('P0')),
    p1BlockIds: impactBlockIds(blocks, (block) => block.reviewPriorities.includes('P1')),
    p2AutoBlockIds: impactBlockIds(blocks, (block) => (
      block.reviewPriorities.includes('P2')
      && block.reviewModes.includes('AUTO_OWNER_POINT_REGRESSION')
    )),
    p2ManualOnlyBlockIds: impactBlockIds(blocks, (block) => (
      block.reviewPriorities.includes('P2')
      && block.reviewModes.includes('MANUAL_CROP_ONLY')
    )),
    autoRegressionBlockIds: impactBlockIds(blocks, (block) => block.regressionTestIds.length > 0),
    manualCropOnlyBlockIds: impactBlockIds(blocks, (block) => (
      block.reviewMode === 'MANUAL_CROP_ONLY'
      && block.regressionTestIds.length === 0
    )),
    tracedWithoutRegressionBlockIds: impactBlockIds(blocks, (block) => (
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && block.regressionTestIds.length === 0
    )),
    missingImpactBlockIds: impactBlockIds(blocks, (block) => block.anchorCropIds.length === 0),
  };

  impact.counts = {
    p0: impact.p0BlockIds.length,
    p1: impact.p1BlockIds.length,
    p2Auto: impact.p2AutoBlockIds.length,
    p2ManualOnly: impact.p2ManualOnlyBlockIds.length,
    autoRegression: impact.autoRegressionBlockIds.length,
    manualCropOnly: impact.manualCropOnlyBlockIds.length,
    tracedWithoutRegression: impact.tracedWithoutRegressionBlockIds.length,
    missingImpact: impact.missingImpactBlockIds.length,
  };

  return impact;
};
