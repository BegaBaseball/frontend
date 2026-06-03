export type JamsilOfficialDataStatus =
  | 'AVAILABLE'
  | 'AVAILABLE_OFFICIAL_RASTER'
  | 'PARTIAL_AVAILABLE'
  | 'INFERRED_FROM_OFFICIAL_MAP'
  | 'MANUAL_BASEBALL_DATA_REQUIRED'
  | 'FIELD_VALIDATION_REQUIRED';

export type JamsilOfficialSourceType =
  | 'OFFICIAL_PUBLIC_DATA'
  | 'OFFICIAL_SEAT_MAP'
  | 'OFFICIAL_SEAT_MAP_AND_LG_TICKET_PAGE'
  | 'KBO_OFFICIAL'
  | 'KBO_OFFICIAL_LOCATION_REFERENCE'
  | 'OPERATOR_PROVIDED';

export type JamsilOfficialGateType = 'INFIELD' | 'OUTFIELD' | 'CENTRAL';
export type JamsilReadinessRuntimeStatus =
  | 'AVAILABLE'
  | 'PARTIAL_OFFICIAL_SEED'
  | 'INFERRED_FROM_OFFICIAL_MAP'
  | 'MANUAL_BASEBALL_DATA_REQUIRED'
  | 'FIELD_VALIDATION_REQUIRED';

export interface JamsilOfficialStadiumProfile {
  stadiumId: 'JAMSIL';
  stadiumName: string;
  officialName: string;
  address: string;
  operator: readonly string[];
  phone: string;
  fieldAreaSqm: number;
  buildingAreaSqm: number;
  seats: number;
  capacity: number;
  sourceType: 'OFFICIAL_PUBLIC_DATA';
  dataStatus: 'AVAILABLE';
  extractedAt: string;
}

export interface JamsilOfficialSeatGradeRange {
  seatGrade: string;
  sectionNumbers: readonly string[];
  level: string;
  side?: string;
  sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED';
}

export interface JamsilOfficialSpecialSection {
  sectionId: string;
  sectionName: string;
  seatGrade: string;
  side?: string;
  mapPosition: string;
}

export interface JamsilOfficialSeatSectionBaseline {
  stadiumId: 'JAMSIL';
  seatSectionSource: 'LG_TWINS_2026_OFFICIAL_SEAT_MAP';
  normalSectionRanges: readonly string[];
  specialSections: readonly JamsilOfficialSpecialSection[];
}

export interface JamsilOfficialWheelchairSeatLocation {
  sectionId: string;
  wheelchairAccessible: true;
  wheelchairLocationText: string;
}

export interface JamsilOfficialGate {
  gateId: string;
  gateName: string;
  officialGateLabel: string;
  side: string;
  gateType: JamsilOfficialGateType;
  status: 'AVAILABLE' | 'RESTRICTED_OR_NEEDS_OPERATOR_CONFIRMATION';
  sourceType: 'OFFICIAL_SEAT_MAP';
  notes?: string;
}

export interface JamsilOfficialFacility {
  facilityId: string;
  facilityName: string;
  category: string;
  locationText: string;
  openStatus?: 'GAME_DAY_OPERATION' | 'NEEDS_OPERATOR_CONFIRMATION';
  hours?: {
    weekday?: string;
    weekendHoliday?: string;
  };
  relatedGateId?: string;
  reservationPhone?: string;
  sourceType: JamsilOfficialSourceType;
}

export interface JamsilOfficialMapInferredGateCandidate {
  sectionRange: string;
  candidateGateId: string;
  gateName: string;
  priority: 1;
  reason: string;
  walkingMinutes: null;
  accessible: null;
  status: 'INFERRED_FROM_OFFICIAL_MAP';
  officialVerified: false;
}

export interface JamsilManualOperatorDataGaps {
  stadiumId: 'JAMSIL';
  facilityLinkStatus: 'MANUAL_BASEBALL_DATA_REQUIRED';
  missingOfficialFields: readonly string[];
}

export interface JamsilFieldValidationRouteCandidate {
  routeId: string;
  station: string;
  publicTransportText: string;
  candidateFlowText: string;
  mappedGateIds: readonly string[];
  sectionRanges: readonly string[];
  sourceType: 'OFFICIAL_PUBLIC_DATA';
  validationStatus: 'FIELD_VALIDATION_REQUIRED';
  missingFields: readonly string[];
}

export interface JamsilFoodFacilityCollectionField {
  field: string;
  required: boolean;
  example: string;
  note: string;
}

export interface JamsilFoodFacilityCollectionSchema {
  status: 'MANUAL_BASEBALL_DATA_REQUIRED';
  category: 'CONCESSION';
  allowedFloors: readonly number[];
  requiredFields: readonly JamsilFoodFacilityCollectionField[];
  runtimeRule: string;
}

export type JamsilSecondaryFoodZoneSide = 'FIRST_BASE' | 'THIRD_BASE' | 'OUTFIELD' | 'MIXED';

export interface JamsilSecondaryFoodZoneCandidate {
  zoneId: string;
  floors: readonly number[];
  side: JamsilSecondaryFoodZoneSide;
  locationText: string;
  storeNames: readonly string[];
  nearFacilityNames?: readonly string[];
  sourceDocumentId: string;
  sourceType: 'SECONDARY_MAP_DERIVED';
  dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION';
  runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED';
  operatorRequiredFields: readonly string[];
}

export interface JamsilProductionDataReadiness {
  item: string;
  label: string;
  runtimeStatus: JamsilReadinessRuntimeStatus;
  serviceUsage: string;
  requiredAction: string;
}

export const JAMSIL_OFFICIAL_STADIUM_PROFILE: JamsilOfficialStadiumProfile = {
  stadiumId: 'JAMSIL',
  stadiumName: '잠실야구장',
  officialName: '잠실종합운동장 야구장',
  address: '서울특별시 송파구 올림픽로 25',
  operator: ['LG스포츠', '두산베어스'],
  phone: '02-2202-3834',
  fieldAreaSqm: 26331,
  buildingAreaSqm: 45312,
  seats: 24411,
  capacity: 25000,
  sourceType: 'OFFICIAL_PUBLIC_DATA',
  dataStatus: 'AVAILABLE',
  extractedAt: '2026-05-31',
};

export const JAMSIL_OFFICIAL_SEAT_SECTION_BASELINE: JamsilOfficialSeatSectionBaseline = {
  stadiumId: 'JAMSIL',
  seatSectionSource: 'LG_TWINS_2026_OFFICIAL_SEAT_MAP',
  normalSectionRanges: ['101-122', '201-226', '301-334', '401-422'],
  specialSections: [
    {
      sectionId: 'JAMSIL_PREMIUM',
      sectionName: '프리미엄석',
      seatGrade: '프리미엄석',
      mapPosition: '홈플레이트 뒤 중앙',
    },
    {
      sectionId: 'JAMSIL_EXCITING_1B',
      sectionName: '익사이팅존 1루',
      seatGrade: '익사이팅존',
      side: '1루',
      mapPosition: '1루 파울라인 인접',
    },
    {
      sectionId: 'JAMSIL_EXCITING_3B',
      sectionName: '익사이팅존 3루',
      seatGrade: '익사이팅존',
      side: '3루',
      mapPosition: '3루 파울라인 인접',
    },
  ],
};

export const JAMSIL_OFFICIAL_SEAT_GRADE_RANGES: readonly JamsilOfficialSeatGradeRange[] = [
  {
    seatGrade: '레드석',
    sectionNumbers: ['101-106', '117-122', '201-204', '223-226'],
    level: '내야 하단/중단',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '블루석',
    sectionNumbers: ['107-109', '114-116', '209-211', '216-218'],
    level: '내야 하단/중단',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '테이블석',
    sectionNumbers: ['110-113', '212-215'],
    level: '내야 중앙',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '오렌지석',
    sectionNumbers: ['205-208', '219-222'],
    level: '내야 응원 구역',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '네이비석',
    sectionNumbers: ['301-334'],
    level: '내야 상단',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '그린응원석',
    sectionNumbers: ['405-408'],
    level: '외야',
    side: '1루 외야',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
  {
    seatGrade: '그린석',
    sectionNumbers: ['401-404', '409-422'],
    level: '외야',
    sourceStatus: 'OFFICIAL_SEAT_MAP_EXTRACTED',
  },
];

export const JAMSIL_OFFICIAL_WHEELCHAIR_SEAT_LOCATIONS: readonly JamsilOfficialWheelchairSeatLocation[] = [
  {
    sectionId: 'JAMSIL_101',
    wheelchairAccessible: true,
    wheelchairLocationText: '101B / 1루 101~102B',
  },
  {
    sectionId: 'JAMSIL_102',
    wheelchairAccessible: true,
    wheelchairLocationText: '1루 101~102B',
  },
  {
    sectionId: 'JAMSIL_109',
    wheelchairAccessible: true,
    wheelchairLocationText: '1루 109B',
  },
  {
    sectionId: 'JAMSIL_114',
    wheelchairAccessible: true,
    wheelchairLocationText: '3루 114B',
  },
  {
    sectionId: 'JAMSIL_121',
    wheelchairAccessible: true,
    wheelchairLocationText: '3루 121~122B',
  },
  {
    sectionId: 'JAMSIL_122',
    wheelchairAccessible: true,
    wheelchairLocationText: '122B / 3루 121~122B',
  },
];

export const JAMSIL_OFFICIAL_GATE_MASTER: readonly JamsilOfficialGate[] = [
  {
    gateId: 'JAMSIL_GATE_2_3',
    gateName: '1루 내야 출입구',
    officialGateLabel: '2-3 Gate',
    side: '1루',
    gateType: 'INFIELD',
    status: 'AVAILABLE',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    gateId: 'JAMSIL_GATE_2_1',
    gateName: '3루 내야 출입구',
    officialGateLabel: '2-1 Gate',
    side: '3루',
    gateType: 'INFIELD',
    status: 'AVAILABLE',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    gateId: 'JAMSIL_GATE_1_4',
    gateName: '1루 외야 출입구',
    officialGateLabel: '1-4 Gate',
    side: '1루',
    gateType: 'OUTFIELD',
    status: 'AVAILABLE',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    gateId: 'JAMSIL_GATE_1_3',
    gateName: '3루 외야 출입구',
    officialGateLabel: '1-3 Gate',
    side: '3루',
    gateType: 'OUTFIELD',
    status: 'AVAILABLE',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    gateId: 'JAMSIL_GATE_1_1',
    gateName: '중앙문',
    officialGateLabel: '1-1 Gate',
    side: '중앙',
    gateType: 'CENTRAL',
    status: 'RESTRICTED_OR_NEEDS_OPERATOR_CONFIRMATION',
    sourceType: 'OFFICIAL_SEAT_MAP',
    notes: '두산 홈구장 안내 기준 중앙 출입구는 기자 및 구단 관계자용',
  },
];

export const JAMSIL_OFFICIAL_MAP_INFERRED_GATE_CANDIDATES: readonly JamsilOfficialMapInferredGateCandidate[] = [
  {
    sectionRange: '101-116',
    candidateGateId: 'JAMSIL_GATE_2_3',
    gateName: '1루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 1루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '201-213',
    candidateGateId: 'JAMSIL_GATE_2_3',
    gateName: '1루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 1루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '301-318',
    candidateGateId: 'JAMSIL_GATE_2_3',
    gateName: '1루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 1루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '117-122',
    candidateGateId: 'JAMSIL_GATE_2_1',
    gateName: '3루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 3루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '214-226',
    candidateGateId: 'JAMSIL_GATE_2_1',
    gateName: '3루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 3루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '319-334',
    candidateGateId: 'JAMSIL_GATE_2_1',
    gateName: '3루 내야 출입구',
    priority: 1,
    reason: '공식 좌석도상 3루 내야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '401-411',
    candidateGateId: 'JAMSIL_GATE_1_4',
    gateName: '1루 외야 출입구',
    priority: 1,
    reason: '공식 좌석도상 1루 외야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
  {
    sectionRange: '412-422',
    candidateGateId: 'JAMSIL_GATE_1_3',
    gateName: '3루 외야 출입구',
    priority: 1,
    reason: '공식 좌석도상 3루 외야 출입구와 인접',
    walkingMinutes: null,
    accessible: null,
    status: 'INFERRED_FROM_OFFICIAL_MAP',
    officialVerified: false,
  },
];

export const JAMSIL_OFFICIAL_FACILITY_MASTER: readonly JamsilOfficialFacility[] = [
  {
    facilityId: 'JAMSIL_TICKET_OFFICE_MAIN',
    facilityName: '중앙매표소',
    category: '매표소',
    locationText: '3루 외야 출입구 인접 / 공식 좌석도 기준 좌측 외야 방향',
    openStatus: 'GAME_DAY_OPERATION',
    hours: {
      weekday: '경기 시작 1시간 30분 전 ~ 7회 초',
      weekendHoliday: '경기 시작 2시간 전 ~ 7회 초',
    },
    sourceType: 'OFFICIAL_SEAT_MAP_AND_LG_TICKET_PAGE',
  },
  {
    facilityId: 'JAMSIL_TICKET_OFFICE_1',
    facilityName: '제1매표소',
    category: '매표소',
    locationText: '외야 중앙/1루 외야 방향',
    openStatus: 'GAME_DAY_OPERATION',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    facilityId: 'JAMSIL_TICKET_OFFICE_2',
    facilityName: '제2매표소',
    category: '매표소',
    locationText: '1루 내야 출입구 인접',
    openStatus: 'GAME_DAY_OPERATION',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    facilityId: 'JAMSIL_TICKET_OFFICE_3',
    facilityName: '제3매표소',
    category: '매표소',
    locationText: '1루 외야 출입구 인접 / 종합운동장역 5번 출구 기준 좌측',
    openStatus: 'GAME_DAY_OPERATION',
    sourceType: 'OFFICIAL_SEAT_MAP_AND_LG_TICKET_PAGE',
  },
  {
    facilityId: 'JAMSIL_LG_OUTER_STORE',
    facilityName: 'LG트윈스 외부매장',
    category: '굿즈샵',
    locationText: '외야 중앙 412~413블록 뒤쪽 방향',
    openStatus: 'NEEDS_OPERATOR_CONFIRMATION',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    facilityId: 'JAMSIL_SCOREBOARD',
    facilityName: '전광판',
    category: '전광판',
    locationText: '외야 중앙 411~412블록 사이',
    sourceType: 'OFFICIAL_SEAT_MAP',
  },
  {
    facilityId: 'JAMSIL_KBO_AUDIO_SUPPORT_DESK',
    facilityName: 'KBO 중계 음성 지원 안내데스크',
    category: '접근성지원',
    locationText: '1루 내야 2-3 게이트, 글러브 대여소 옆',
    relatedGateId: 'JAMSIL_GATE_2_3',
    openStatus: 'GAME_DAY_OPERATION',
    reservationPhone: '1666-0720',
    sourceType: 'KBO_OFFICIAL',
  },
  {
    facilityId: 'JAMSIL_GLOVE_RENTAL_DESK',
    facilityName: '글러브 대여소',
    category: '대여소',
    locationText: '1루 내야 2-3 게이트 인근',
    relatedGateId: 'JAMSIL_GATE_2_3',
    openStatus: 'NEEDS_OPERATOR_CONFIRMATION',
    sourceType: 'KBO_OFFICIAL_LOCATION_REFERENCE',
  },
];

export const JAMSIL_MANUAL_OPERATOR_DATA_GAPS: JamsilManualOperatorDataGaps = {
  stadiumId: 'JAMSIL',
  facilityLinkStatus: 'MANUAL_BASEBALL_DATA_REQUIRED',
  missingOfficialFields: [
    'sectionId별 가까운 매점',
    'sectionId별 가까운 화장실',
    'sectionId별 가까운 편의점',
    'sectionId별 엘리베이터/수유실 위치',
    'walkingMinutes',
    'distanceRank',
    'facility openStatus',
    '혼잡도',
    '휠체어 접근 가능 여부',
    '경기일별 임시 동선 공지',
  ],
};

export const JAMSIL_FIELD_VALIDATION_ROUTE_CANDIDATES: readonly JamsilFieldValidationRouteCandidate[] = [
  {
    routeId: 'JAMSIL_ROUTE_PUBLIC_TRANSIT_PRIMARY',
    station: '종합운동장역',
    publicTransportText: '지하철 2호선, 9호선 종합운동장역 5,6번 출구',
    candidateFlowText: '종합운동장역 5/6번 출구 -> 중앙매표소/외야 방향 -> 좌석 권역별 출입구',
    mappedGateIds: ['JAMSIL_GATE_2_3', 'JAMSIL_GATE_2_1', 'JAMSIL_GATE_1_4', 'JAMSIL_GATE_1_3'],
    sectionRanges: ['101-122', '201-226', '301-334', '401-422'],
    sourceType: 'OFFICIAL_PUBLIC_DATA',
    validationStatus: 'FIELD_VALIDATION_REQUIRED',
    missingFields: [
      '권역별 실측 이동시간',
      '경기일 혼잡 우회 동선',
      '휠체어/유모차 접근 가능 여부',
      '홈팀별 출입구 운영 변경 여부',
    ],
  },
];

export const JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA: JamsilFoodFacilityCollectionSchema = {
  status: 'MANUAL_BASEBALL_DATA_REQUIRED',
  category: 'CONCESSION',
  allowedFloors: [1, 2, 3, 4],
  requiredFields: [
    {
      field: 'facilityId',
      required: true,
      example: 'jamsil-facility-concession-001',
      note: '서비스 내부에서 고정되는 매점 지점 ID',
    },
    {
      field: 'facilityName',
      required: true,
      example: '브랜드명',
      note: '운영자 또는 현장 검수자가 확인한 실제 표시명',
    },
    {
      field: 'floor',
      required: true,
      example: '2',
      note: '공식 층별 안내 또는 현장 검수 기준 층수',
    },
    {
      field: 'nearSectionIds',
      required: true,
      example: 'block-109;block-110',
      note: '가까운 좌석 구역 ID 목록',
    },
    {
      field: 'side',
      required: true,
      example: 'FIRST_BASE',
      note: '1루/3루/외야/혼합 권역 구분',
    },
    {
      field: 'locationText',
      required: true,
      example: '109블록 뒤 콘코스',
      note: '사용자에게 노출 가능한 위치 설명',
    },
    {
      field: 'openStatus',
      required: true,
      example: 'OPEN',
      note: '경기일 운영 여부와 임시 휴점 여부',
    },
    {
      field: 'accessible',
      required: false,
      example: 'UNKNOWN',
      note: '휠체어/유모차 접근 가능 여부',
    },
    {
      field: 'walkingMinutes',
      required: false,
      example: 'UNKNOWN',
      note: '좌석 블록 기준 실측 이동시간',
    },
    {
      field: 'verificationStatus',
      required: true,
      example: 'OPERATOR_CONFIRMED',
      note: '후보 자료를 확정 운영자 row로 승격했는지 여부',
    },
  ],
  runtimeRule: '운영자 검수 전에는 매점/화장실/도보시간을 좌석 상세 패널의 확정 데이터로 노출하지 않는다.',
};

const JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID = 'jamsil-secondary-map-derived-20260531-user-paste-v1';
const JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS = [
  'facilityId',
  'facilityName',
  'floor',
  'side',
  'nearSectionIds',
  'locationText',
  'openStatus',
  'verificationStatus',
] as const;

export const JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES: readonly JamsilSecondaryFoodZoneCandidate[] = [
  {
    zoneId: 'JAMSIL_FOOD_1F_3B_OUTSIDE',
    floors: [1],
    side: 'THIRD_BASE',
    locationText: '1층 외부, 3루 내야 출입구 / Gate 1-3 주변',
    storeNames: ['카페희다', 'BHC', '델리스푼/미스터피자', 'GS25', '한식 분식', '맘스터치', 'BBQ'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
  {
    zoneId: 'JAMSIL_FOOD_1F_1B_OUTSIDE',
    floors: [1],
    side: 'FIRST_BASE',
    locationText: '1층 외부, 1루 내야 출입구 / Gate 1-2 주변',
    storeNames: ['도미노피자', '광장식당', 'KFC', '꼬꼬닭', 'GS25'],
    nearFacilityNames: ['제2매표소', '제3매표소'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
  {
    zoneId: 'JAMSIL_FOOD_OUTFIELD_BACKSIDE',
    floors: [1],
    side: 'OUTFIELD',
    locationText: '외야 전광판 뒤쪽 / 외야 중앙부',
    storeNames: ['수내닭꼬치', '명인만두', '맘스터치', 'BBQ', 'GS25', '트윈스팀스토어', '베어스하우스'],
    nearFacilityNames: ['제1매표소', '무인발권기', '중앙매표소'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
  {
    zoneId: 'JAMSIL_FOOD_2F_3B_CONCOURSE',
    floors: [2],
    side: 'THIRD_BASE',
    locationText: '2층 3루 내야 콘코스',
    storeNames: ['BHC', '카페그라운드', '피자헛', '명인만두', '죠스떡볶이', '통밥', '달콤', '와팡', 'KFC', 'BBQ', 'GS25', '원정 구단 상품샵', '구단 상품샵'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
  {
    zoneId: 'JAMSIL_FOOD_2F_1B_CONCOURSE',
    floors: [2],
    side: 'FIRST_BASE',
    locationText: '2층 1루 내야 콘코스',
    storeNames: ['구단상품샵', 'GS25', 'BBQ', '맘스터치', '꼬꼬닭카페', '안내데스크', '공씨네주먹밥', 'Miss&Mr Potato', '달콤커피', '신철판', '명인만두', '백미당', '맥주창고', '죠스떡볶이', '앤티앤스 프레즐', '피자헛', 'BHC'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
  {
    zoneId: 'JAMSIL_FOOD_3F_4F',
    floors: [3, 4],
    side: 'MIXED',
    locationText: '3층 및 4층 매점 후보',
    storeNames: ['GS25', '스태프핫도그', 'KFC', '와팡', 'BBQ', '맘스터치', '올떡', '제발시켜주세요'],
    sourceDocumentId: JAMSIL_SECONDARY_FOOD_CANDIDATE_SOURCE_ID,
    sourceType: 'SECONDARY_MAP_DERIVED',
    dataStatus: 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION',
    runtimeExposure: 'DISABLED_UNTIL_OPERATOR_CONFIRMED',
    operatorRequiredFields: JAMSIL_SECONDARY_FOOD_REQUIRED_FIELDS,
  },
];

export const JAMSIL_PRODUCTION_DATA_READINESS: readonly JamsilProductionDataReadiness[] = [
  {
    item: 'seatSections',
    label: '좌석 구역',
    runtimeStatus: 'AVAILABLE',
    serviceUsage: '공식 좌석도 asset과 block hit-area 기준으로 서비스 노출 가능',
    requiredAction: '좌표/asset release lock 유지',
  },
  {
    item: 'gateMaster',
    label: '출입구 master',
    runtimeStatus: 'PARTIAL_OFFICIAL_SEED',
    serviceUsage: '공식 좌석도 기반 출입구 후보로 서비스 노출 가능',
    requiredAction: '경기일 실제 운영 여부는 운영자 검수로 보강',
  },
  {
    item: 'sectionGateMapping',
    label: '좌석별 권장 출입구',
    runtimeStatus: 'INFERRED_FROM_OFFICIAL_MAP',
    serviceUsage: '후보 상태를 UI 문구와 caution note에 표시한 상태로 제한 노출',
    requiredAction: '좌석 범위별 실제 권장 출입구 검수',
  },
  {
    item: 'ticketOffice',
    label: '매표소',
    runtimeStatus: 'PARTIAL_OFFICIAL_SEED',
    serviceUsage: '공식 공개자료 확인 시설로 가까운 편의시설에 제한 노출',
    requiredAction: '경기일 운영 시간/대기열 위치 운영자 확인',
  },
  {
    item: 'accessibilityFacilities',
    label: '접근성 시설',
    runtimeStatus: 'PARTIAL_OFFICIAL_SEED',
    serviceUsage: '공개 확인 가능한 KBO 중계 음성 지원 안내데스크만 제한 노출',
    requiredAction: '휠체어/유모차/엘리베이터 동선 검수',
  },
  {
    item: 'foodStores',
    label: '매점',
    runtimeStatus: 'MANUAL_BASEBALL_DATA_REQUIRED',
    serviceUsage: '운영자 또는 현장 검수 전에는 확정값으로 노출하지 않음',
    requiredAction: '층/브랜드/블록 인접도/openStatus 수집',
  },
  {
    item: 'restrooms',
    label: '화장실',
    runtimeStatus: 'MANUAL_BASEBALL_DATA_REQUIRED',
    serviceUsage: '좌석 상세 패널은 수동 자료 필요 fallback 유지',
    requiredAction: '층/블록 인접도/접근성 여부 수집',
  },
  {
    item: 'realWalkingMinutes',
    label: '실측 이동시간',
    runtimeStatus: 'FIELD_VALIDATION_REQUIRED',
    serviceUsage: '동선 후보 문구는 노출하되 분 단위 시간은 노출하지 않음',
    requiredAction: '권역별 현장 실측',
  },
  {
    item: 'congestionData',
    label: '혼잡도',
    runtimeStatus: 'FIELD_VALIDATION_REQUIRED',
    serviceUsage: '서비스 확정 데이터로 사용하지 않음',
    requiredAction: '경기일 시간대별 운영자/현장 데이터 확보',
  },
];
