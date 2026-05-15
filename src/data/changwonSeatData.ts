// Changwon NC Park seat data.
// Keep this static: do not add runtime crawling or web-search data collection.

export type ChangwonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type ChangwonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type ChangwonLevel = '1F' | '2F' | '3F' | '4F' | 'OUTFIELD';
export type ChangwonSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type ChangwonSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';
export type ChangwonTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'NEEDS_OPERATOR_REVIEW';
export type ChangwonTraceMethod = 'PATH_TRACED_FROM_OFFICIAL_IMAGE';
export type ChangwonTraceSource = 'OFFICIAL_PNG_MANUAL_POLYGON';
export type ChangwonPixelAlignmentStatus = 'PIXEL_ALIGNED' | 'MANUAL_REVIEW_REQUIRED';

export interface ChangwonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
  traceStatus: ChangwonTraceStatus;
  traceMethod: ChangwonTraceMethod;
  traceSource: ChangwonTraceSource;
  traceVersion: string;
  manualReviewed: boolean;
  pixelAlignmentStatus: ChangwonPixelAlignmentStatus;
  manualReviewNote?: string;
  hitStrokeWidth?: number;
}

export interface ChangwonPoint {
  x: number;
  y: number;
}

export interface ChangwonBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ChangwonOfficialTraceReference {
  numberAnchor: ChangwonPoint;
  expectedBounds: ChangwonBounds;
  expectedSubpathCount: number;
}

export interface ChangwonSeatMapImage {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: ChangwonSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface ChangwonSeatMapViewport {
  cropY: number;
  cropHeight: number;
}

export interface ChangwonBlock {
  id: string;
  level: ChangwonLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: ChangwonSide;
  fanRole: ChangwonFanRole;
  seatTypes: string[];
  sourceConfidence: ChangwonSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: ChangwonImageGeometry;
  accessibilityNote?: string;
}

export interface ChangwonCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface ChangwonViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface ChangwonCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
  levels?: ChangwonLevel[] | null;
  fanRoles?: ChangwonFanRole[] | null;
  accessibilityOnly?: boolean;
}

interface ChangwonBlockSpec {
  block: string;
  level: ChangwonLevel;
  side: ChangwonSide;
  fanRole: ChangwonFanRole;
  category: string;
  name: string;
  seatTypes: string[];
  aliasExtra: string[];
  imageGeometry: ChangwonImageGeometry;
}

export const CHANGWON_SEATMAP_IMAGE: ChangwonSeatMapImage = {
  imagePath: 'src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png',
  imageWidth: 1960,
  imageHeight: 2546,
  sourceLabel: 'NC 다이노스 공식 티켓 안내 좌석도',
  sourceUrl: 'https://www.ncdinos.com/dinos/stadium.do',
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'changwon-nc-seatmap-official-2026.png',
};

export const CHANGWON_SEATMAP_VIEWPORT: ChangwonSeatMapViewport = {
  cropY: 220,
  cropHeight: 1720,
};

export const CHANGWON_CATEGORIES: Record<string, ChangwonCategory> = {
  PREMIUM: { label: '프리미엄석', light: '#315288', dark: '#5B7CB0', textLight: '#172554', textDark: '#DBEAFE' },
  PREMIUM_TABLE: { label: '프리미엄 테이블석', light: '#7C3AED', dark: '#A78BFA', textLight: '#4C1D95', textDark: '#EDE9FE' },
  TABLE: { label: '테이블석', light: '#0F766E', dark: '#2DD4BF', textLight: '#134E4A', textDark: '#CCFBF1' },
  MINI_TABLE: { label: '미니테이블석', light: '#0891B2', dark: '#22D3EE', textLight: '#164E63', textDark: '#CFFAFE' },
  INFIELD: { label: '내야석', light: '#2563EB', dark: '#60A5FA', textLight: '#1E3A8A', textDark: '#DBEAFE' },
  OUTFIELD: { label: '외야석', light: '#16A34A', dark: '#4ADE80', textLight: '#14532D', textDark: '#DCFCE7' },
  OUTFIELD_GRASS: { label: '외야 잔디석', light: '#65A30D', dark: '#A3E635', textLight: '#365314', textDark: '#ECFCCB' },
  CHEERING: { label: '응원석', light: '#C8102E', dark: '#EF4D62', textLight: '#7F1D1D', textDark: '#FECACA' },
  AWAY: { label: '원정 응원석', light: '#F97316', dark: '#FB923C', textLight: '#7C2D12', textDark: '#FFEDD5' },
  BBQ: { label: '바베큐석', light: '#92400E', dark: '#D97706', textLight: '#451A03', textDark: '#FEF3C7' },
  PICNIC_TABLE: { label: '피크닉 테이블석', light: '#8B7350', dark: '#A88A5E', textLight: '#3F2F17', textDark: '#FEF3C7' },
  ROUND_TABLE: { label: '라운드 테이블석', light: '#6FA0CA', dark: '#93C5FD', textLight: '#1E3A8A', textDark: '#DBEAFE' },
  BULLPEN_FAMILY: { label: '불펜 가족석', light: '#DB2777', dark: '#F472B6', textLight: '#831843', textDark: '#FCE7F3' },
  OUTFIELD_COUNTER: { label: '외야 카운터석', light: '#4C1D95', dark: '#8B5CF6', textLight: '#312E81', textDark: '#EDE9FE' },
  OUTFIELD_FAMILY: { label: '외야 가족석', light: '#A39BC8', dark: '#C4B5FD', textLight: '#4C1D95', textDark: '#EDE9FE' },
  SKYBOX: { label: '스카이박스', light: '#4F46E5', dark: '#818CF8', textLight: '#312E81', textDark: '#E0E7FF' },
  ACCESSIBLE: { label: '휠체어석', light: '#06B6D4', dark: '#22D3EE', textLight: '#164E63', textDark: '#CFFAFE' },
};

export const CHANGWON_CATEGORY_GROUPS: ChangwonCategoryGroup[] = [
  { id: 'all', label: '전체', cats: null },
  { id: 'level1', label: '1층', cats: null, levels: ['1F', 'OUTFIELD'] },
  { id: 'level2', label: '2층', cats: null, levels: ['2F'] },
  { id: 'level34', label: '3·4층', cats: null, levels: ['3F', '4F'] },
  { id: 'cheer', label: '응원석', cats: ['CHEERING', 'AWAY'], fanRoles: ['HOME', 'AWAY'] },
  { id: 'outfield-special', label: '외야·특수', cats: ['OUTFIELD', 'OUTFIELD_GRASS', 'TABLE', 'BBQ', 'PICNIC_TABLE', 'ROUND_TABLE', 'BULLPEN_FAMILY', 'OUTFIELD_COUNTER', 'OUTFIELD_FAMILY', 'SKYBOX'] },
  { id: 'accessible', label: '휠체어', cats: ['ACCESSIBLE'], accessibilityOnly: true },
];

export const CHANGWON_VIEW_INFO: Record<string, ChangwonViewInfo> = {
  default: {
    photos: 0,
    rating: null,
    distance: '운영자 제공 시야 데이터 기준',
    notes: '시야 사진은 다이어리에 공유된 사용자 사진만 표시합니다.',
    tags: ['공식 좌석도', '블록 단위'],
  },
};

const range = (start: number, end: number) => (
  Array.from({ length: end - start + 1 }, (_, index) => String(start + index))
);

export const CHANGWON_EXPECTED_VISIBLE_BLOCKS = [
  ...range(101, 138),
  ...range(201, 223),
  ...range(301, 315),
  ...range(321, 333),
  ...range(401, 416),
  '420',
  ...range(422, 429),
  ...range(431, 433),
];

export const CHANGWON_SPECIAL_SELECTABLE_AREAS = [
  '1루 바베큐석',
  '3루 라운드 테이블석',
  '1루 라운드 테이블석',
  '1루 테이블석',
  '외야 카운터석',
  '외야 가족석',
];

export const CHANGWON_EXPECTED_SELECTABLE_AREAS = [
  ...CHANGWON_EXPECTED_VISIBLE_BLOCKS,
  ...CHANGWON_SPECIAL_SELECTABLE_AREAS,
];

export const CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS = [
  '113',
  '125',
  '129',
  '137',
  '326',
  '412',
  '426',
  '428',
];

export const CHANGWON_TRACE_ANCHOR_TOLERANCE_PX = 2;
export const CHANGWON_TRACE_BOUNDS_TOLERANCE_PX = 0;

const CHANGWON_PRECISION_IMAGE_GEOMETRY_ENTRIES: [string, ChangwonImageGeometry][] = [
  ['101', {
    d: 'M 1372 753 L 1393 732 L 1407 742 L 1407 753 Z M 1410 716 L 1437 689 L 1437 753 L 1410 753 Z',
    labelX: 1391.8,
    labelY: 746.6,
    labelRotate: -3,
    labelFontSize: 18,
    shortLabel: '101',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 101 includes a separated right premium component; both components reviewed from overlay crop.',
  }],
  ['102', {
    d: 'M 1319 806 L 1365 760 L 1407 760 L 1407 807 L 1319 807 Z M 1410 761 L 1437 761 L 1437 807 L 1410 807 Z',
    labelX: 1370.6,
    labelY: 786.6,
    labelRotate: -3,
    labelFontSize: 18,
    shortLabel: '102',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 102 includes a separated right premium component; both components reviewed from overlay crop.',
  }],
  ['103', {
    d: 'M 1273 852 L 1311 814 L 1407 814 L 1407 861 L 1273 861 Z M 1410 814 L 1436 814 L 1437 815 L 1437 860 L 1410 860 Z',
    labelX: 1344.7,
    labelY: 839,
    labelRotate: -3,
    labelFontSize: 18,
    shortLabel: '103',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 103 includes a separated right premium component; both components reviewed from overlay crop.',
  }],
  ['104', {
    d: 'M 1264 894 L 1273 868 L 1407 868 L 1407 976 L 1406 976 L 1404 975 L 1390 967 L 1293 911 L 1274 900 Z M 1410 868 L 1437 868 L 1437 924 L 1433 931 L 1411 969 L 1410 970 Z',
    labelX: 1350.3,
    labelY: 906.5,
    labelRotate: -3,
    labelFontSize: 18,
    shortLabel: '104',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 104 includes a separated right premium component; both components reviewed from overlay crop.',
  }],
  ['105', {
    d: 'M 1238 939 L 1240 935 L 1252 914 L 1259 902 L 1261 900 L 1267 903 L 1281 911 L 1307 926 L 1378 967 L 1397 978 L 1402 981 L 1403 982 L 1403 983 L 1400 989 L 1385 1015 L 1382 1020 L 1380 1022 L 1378 1021 L 1357 1009 L 1286 968 L 1241 942 L 1238 940 Z',
    labelX: 1317.7,
    labelY: 959.3,
    labelRotate: -18,
    labelFontSize: 18,
    shortLabel: '105',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['106', {
    d: 'M 1212 984 L 1214 980 L 1226 959 L 1233 947 L 1234 946 L 1235 946 L 1241 949 L 1248 953 L 1274 968 L 1345 1009 L 1364 1020 L 1369 1023 L 1366 1029 L 1351 1055 L 1348 1060 L 1346 1063 L 1345 1063 L 1331 1055 L 1305 1040 L 1234 999 L 1215 988 L 1212 986 Z',
    labelX: 1290,
    labelY: 1004.3,
    labelRotate: -22,
    labelFontSize: 18,
    shortLabel: '106',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['107', {
    d: 'M 1185 1030 L 1200 1004 L 1207 992 L 1209 992 L 1215 995 L 1267 1025 L 1338 1066 L 1341 1068 L 1342 1069 L 1342 1070 L 1340 1074 L 1325 1100 L 1322 1105 L 1320 1108 L 1319 1109 L 1298 1097 L 1272 1082 L 1227 1056 L 1189 1034 L 1186 1032 L 1185 1031 Z',
    labelX: 1263.5,
    labelY: 1050.1,
    labelRotate: -26,
    labelFontSize: 18,
    shortLabel: '107',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['108', {
    d: 'M 1176 1046 L 1177 1044 L 1181 1037 L 1182 1037 L 1189 1041 L 1260 1082 L 1305 1108 L 1324 1119 L 1324 1120 L 1322 1124 L 1318 1131 L 1311 1143 L 1309 1146 L 1285 1170 L 1284 1170 L 1190 1076 Z',
    labelX: 1255,
    labelY: 1106.6,
    labelRotate: -30,
    labelFontSize: 18,
    shortLabel: '108',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['109', {
    d: 'M 1147 1118 L 1184 1081 L 1186 1081 L 1273 1168 L 1234 1207 L 1147 1120 Z',
    labelX: 1209.4,
    labelY: 1143.6,
    labelRotate: -34,
    labelFontSize: 18,
    shortLabel: '109',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['110', {
    d: 'M 1103 1163 L 1104 1161 L 1140 1125 L 1142 1124 L 1236 1218 L 1236 1219 L 1198 1257 L 1197 1257 Z',
    labelX: 1167.6,
    labelY: 1188.7,
    labelRotate: -20,
    labelFontSize: 18,
    shortLabel: '110',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['111', {
    d: 'M 1051 1192 L 1077 1166 L 1130 1199 L 1192 1261 L 1192 1263 L 1174 1281 L 1152 1302 L 1142 1310 L 1138 1313 L 1135 1315 L 1134 1315 L 1132 1313 L 1109 1279 L 1051 1193 Z',
    labelX: 1120.4,
    labelY: 1240.1,
    labelRotate: -18,
    labelFontSize: 18,
    shortLabel: '111',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['112', {
    d: 'M 1002 1194 L 1003 1193 L 1032 1180 L 1034 1180 L 1036 1182 L 1054 1209 L 1053 1210 L 1050 1212 L 1045 1215 L 1031 1222 L 1026 1224 L 1014 1228 L 1010 1229 L 1009 1228 L 1002 1195 Z M 1011 1234 L 1056 1214 L 1057 1214 L 1058 1215 L 1063 1222 L 1075 1240 L 1076 1242 L 1074 1244 L 1071 1246 L 1066 1249 L 1059 1253 L 1053 1256 L 1046 1259 L 1041 1261 L 1026 1266 L 1022 1267 L 1018 1267 L 1017 1265 L 1012 1242 L 1011 1237 Z M 1019 1273 L 1079 1247 L 1081 1249 L 1084 1253 L 1109 1290 L 1127 1317 L 1128 1319 L 1128 1320 L 1127 1321 L 1124 1323 L 1116 1328 L 1109 1332 L 1095 1339 L 1072 1349 L 1067 1351 L 1061 1353 L 1051 1356 L 1039 1359 L 1037 1359 L 1036 1355 L 1034 1346 L 1028 1318 L 1021 1285 L 1019 1275 Z',
    labelX: 1056.9,
    labelY: 1278.2,
    labelRotate: -14,
    labelFontSize: 18,
    shortLabel: '112',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG multi-component block reviewed from expanded overlay crop.',
  }],
  ['113', {
    d: 'M 956 1229 L 963 1196 L 964 1195 L 995 1195 L 996 1198 L 1000 1216 L 1002 1226 L 1002 1230 L 1000 1231 L 993 1232 L 966 1232 L 958 1231 L 956 1230 Z M 948 1267 L 949 1262 L 952 1248 L 954 1239 L 955 1236 L 1004 1236 L 1005 1240 L 1008 1254 L 1011 1269 L 1008 1270 L 1001 1271 L 991 1272 L 967 1272 L 957 1271 L 951 1270 L 948 1269 Z M 929 1356 L 930 1351 L 934 1332 L 944 1285 L 946 1276 L 947 1275 L 1012 1275 L 1013 1277 L 1022 1319 L 1029 1352 L 1030 1357 L 1030 1361 L 1018 1363 L 1011 1364 L 1001 1365 L 958 1365 L 948 1364 L 941 1363 L 929 1361 Z',
    labelX: 979.3,
    labelY: 1295.9,
    labelFontSize: 18,
    shortLabel: '113',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG multi-component block reviewed from expanded overlay crop.',
  }],
  ['114', {
    d: 'M 905 1209 L 906 1207 L 920 1186 L 923 1182 L 925 1180 L 926 1180 L 956 1193 L 957 1194 L 953 1213 L 950 1227 L 949 1229 L 941 1227 L 938 1226 L 930 1223 L 912 1214 L 906 1210 Z M 883 1242 L 884 1240 L 900 1216 L 902 1214 L 903 1214 L 947 1234 L 948 1235 L 948 1236 L 942 1264 L 941 1267 L 937 1267 L 933 1266 L 926 1264 L 915 1260 L 908 1257 L 898 1252 L 891 1248 L 885 1244 Z M 831 1318 L 837 1309 L 866 1266 L 879 1247 L 880 1247 L 940 1273 L 940 1274 L 938 1284 L 928 1331 L 925 1345 L 923 1354 L 922 1358 L 921 1359 L 920 1359 L 908 1356 L 901 1354 L 889 1350 L 863 1339 L 857 1336 L 848 1331 L 838 1325 L 832 1321 L 831 1320 Z',
    labelX: 901.9,
    labelY: 1278.2,
    labelRotate: 14,
    labelFontSize: 18,
    shortLabel: '114',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG multi-component block reviewed from expanded overlay crop.',
  }],
  ['115', {
    d: 'M 766 1262 L 829 1199 L 868 1181 L 896 1209 L 896 1210 L 895 1212 L 891 1218 L 862 1261 L 835 1301 L 826 1314 L 825 1315 L 824 1315 L 822 1314 L 819 1312 L 814 1308 L 808 1303 L 785 1281 Z',
    labelX: 833.4,
    labelY: 1245.5,
    labelRotate: 18,
    labelFontSize: 18,
    shortLabel: '115',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['116', {
    d: 'M 723 1218 L 801 1140 L 839 1178 L 839 1179 L 835 1184 L 764 1255 L 761 1257 L 723 1219 Z',
    labelX: 782.8,
    labelY: 1196.9,
    labelRotate: 26,
    labelFontSize: 18,
    shortLabel: '116',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['117', {
    d: 'M 679 1175 L 757 1097 L 758 1097 L 796 1135 L 796 1136 L 719 1213 L 717 1213 Z',
    labelX: 739.3,
    labelY: 1153.3,
    labelRotate: 30,
    labelFontSize: 18,
    shortLabel: '117',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['118', {
    d: 'M 635 1119 L 725 1067 L 751 1052 L 772 1040 L 776 1038 L 778 1038 L 781 1043 L 782 1045 L 782 1047 L 769 1076 L 675 1170 L 674 1170 L 659 1155 L 645 1138 L 637 1124 L 635 1120 Z',
    labelX: 706.2,
    labelY: 1104.9,
    labelRotate: 32,
    labelFontSize: 18,
    shortLabel: '118',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['119', {
    d: 'M 608 1074 L 609 1073 L 614 1070 L 626 1063 L 671 1037 L 742 996 L 749 992 L 751 991 L 757 1001 L 768 1020 L 772 1027 L 774 1031 L 773 1032 L 768 1035 L 756 1042 L 737 1053 L 640 1109 L 633 1113 L 631 1113 L 630 1112 L 627 1107 L 609 1076 Z',
    labelX: 693.8,
    labelY: 1050.9,
    labelRotate: 30,
    labelFontSize: 18,
    shortLabel: '119',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['120', {
    d: 'M 582 1028 L 583 1027 L 588 1024 L 600 1017 L 638 995 L 709 954 L 723 946 L 725 946 L 731 956 L 742 975 L 746 982 L 747 984 L 747 986 L 742 989 L 723 1000 L 633 1052 L 607 1067 L 605 1068 L 604 1067 L 601 1062 L 583 1031 L 582 1029 Z',
    labelX: 667.4,
    labelY: 1005.1,
    labelRotate: 24,
    labelFontSize: 18,
    shortLabel: '120',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['121', {
    d: 'M 556 982 L 557 981 L 560 979 L 631 938 L 683 908 L 697 900 L 698 900 L 699 901 L 705 911 L 716 930 L 720 937 L 721 939 L 721 940 L 716 943 L 697 954 L 600 1010 L 579 1022 L 578 1022 L 572 1012 L 557 986 L 556 984 Z',
    labelX: 640.9,
    labelY: 959.3,
    labelRotate: 18,
    labelFontSize: 18,
    shortLabel: '121',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['122', {
    d: 'M 552 868 L 686 868 L 694 892 L 694 894 L 693 895 L 683 901 L 619 938 L 593 953 L 560 972 L 553 976 L 552 976 Z M 522 868 L 549 868 L 549 971 L 546 966 L 539 954 L 528 935 L 523 926 L 522 924 Z',
    labelX: 608.6,
    labelY: 906.5,
    labelRotate: 8,
    labelFontSize: 18,
    shortLabel: '122',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 122 includes a separated left premium component; both components reviewed from overlay crop.',
  }],
  ['123', {
    d: 'M 552 814 L 648 814 L 685 851 L 686 853 L 686 861 L 552 861 Z M 522 814 L 548 814 L 549 815 L 549 860 L 522 860 Z',
    labelX: 614.1,
    labelY: 839,
    labelRotate: 3,
    labelFontSize: 18,
    shortLabel: '123',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 123 includes a separated left premium component; both components reviewed from overlay crop.',
  }],
  ['124', {
    d: 'M 552 760 L 593 760 L 595 761 L 640 806 L 640 807 L 552 807 Z M 522 761 L 549 761 L 549 807 L 522 807 Z',
    labelX: 588.2,
    labelY: 786.6,
    labelFontSize: 18,
    shortLabel: '124',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 124 includes a separated left premium component; both components reviewed from overlay crop.',
  }],
  ['125', {
    d: 'M 552 742 L 566 733 L 567 733 L 586 752 L 586 753 L 552 753 Z M 522 689 L 549 716 L 549 753 L 522 753 Z',
    labelX: 567,
    labelY: 746.7,
    labelFontSize: 18,
    shortLabel: '125',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG 125 includes a separated left premium component; both components reviewed from overlay crop.',
  }],
  ['126', {
    d: 'M 459 751 L 460 750 L 465 747 L 496 729 L 505 724 L 509 722 L 510 722 L 510 832 L 504 834 L 493 837 L 489 838 L 487 838 L 480 817 L 467 777 L 459 752 Z',
    labelX: 491,
    labelY: 778.8,
    labelRotate: -4,
    labelFontSize: 18,
    shortLabel: '126',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['127', {
    d: 'M 442 686 L 443 682 L 444 679 L 454 659 L 467 634 L 510 677 L 510 719 L 486 733 L 465 745 L 459 748 L 458 748 L 457 746 L 455 740 L 443 703 L 442 698 Z',
    labelX: 475.3,
    labelY: 693.7,
    labelRotate: -10,
    labelFontSize: 18,
    shortLabel: '127',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['128', {
    d: 'M 554 613 L 555 608 L 557 602 L 560 596 L 563 592 L 631 524 L 632 524 L 654 546 L 554 646 Z',
    labelX: 598.9,
    labelY: 579.8,
    labelRotate: -28,
    labelFontSize: 18,
    shortLabel: '128',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG multi-component block reviewed from expanded overlay crop.',
  }],
  ['129', {
    d: 'M 637 518 L 859 296 L 863 293 L 873 288 L 881 286 L 913 286 L 913 391 L 683 565 L 637 519 Z',
    labelX: 788.1,
    labelY: 418.2,
    labelRotate: -20,
    labelFontSize: 18,
    shortLabel: '129',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['130', {
    d: 'M 1046 286 L 1098 286 L 1098 291 L 1088 342 L 1079 387 L 1078 391 L 1046 391 Z',
    labelX: 1067.2,
    labelY: 336.5,
    labelRotate: 18,
    labelFontSize: 18,
    shortLabel: '130',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['131', {
    d: 'M 1085 390 L 1099 318 L 1101 309 L 1102 308 L 1104 308 L 1107 309 L 1161 331 L 1162 332 L 1151 349 L 1115 403 L 1114 404 L 1112 404 L 1097 398 L 1085 393 Z',
    labelX: 1117.4,
    labelY: 354.4,
    labelRotate: 22,
    labelFontSize: 18,
    shortLabel: '131',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['132', {
    d: 'M 1120 408 L 1122 404 L 1166 338 L 1168 336 L 1218 386 L 1158 446 L 1157 446 L 1120 409 Z',
    labelX: 1166.9,
    labelY: 392.7,
    labelRotate: 28,
    labelFontSize: 18,
    shortLabel: '132',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['133', {
    d: 'M 1163 451 L 1223 391 L 1260 428 L 1260 429 L 1202 487 L 1200 488 L 1199 488 L 1163 452 Z',
    labelX: 1211.5,
    labelY: 440,
    labelRotate: 28,
    labelFontSize: 18,
    shortLabel: '133',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['134', {
    d: 'M 1205 494 L 1218 480 L 1264 434 L 1266 434 L 1298 466 L 1298 467 L 1238 527 Z',
    labelX: 1251.6,
    labelY: 480,
    labelRotate: 27,
    labelFontSize: 18,
    shortLabel: '134',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['135', {
    d: 'M 1243 532 L 1303 472 L 1304 472 L 1336 504 L 1336 505 L 1276 565 Z',
    labelX: 1289.7,
    labelY: 518.3,
    labelRotate: 24,
    labelFontSize: 18,
    shortLabel: '135',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['136', {
    d: 'M 1305 546 L 1341 510 L 1342 510 L 1374 542 L 1338 578 L 1337 578 Z',
    labelX: 1339.5,
    labelY: 543.9,
    labelRotate: 20,
    labelFontSize: 18,
    shortLabel: '136',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['137', {
    d: 'M 1343 583 L 1379 547 L 1409 577 L 1373 613 L 1372 613 L 1343 584 Z',
    labelX: 1374.2,
    labelY: 581.9,
    labelRotate: 14,
    labelFontSize: 18,
    shortLabel: '137',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['138', {
    d: 'M 1378 618 L 1414 582 L 1446 614 L 1446 615 L 1411 650 L 1409 650 L 1378 619 Z',
    labelX: 1411.9,
    labelY: 616.4,
    labelRotate: 20,
    labelFontSize: 18,
    shortLabel: '138',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['201', {
    d: 'M 1444 935 L 1446 931 L 1454 917 L 1476 879 L 1477 879 L 1480 883 L 1496 906 L 1516 935 L 1518 938 L 1519 940 L 1519 942 L 1516 948 L 1505 967 L 1503 970 L 1501 970 L 1494 966 L 1468 951 L 1449 940 L 1444 937 Z',
    labelX: 1482.7,
    labelY: 928.9,
    labelRotate: -12,
    labelFontSize: 16,
    shortLabel: '201',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['202', {
    d: 'M 1417 982 L 1420 976 L 1428 962 L 1435 950 L 1438 945 L 1440 942 L 1442 943 L 1449 947 L 1475 962 L 1494 973 L 1499 976 L 1499 977 L 1497 981 L 1489 995 L 1478 1014 L 1476 1016 L 1475 1016 L 1468 1012 L 1442 997 L 1423 986 L 1418 983 Z',
    labelX: 1458.1,
    labelY: 979.3,
    labelRotate: -15,
    labelFontSize: 16,
    shortLabel: '202',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['203', {
    d: 'M 1391 1027 L 1394 1021 L 1405 1002 L 1412 990 L 1413 989 L 1415 989 L 1419 991 L 1464 1017 L 1469 1020 L 1472 1022 L 1472 1024 L 1470 1028 L 1451 1061 L 1450 1062 L 1444 1059 L 1437 1055 L 1411 1040 L 1392 1029 L 1391 1028 Z',
    labelX: 1431.7,
    labelY: 1025.2,
    labelRotate: -18,
    labelFontSize: 16,
    shortLabel: '203',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['204', {
    d: 'M 1365 1072 L 1368 1066 L 1372 1059 L 1383 1040 L 1386 1035 L 1387 1034 L 1388 1034 L 1392 1036 L 1406 1044 L 1432 1059 L 1444 1066 L 1446 1068 L 1446 1069 L 1443 1075 L 1439 1082 L 1428 1101 L 1425 1106 L 1424 1107 L 1423 1107 L 1417 1104 L 1372 1078 L 1367 1075 L 1365 1073 Z',
    labelX: 1405.5,
    labelY: 1070.5,
    labelRotate: -21,
    labelFontSize: 16,
    shortLabel: '204',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['205', {
    d: 'M 1338 1118 L 1342 1111 L 1357 1085 L 1360 1080 L 1361 1079 L 1367 1082 L 1412 1108 L 1417 1111 L 1420 1113 L 1420 1115 L 1412 1129 L 1401 1148 L 1398 1153 L 1392 1150 L 1385 1146 L 1352 1127 L 1340 1120 Z',
    labelX: 1379.3,
    labelY: 1115.9,
    labelRotate: -24,
    labelFontSize: 16,
    shortLabel: '205',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['206', {
    d: 'M 1293 1178 L 1333 1127 L 1334 1126 L 1336 1126 L 1357 1138 L 1376 1149 L 1388 1156 L 1393 1159 L 1394 1160 L 1393 1162 L 1389 1169 L 1378 1188 L 1375 1193 L 1370 1199 L 1342 1227 L 1341 1227 L 1293 1179 Z',
    labelX: 1343.5,
    labelY: 1175.1,
    labelRotate: -26,
    labelFontSize: 16,
    shortLabel: '206',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['207', {
    d: 'M 1249 1222 L 1288 1183 L 1336 1231 L 1336 1233 L 1331 1238 L 1298 1270 L 1297 1270 Z',
    labelX: 1292.7,
    labelY: 1226.9,
    labelRotate: -27,
    labelFontSize: 16,
    shortLabel: '207',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['208', {
    d: 'M 1206 1265 L 1244 1227 L 1245 1227 L 1293 1275 L 1255 1313 L 1253 1313 L 1206 1266 Z',
    labelX: 1249.2,
    labelY: 1270.2,
    labelRotate: -29,
    labelFontSize: 16,
    shortLabel: '208',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['209', {
    d: 'M 1164 1306 L 1166 1304 L 1201 1270 L 1249 1318 L 1249 1319 L 1211 1357 L 1208 1359 L 1205 1356 L 1199 1349 L 1183 1330 L 1168 1312 L 1164 1307 Z',
    labelX: 1206.1,
    labelY: 1314.2,
    labelRotate: -31,
    labelFontSize: 16,
    shortLabel: '209',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['210', {
    d: 'M 1124 1336 L 1157 1312 L 1159 1311 L 1160 1312 L 1166 1319 L 1192 1350 L 1202 1362 L 1202 1364 L 1198 1368 L 1184 1379 L 1180 1382 L 1174 1386 L 1160 1395 L 1158 1396 L 1157 1395 L 1154 1390 L 1143 1371 L 1128 1345 L 1124 1338 Z',
    labelX: 1161.9,
    labelY: 1353.5,
    labelRotate: -34,
    labelFontSize: 16,
    shortLabel: '210',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['211', {
    d: 'M 1079 1359 L 1080 1358 L 1082 1357 L 1118 1340 L 1121 1345 L 1147 1390 L 1151 1397 L 1152 1399 L 1152 1400 L 1138 1416 L 1132 1419 L 1109 1429 L 1106 1430 L 1105 1430 L 1104 1428 L 1081 1367 L 1079 1361 Z',
    labelX: 1113.6,
    labelY: 1381.8,
    labelRotate: -15,
    labelFontSize: 16,
    shortLabel: '211',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['212', {
    d: 'M 1030 1372 L 1069 1362 L 1072 1362 L 1074 1366 L 1077 1374 L 1097 1429 L 1098 1432 L 1098 1433 L 1096 1434 L 1084 1438 L 1058 1445 L 1048 1447 L 1043 1447 L 1042 1444 L 1030 1376 Z',
    labelX: 1060.6,
    labelY: 1403.5,
    labelRotate: -8,
    labelFontSize: 16,
    shortLabel: '212',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['213', {
    d: 'M 983 1377 L 1017 1374 L 1023 1374 L 1024 1377 L 1026 1388 L 1035 1439 L 1036 1445 L 1036 1449 L 1031 1450 L 1023 1451 L 999 1453 L 983 1453 Z',
    labelX: 1006.2,
    labelY: 1412.9,
    labelFontSize: 16,
    shortLabel: '213',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['214', {
    d: 'M 922 1447 L 929 1407 L 934 1379 L 935 1374 L 941 1374 L 976 1377 L 976 1453 L 960 1453 L 935 1451 L 927 1450 L 922 1449 Z',
    labelX: 952.4,
    labelY: 1413,
    labelRotate: 8,
    labelFontSize: 16,
    shortLabel: '214',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['215', {
    d: 'M 861 1431 L 864 1422 L 884 1367 L 886 1362 L 887 1361 L 928 1372 L 928 1378 L 921 1418 L 916 1446 L 915 1448 L 900 1445 L 874 1438 L 862 1434 L 861 1433 Z',
    labelX: 897.8,
    labelY: 1403.5,
    labelRotate: 14,
    labelFontSize: 16,
    shortLabel: '215',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['216', {
    d: 'M 803 1405 L 804 1403 L 816 1382 L 838 1344 L 840 1341 L 841 1340 L 879 1358 L 880 1359 L 880 1360 L 879 1363 L 855 1429 L 854 1430 L 851 1430 L 846 1428 L 839 1425 L 818 1415 L 810 1411 L 803 1407 Z',
    labelX: 844.3,
    labelY: 1384,
    labelRotate: 20,
    labelFontSize: 16,
    shortLabel: '216',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['217', {
    d: 'M 751 1369 L 753 1366 L 758 1360 L 790 1322 L 796 1315 L 800 1311 L 833 1335 L 835 1337 L 831 1344 L 805 1389 L 798 1401 L 797 1402 L 795 1402 L 793 1401 L 782 1394 L 763 1380 L 759 1377 L 754 1373 L 751 1370 Z',
    labelX: 795.4,
    labelY: 1355.1,
    labelRotate: 24,
    labelFontSize: 16,
    shortLabel: '217',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['218', {
    d: 'M 704 1323 L 757 1270 L 758 1270 L 794 1306 L 794 1307 L 792 1310 L 788 1315 L 762 1346 L 746 1365 L 745 1365 L 738 1359 L 705 1326 L 704 1324 Z',
    labelX: 751.2,
    labelY: 1315.5,
    labelRotate: 27,
    labelFontSize: 16,
    shortLabel: '218',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['219', {
    d: 'M 667 1274 L 714 1227 L 715 1227 L 752 1264 L 752 1266 L 699 1319 L 698 1319 L 673 1294 Z',
    labelX: 709.5,
    labelY: 1270.2,
    labelRotate: 30,
    labelFontSize: 16,
    shortLabel: '219',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['220', {
    d: 'M 624 1230 L 671 1183 L 709 1221 L 709 1222 L 662 1269 L 624 1231 Z',
    labelX: 666.4,
    labelY: 1226,
    labelRotate: 32,
    labelFontSize: 16,
    shortLabel: '220',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['221', {
    d: 'M 567 1158 L 579 1151 L 617 1129 L 623 1126 L 625 1126 L 666 1178 L 619 1225 L 618 1225 L 586 1193 L 584 1190 L 577 1178 L 569 1164 L 567 1160 Z',
    labelX: 615.8,
    labelY: 1174.2,
    labelRotate: 30,
    labelFontSize: 16,
    shortLabel: '221',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['222', {
    d: 'M 540 1113 L 541 1112 L 546 1109 L 584 1087 L 591 1083 L 597 1080 L 598 1080 L 599 1081 L 602 1086 L 609 1098 L 617 1112 L 620 1118 L 620 1120 L 575 1146 L 568 1150 L 564 1152 L 562 1152 L 547 1126 L 543 1119 Z',
    labelX: 580.3,
    labelY: 1116.1,
    labelRotate: 26,
    labelFontSize: 16,
    shortLabel: '222',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['223', {
    d: 'M 514 1067 L 515 1066 L 520 1063 L 532 1056 L 558 1041 L 565 1037 L 571 1034 L 572 1034 L 583 1053 L 591 1067 L 594 1073 L 594 1074 L 591 1076 L 539 1106 L 537 1107 L 536 1107 L 525 1088 L 517 1074 L 514 1068 Z',
    labelX: 553.9,
    labelY: 1070.4,
    labelRotate: 22,
    labelFontSize: 16,
    shortLabel: '223',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['301', {
    d: 'M 1509 998 L 1511 994 L 1526 968 L 1529 963 L 1531 960 L 1532 959 L 1534 961 L 1537 965 L 1542 972 L 1556 992 L 1560 998 L 1561 1000 L 1561 1001 L 1559 1005 L 1551 1019 L 1549 1022 L 1548 1023 L 1534 1015 L 1515 1004 L 1510 1001 L 1509 1000 Z',
    labelX: 1535.8,
    labelY: 993.6,
    labelRotate: -12,
    labelFontSize: 15,
    shortLabel: '301',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['302', {
    d: 'M 1482 1045 L 1485 1039 L 1500 1013 L 1503 1008 L 1505 1006 L 1506 1006 L 1508 1007 L 1522 1015 L 1527 1018 L 1529 1020 L 1527 1024 L 1519 1038 L 1508 1057 L 1506 1059 L 1505 1059 L 1503 1058 L 1496 1054 L 1484 1047 Z',
    labelX: 1505.4,
    labelY: 1032.5,
    labelRotate: -14,
    labelFontSize: 15,
    shortLabel: '302',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['303', {
    d: 'M 1456 1090 L 1459 1084 L 1463 1077 L 1474 1058 L 1477 1053 L 1478 1052 L 1480 1052 L 1482 1053 L 1496 1061 L 1501 1064 L 1502 1065 L 1502 1067 L 1501 1069 L 1493 1083 L 1482 1102 L 1480 1105 L 1479 1105 L 1477 1104 L 1470 1100 L 1458 1093 L 1456 1091 Z',
    labelX: 1479,
    labelY: 1078.2,
    labelRotate: -15,
    labelFontSize: 15,
    shortLabel: '303',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['304', {
    d: 'M 1429 1136 L 1437 1122 L 1448 1103 L 1451 1098 L 1452 1097 L 1456 1099 L 1470 1107 L 1475 1110 L 1476 1111 L 1476 1112 L 1475 1114 L 1467 1128 L 1456 1147 L 1454 1150 L 1453 1151 L 1451 1150 L 1437 1142 L 1432 1139 L 1429 1137 Z',
    labelX: 1452.5,
    labelY: 1124.1,
    labelRotate: -17,
    labelFontSize: 15,
    shortLabel: '304',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['305', {
    d: 'M 1404 1181 L 1406 1177 L 1414 1163 L 1421 1151 L 1424 1146 L 1426 1143 L 1427 1142 L 1428 1142 L 1432 1144 L 1446 1152 L 1465 1163 L 1467 1165 L 1451 1193 L 1445 1203 L 1444 1204 L 1440 1202 L 1433 1198 L 1407 1183 Z',
    labelX: 1435.6,
    labelY: 1172.7,
    labelRotate: -20,
    labelFontSize: 15,
    shortLabel: '305',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['306', {
    d: 'M 1370 1225 L 1400 1188 L 1402 1188 L 1406 1190 L 1413 1194 L 1432 1205 L 1437 1208 L 1440 1210 L 1440 1211 L 1437 1217 L 1429 1231 L 1427 1234 L 1403 1258 Z',
    labelX: 1405.6,
    labelY: 1221.6,
    labelRotate: -22,
    labelFontSize: 15,
    shortLabel: '306',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['307', {
    d: 'M 1342 1253 L 1364 1231 L 1366 1231 L 1397 1262 L 1397 1264 L 1375 1286 L 1373 1286 L 1342 1255 Z',
    labelX: 1369.6,
    labelY: 1258.5,
    labelRotate: -24,
    labelFontSize: 15,
    shortLabel: '307',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['308', {
    d: 'M 1313 1282 L 1336 1259 L 1337 1259 L 1369 1291 L 1369 1292 L 1346 1315 L 1345 1315 L 1313 1283 Z',
    labelX: 1341,
    labelY: 1286.9,
    labelRotate: -26,
    labelFontSize: 15,
    shortLabel: '308',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['309', {
    d: 'M 1280 1315 L 1306 1289 L 1307 1289 L 1339 1321 L 1339 1322 L 1313 1348 L 1311 1348 L 1280 1317 Z',
    labelX: 1309.2,
    labelY: 1318.8,
    labelRotate: -22,
    labelFontSize: 15,
    shortLabel: '309',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['310', {
    d: 'M 1250 1345 L 1274 1321 L 1275 1321 L 1300 1346 L 1300 1348 L 1287 1361 L 1276 1371 L 1275 1371 L 1250 1346 Z',
    labelX: 1275,
    labelY: 1346.1,
    labelRotate: -30,
    labelFontSize: 15,
    shortLabel: '310',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['311', {
    d: 'M 1221 1373 L 1224 1370 L 1245 1350 L 1271 1376 L 1245 1402 L 1244 1402 L 1241 1399 L 1235 1392 L 1230 1386 L 1221 1375 Z',
    labelX: 1245.4,
    labelY: 1375.9,
    labelRotate: -32,
    labelFontSize: 15,
    shortLabel: '311',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['312', {
    d: 'M 1193 1396 L 1195 1394 L 1213 1380 L 1215 1379 L 1216 1379 L 1222 1386 L 1242 1410 L 1245 1414 L 1244 1415 L 1238 1420 L 1233 1424 L 1221 1433 L 1219 1434 L 1218 1434 L 1217 1433 L 1208 1420 L 1194 1399 L 1193 1397 Z',
    labelX: 1218.1,
    labelY: 1406.5,
    labelRotate: -25,
    labelFontSize: 15,
    shortLabel: '312',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['313', {
    d: 'M 1160 1417 L 1184 1402 L 1186 1401 L 1187 1401 L 1188 1402 L 1191 1406 L 1212 1437 L 1212 1439 L 1211 1440 L 1196 1450 L 1188 1455 L 1182 1458 L 1181 1458 L 1180 1457 L 1174 1446 L 1166 1431 L 1160 1419 Z',
    labelX: 1185.3,
    labelY: 1429.5,
    labelRotate: -24,
    labelFontSize: 15,
    shortLabel: '313',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['314', {
    d: 'M 1124 1435 L 1153 1421 L 1154 1422 L 1161 1435 L 1170 1452 L 1175 1462 L 1170 1465 L 1158 1471 L 1145 1477 L 1142 1478 L 1141 1478 L 1140 1476 L 1124 1436 Z',
    labelX: 1148.6,
    labelY: 1449.9,
    labelRotate: -18,
    labelFontSize: 15,
    shortLabel: '314',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['315', {
    d: 'M 1087 1449 L 1089 1448 L 1114 1439 L 1117 1438 L 1118 1439 L 1119 1441 L 1126 1458 L 1134 1478 L 1135 1481 L 1128 1484 L 1117 1488 L 1102 1493 L 1100 1493 L 1099 1492 L 1098 1489 L 1095 1479 L 1089 1458 L 1087 1450 Z',
    labelX: 1109.8,
    labelY: 1466.2,
    labelRotate: -10,
    labelFontSize: 15,
    shortLabel: '315',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['321', {
    d: 'M 824 1480 L 834 1455 L 841 1438 L 842 1438 L 870 1448 L 872 1449 L 872 1450 L 860 1492 L 859 1493 L 857 1493 L 839 1487 L 831 1484 L 826 1482 L 824 1481 Z',
    labelX: 848.9,
    labelY: 1466.1,
    labelRotate: 18,
    labelFontSize: 15,
    shortLabel: '321',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['322', {
    d: 'M 784 1461 L 785 1459 L 801 1429 L 805 1422 L 806 1421 L 834 1435 L 834 1438 L 820 1473 L 818 1477 L 817 1478 L 816 1478 L 803 1472 L 787 1464 L 784 1462 Z',
    labelX: 810.1,
    labelY: 1450,
    labelRotate: 22,
    labelFontSize: 15,
    shortLabel: '322',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['323', {
    d: 'M 747 1437 L 763 1413 L 770 1403 L 772 1401 L 773 1401 L 778 1404 L 797 1416 L 799 1418 L 799 1419 L 797 1423 L 779 1457 L 778 1458 L 777 1458 L 771 1455 L 766 1452 L 758 1447 L 749 1441 L 747 1439 Z',
    labelX: 773.4,
    labelY: 1429.6,
    labelRotate: 25,
    labelFontSize: 15,
    shortLabel: '323',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['324', {
    d: 'M 714 1414 L 715 1412 L 725 1400 L 741 1381 L 743 1379 L 744 1379 L 747 1381 L 765 1395 L 766 1396 L 766 1397 L 742 1433 L 741 1434 L 739 1434 L 727 1425 L 722 1421 L 716 1416 Z',
    labelX: 740.6,
    labelY: 1406.5,
    labelRotate: 28,
    labelFontSize: 15,
    shortLabel: '324',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['325', {
    d: 'M 687 1389 L 689 1386 L 719 1356 L 720 1356 L 738 1373 L 738 1375 L 733 1381 L 712 1406 L 709 1409 L 708 1409 L 702 1404 Z',
    labelX: 712.8,
    labelY: 1382.4,
    labelRotate: 30,
    labelFontSize: 15,
    shortLabel: '325',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['326', {
    d: 'M 670 1357 L 695 1332 L 696 1332 L 714 1350 L 714 1352 L 689 1377 L 688 1377 L 671 1360 L 670 1358 Z',
    labelX: 691.9,
    labelY: 1354.4,
    labelRotate: 31,
    labelFontSize: 15,
    shortLabel: '326',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['327', {
    d: 'M 638 1339 L 670 1307 L 671 1307 L 690 1326 L 690 1328 L 659 1359 L 657 1359 L 638 1340 Z',
    labelX: 664.2,
    labelY: 1333.3,
    labelRotate: 30,
    labelFontSize: 15,
    shortLabel: '327',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['328', {
    d: 'M 613 1314 L 645 1282 L 646 1282 L 665 1301 L 665 1302 L 633 1334 L 632 1334 L 613 1315 Z',
    labelX: 638.7,
    labelY: 1308,
    labelRotate: 28,
    labelFontSize: 15,
    shortLabel: '328',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['329', {
    d: 'M 588 1289 L 620 1257 L 621 1257 L 640 1276 L 640 1277 L 608 1309 L 607 1309 L 588 1290 Z',
    labelX: 613.9,
    labelY: 1283.1,
    labelRotate: 27,
    labelFontSize: 15,
    shortLabel: '329',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['330', {
    d: 'M 563 1264 L 595 1232 L 596 1232 L 615 1251 L 615 1252 L 583 1284 L 582 1284 L 563 1265 Z',
    labelX: 588.7,
    labelY: 1258.1,
    labelRotate: 26,
    labelFontSize: 15,
    shortLabel: '330',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['331', {
    d: 'M 512 1198 L 515 1196 L 520 1193 L 546 1178 L 552 1175 L 590 1226 L 590 1227 L 558 1259 L 557 1259 L 533 1235 L 531 1232 L 528 1227 L 517 1208 L 513 1201 L 512 1199 Z',
    labelX: 550.6,
    labelY: 1216.6,
    labelRotate: 23,
    labelFontSize: 15,
    shortLabel: '331',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['332', {
    d: 'M 482 1147 L 484 1145 L 496 1138 L 517 1126 L 521 1124 L 522 1124 L 524 1126 L 531 1138 L 542 1157 L 546 1164 L 548 1168 L 548 1169 L 546 1171 L 527 1182 L 513 1190 L 509 1192 L 508 1192 L 502 1182 L 487 1156 L 483 1149 Z',
    labelX: 515.2,
    labelY: 1157.9,
    labelRotate: 19,
    labelFontSize: 15,
    shortLabel: '332',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['333', {
    d: 'M 456 1100 L 461 1097 L 480 1086 L 494 1078 L 496 1078 L 498 1081 L 505 1093 L 517 1114 L 518 1116 L 518 1118 L 515 1120 L 496 1131 L 482 1139 L 480 1140 L 478 1140 L 476 1137 L 465 1118 L 457 1104 L 456 1102 Z',
    labelX: 487,
    labelY: 1109.1,
    labelRotate: 15,
    labelFontSize: 15,
    shortLabel: '333',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['401', {
    d: 'M 1551 1040 L 1554 1034 L 1564 1016 L 1567 1011 L 1568 1010 L 1570 1012 L 1591 1042 L 1597 1051 L 1598 1053 L 1594 1060 L 1592 1063 L 1591 1063 L 1589 1062 L 1575 1054 L 1556 1043 Z',
    labelX: 1574.5,
    labelY: 1038.4,
    labelRotate: -12,
    labelFontSize: 15,
    shortLabel: '401',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['402', {
    d: 'M 1528 1081 L 1531 1075 L 1536 1066 L 1545 1050 L 1547 1047 L 1548 1046 L 1549 1046 L 1563 1054 L 1568 1057 L 1571 1059 L 1572 1060 L 1572 1061 L 1569 1067 L 1558 1086 L 1555 1091 L 1553 1094 L 1552 1095 L 1551 1095 L 1530 1083 Z',
    labelX: 1550.2,
    labelY: 1070.7,
    labelRotate: -14,
    labelFontSize: 15,
    shortLabel: '402',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['403', {
    d: 'M 1505 1121 L 1506 1119 L 1519 1096 L 1523 1089 L 1524 1088 L 1526 1088 L 1530 1090 L 1537 1094 L 1547 1100 L 1548 1101 L 1548 1103 L 1547 1105 L 1532 1131 L 1529 1136 L 1527 1136 L 1525 1135 L 1511 1127 L 1506 1124 L 1505 1123 Z',
    labelX: 1526.5,
    labelY: 1112,
    labelRotate: -16,
    labelFontSize: 15,
    shortLabel: '403',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['404', {
    d: 'M 1481 1163 L 1494 1140 L 1498 1133 L 1500 1130 L 1501 1129 L 1502 1129 L 1504 1130 L 1511 1134 L 1523 1141 L 1525 1143 L 1506 1176 L 1505 1177 L 1503 1177 L 1499 1175 L 1487 1168 L 1482 1165 L 1481 1164 Z',
    labelX: 1502.9,
    labelY: 1153.3,
    labelRotate: -18,
    labelFontSize: 15,
    shortLabel: '404',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['405', {
    d: 'M 1451 1215 L 1452 1213 L 1460 1199 L 1471 1180 L 1474 1175 L 1476 1172 L 1477 1171 L 1478 1171 L 1484 1174 L 1491 1178 L 1510 1189 L 1515 1192 L 1517 1194 L 1505 1215 L 1491 1239 L 1490 1239 L 1488 1238 L 1462 1223 L 1452 1217 L 1451 1216 Z',
    labelX: 1483.9,
    labelY: 1204.6,
    labelRotate: -20,
    labelFontSize: 15,
    shortLabel: '405',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['406', {
    d: 'M 1411 1266 L 1447 1222 L 1449 1223 L 1468 1234 L 1480 1241 L 1485 1244 L 1487 1246 L 1479 1260 L 1476 1265 L 1474 1268 L 1444 1298 L 1443 1298 Z',
    labelX: 1449.3,
    labelY: 1259.4,
    labelRotate: -23,
    labelFontSize: 15,
    shortLabel: '406',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['407', {
    d: 'M 1382 1295 L 1405 1272 L 1407 1272 L 1438 1303 L 1438 1304 L 1415 1327 L 1414 1327 Z',
    labelX: 1410.4,
    labelY: 1299.2,
    labelRotate: -25,
    labelFontSize: 15,
    shortLabel: '407',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['408', {
    d: 'M 1354 1323 L 1377 1300 L 1378 1300 L 1409 1331 L 1409 1333 L 1386 1356 L 1354 1324 Z',
    labelX: 1381.7,
    labelY: 1327.6,
    labelRotate: -27,
    labelFontSize: 15,
    shortLabel: '408',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['409', {
    d: 'M 1320 1357 L 1347 1330 L 1348 1330 L 1373 1355 L 1373 1357 L 1372 1358 L 1347 1382 L 1345 1382 Z',
    labelX: 1346.7,
    labelY: 1356.3,
    labelRotate: -29,
    labelFontSize: 15,
    shortLabel: '409',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['410', {
    d: 'M 1291 1386 L 1315 1362 L 1316 1362 L 1341 1387 L 1341 1388 L 1317 1412 L 1316 1412 L 1291 1387 Z',
    labelX: 1315.7,
    labelY: 1387.1,
    labelRotate: -31,
    labelFontSize: 15,
    shortLabel: '410',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['411', {
    d: 'M 1258 1418 L 1267 1409 L 1286 1391 L 1311 1416 L 1311 1418 L 1306 1423 L 1282 1446 L 1281 1446 L 1278 1443 L 1267 1430 L 1262 1424 L 1258 1419 Z',
    labelX: 1284.3,
    labelY: 1418.4,
    labelRotate: -32,
    labelFontSize: 15,
    shortLabel: '411',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['412', {
    d: 'M 1234 1438 L 1238 1434 L 1248 1426 L 1252 1423 L 1253 1423 L 1269 1442 L 1279 1454 L 1282 1458 L 1278 1462 L 1268 1470 L 1264 1473 L 1261 1475 L 1259 1473 L 1256 1469 L 1236 1441 Z',
    labelX: 1257.6,
    labelY: 1448.9,
    labelRotate: -30,
    labelFontSize: 15,
    shortLabel: '412',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['413', {
    d: 'M 1206 1457 L 1210 1454 L 1228 1442 L 1229 1442 L 1254 1477 L 1255 1479 L 1252 1482 L 1248 1485 L 1233 1495 L 1231 1496 L 1229 1496 L 1208 1461 Z',
    labelX: 1230.1,
    labelY: 1469.3,
    labelRotate: -26,
    labelFontSize: 15,
    shortLabel: '413',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['414', {
    d: 'M 1177 1474 L 1180 1472 L 1199 1461 L 1200 1461 L 1201 1462 L 1203 1465 L 1224 1500 L 1223 1501 L 1220 1503 L 1210 1509 L 1201 1514 L 1199 1515 L 1197 1515 L 1196 1514 L 1177 1476 Z',
    labelX: 1199.6,
    labelY: 1488.3,
    labelRotate: -20,
    labelFontSize: 15,
    shortLabel: '414',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['415', {
    d: 'M 1146 1489 L 1147 1488 L 1169 1478 L 1170 1478 L 1172 1480 L 1175 1486 L 1191 1519 L 1179 1525 L 1168 1530 L 1163 1532 L 1161 1528 L 1147 1493 L 1146 1490 Z',
    labelX: 1167.6,
    labelY: 1505,
    labelRotate: -14,
    labelFontSize: 15,
    shortLabel: '415',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['416', {
    d: 'M 1092 1508 L 1093 1507 L 1138 1492 L 1139 1492 L 1140 1493 L 1147 1510 L 1155 1530 L 1156 1533 L 1156 1535 L 1146 1539 L 1135 1543 L 1120 1548 L 1106 1552 L 1104 1552 L 1102 1546 L 1099 1535 L 1094 1516 Z',
    labelX: 1123.2,
    labelY: 1522.4,
    labelRotate: -8,
    labelFontSize: 15,
    shortLabel: '416',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['420', {
    d: 'M 803 1532 L 817 1497 L 819 1493 L 820 1492 L 821 1492 L 824 1493 L 865 1507 L 866 1508 L 866 1511 L 864 1519 L 857 1545 L 855 1552 L 853 1552 L 842 1549 L 821 1542 L 805 1536 L 803 1535 Z',
    labelX: 835.4,
    labelY: 1522.4,
    labelRotate: 12,
    labelFontSize: 15,
    shortLabel: '420',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['422', {
    d: 'M 735 1500 L 736 1498 L 757 1463 L 759 1461 L 763 1463 L 777 1471 L 782 1474 L 782 1475 L 762 1515 L 760 1515 L 756 1513 L 735 1501 Z',
    labelX: 759,
    labelY: 1488.3,
    labelRotate: 23,
    labelFontSize: 15,
    shortLabel: '422',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['423', {
    d: 'M 704 1479 L 705 1477 L 707 1474 L 727 1446 L 730 1442 L 731 1442 L 737 1446 L 753 1457 L 752 1459 L 731 1494 L 729 1496 L 728 1496 L 726 1495 L 708 1483 L 704 1480 Z',
    labelX: 728.6,
    labelY: 1469.2,
    labelRotate: 25,
    labelFontSize: 15,
    shortLabel: '423',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['424', {
    d: 'M 677 1458 L 679 1455 L 694 1437 L 705 1424 L 706 1423 L 707 1423 L 722 1435 L 724 1437 L 724 1439 L 722 1442 L 702 1470 L 699 1474 L 698 1475 L 696 1474 L 692 1471 L 682 1463 Z',
    labelX: 701.1,
    labelY: 1448.9,
    labelRotate: 27,
    labelFontSize: 15,
    shortLabel: '424',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['425', {
    d: 'M 654 1422 L 679 1397 L 695 1412 L 701 1418 L 701 1419 L 681 1443 L 678 1446 L 677 1446 L 661 1431 L 654 1424 Z',
    labelX: 677.5,
    labelY: 1421.5,
    labelRotate: 29,
    labelFontSize: 15,
    shortLabel: '425',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['426', {
    d: 'M 629 1398 L 654 1373 L 655 1373 L 674 1392 L 660 1407 L 649 1418 L 648 1418 L 629 1399 Z',
    labelX: 651.2,
    labelY: 1395.3,
    labelRotate: 30,
    labelFontSize: 15,
    shortLabel: '426',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['427', {
    d: 'M 597 1380 L 629 1348 L 630 1348 L 649 1367 L 649 1369 L 618 1400 L 616 1400 L 597 1381 Z',
    labelX: 623.2,
    labelY: 1374.3,
    labelRotate: 30,
    labelFontSize: 15,
    shortLabel: '427',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['428', {
    d: 'M 572 1355 L 604 1323 L 605 1323 L 624 1342 L 624 1343 L 592 1375 L 591 1375 L 572 1356 Z',
    labelX: 597.8,
    labelY: 1349,
    labelRotate: 28,
    labelFontSize: 15,
    shortLabel: '428',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['429', {
    d: 'M 547 1330 L 579 1298 L 580 1298 L 599 1317 L 599 1318 L 567 1350 L 566 1350 L 547 1331 Z',
    labelX: 572.9,
    labelY: 1324,
    labelRotate: 27,
    labelFontSize: 15,
    shortLabel: '429',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['431', {
    d: 'M 469 1239 L 470 1238 L 475 1235 L 508 1216 L 509 1216 L 549 1267 L 549 1268 L 517 1300 L 516 1300 L 487 1271 L 485 1268 L 478 1256 L 470 1242 L 469 1240 Z',
    labelX: 508.5,
    labelY: 1257.6,
    labelRotate: 25,
    labelFontSize: 15,
    shortLabel: '431',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['432', {
    d: 'M 432 1175 L 444 1168 L 470 1153 L 472 1153 L 474 1155 L 481 1167 L 492 1186 L 504 1207 L 505 1209 L 505 1210 L 504 1211 L 501 1213 L 482 1224 L 468 1232 L 466 1233 L 465 1233 L 463 1230 L 441 1192 L 433 1178 L 432 1176 Z',
    labelX: 468.6,
    labelY: 1192.7,
    labelRotate: 21,
    labelFontSize: 15,
    shortLabel: '432',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['433', {
    d: 'M 406 1129 L 409 1127 L 442 1108 L 444 1107 L 446 1107 L 448 1110 L 455 1122 L 466 1141 L 468 1145 L 468 1147 L 463 1150 L 451 1157 L 430 1169 L 428 1169 L 426 1166 L 415 1147 L 407 1133 L 406 1131 Z',
    labelX: 437,
    labelY: 1138,
    labelRotate: 17,
    labelFontSize: 15,
    shortLabel: '433',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG component polygon reviewed from overlay crop.',
  }],
  ['1루 바베큐석', {
    d: 'M 1521 943 L 1376 1196 L 1381 1201 L 1524 952 Z M 1376 1196 L 1210 1361 L 1210 1370 L 1381 1201 Z M 1210 1361 L 1140 1415 L 1185 1390 L 1210 1370 Z',
    labelX: 1365,
    labelY: 1207,
    labelRotate: -43,
    labelFontSize: 15,
    shortLabel: 'BBQ',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered first-base BBQ special area reviewed from overlay crop. Expanded hit stroke narrowed to avoid intercepting 301-315.',
    hitStrokeWidth: 12,
  }],
  ['3루 라운드 테이블석', {
    d: 'M 511 1069 L 506 1072 L 509 1078 L 579 1199 L 671 1291 L 668 1279 L 583 1194 Z',
    labelX: 579,
    labelY: 1199,
    labelRotate: 43,
    labelFontSize: 14,
    shortLabel: '라운드',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered third-base round table special area reviewed from overlay crop.',
    hitStrokeWidth: 34,
  }],
  ['1루 라운드 테이블석', {
    d: 'M 1531 1022 L 1456 1151 L 1461 1155 L 1536 1024 Z M 1575 1062 L 1507 1179 L 1512 1181 L 1580 1065 Z',
    labelX: 1497,
    labelY: 1092,
    labelRotate: -62,
    labelFontSize: 14,
    shortLabel: '라운드',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered first-base round table special area reviewed from overlay crop.',
  }],
  ['1루 테이블석', {
    d: 'M 1539 1026 L 1464 1156 L 1469 1159 L 1544 1029 Z M 1582 1067 L 1515 1183 L 1520 1186 L 1587 1069 Z',
    labelX: 1551,
    labelY: 1126,
    labelRotate: -62,
    labelFontSize: 14,
    shortLabel: '테이블',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered first-base table special area reviewed from overlay crop.',
  }],
  ['외야 카운터석', {
    d: 'M 1178 322 L 1170 334 L 1219 383 L 1220 383 L 1229 373 Z M 1105 291 L 1103 305 L 1162 329 L 1163 329 L 1171 317 L 1107 291 Z M 1277 422 L 1268 432 L 1300 464 L 1310 454 L 1278 422 Z M 1315 460 L 1306 470 L 1338 502 L 1348 492 L 1316 460 Z M 1353 498 L 1344 508 L 1375 539 L 1376 539 L 1385 529 L 1354 498 Z',
    labelX: 1365,
    labelY: 519,
    labelRotate: 40,
    labelFontSize: 14,
    shortLabel: '카운터',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered outfield counter special areas reviewed from overlay crop.',
  }],
  ['외야 가족석', {
    d: 'M 1187 307 L 1179 319 L 1231 371 L 1233 371 L 1242 361 L 1188 307 Z M 1106 287 L 1171 314 L 1173 314 L 1181 302 L 1144 287 Z M 1290 409 L 1280 420 L 1312 452 L 1313 452 L 1323 442 Z M 1328 447 L 1318 458 L 1350 490 L 1351 490 L 1361 480 Z M 1366 485 L 1356 496 L 1387 527 L 1389 527 L 1398 517 Z',
    labelX: 1284,
    labelY: 416,
    labelRotate: 20,
    labelFontSize: 14,
    shortLabel: '가족',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Official PNG color-coded unnumbered outfield family special areas reviewed from overlay crop.',
  }],
];

export const CHANGWON_IMAGE_GEOMETRY: Record<string, ChangwonImageGeometry> = Object.fromEntries(CHANGWON_PRECISION_IMAGE_GEOMETRY_ENTRIES);

function parseGeometrySubpaths(d: string): ChangwonPoint[][] {
  return d
    .trim()
    .split(/(?=M\s)/)
    .filter(Boolean)
    .map((subpath) => {
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return Array.from({ length: numbers.length / 2 }, (_, index) => ({
        x: numbers[index * 2],
        y: numbers[(index * 2) + 1],
      }));
    });
}

function getTraceBounds(subpaths: ChangwonPoint[][]): ChangwonBounds {
  const points = subpaths.flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function toTraceReferenceFromGeometry(
  entries: [string, ChangwonImageGeometry][],
): Record<string, ChangwonOfficialTraceReference> {
  return Object.fromEntries(entries.map(([block, geometry]) => {
    const subpaths = parseGeometrySubpaths(geometry.d);
    return [block, {
      numberAnchor: { x: geometry.labelX, y: geometry.labelY },
      expectedBounds: getTraceBounds(subpaths),
      expectedSubpathCount: subpaths.length,
    }];
  }));
}

export const CHANGWON_OFFICIAL_TRACE_REFERENCE: Record<string, ChangwonOfficialTraceReference> = toTraceReferenceFromGeometry(CHANGWON_PRECISION_IMAGE_GEOMETRY_ENTRIES);

const ACCESSIBLE_BLOCKS = new Set([
  '105',
  '110',
  '111',
  '112',
  '113',
  '114',
  '115',
  '117',
  '118',
  '121',
  '123',
  '124',
  '128',
  '129',
  '130',
  '136',
  '210',
  '211',
  '213',
  '214',
  '216',
  '217',
  '218',
  '219',
  '325',
]);

function getBlockNumber(block: string): number {
  return Number.parseInt(block, 10);
}

function getLevel(block: string): ChangwonLevel {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 129 && blockNumber <= 138) return 'OUTFIELD';
  if (blockNumber >= 100 && blockNumber < 200) return '1F';
  if (blockNumber >= 200 && blockNumber < 300) return '2F';
  if (blockNumber >= 300 && blockNumber < 400) return '3F';
  return '4F';
}

function getSide(block: string): ChangwonSide {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 129 && blockNumber <= 138) return 'OUTFIELD';
  if (blockNumber >= 112 && blockNumber <= 114) return 'CENTER';
  if ((blockNumber >= 101 && blockNumber <= 111) || (blockNumber >= 201 && blockNumber <= 210) || (blockNumber >= 301 && blockNumber <= 315) || (blockNumber >= 401 && blockNumber <= 416)) {
    return 'FIRST_BASE';
  }
  return 'THIRD_BASE';
}

function getFanRole(block: string): ChangwonFanRole {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 105 && blockNumber <= 108) return 'HOME';
  if (blockNumber >= 121 && blockNumber <= 124) return 'AWAY';
  return 'NEUTRAL';
}

function getName(block: string): string {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 101 && blockNumber <= 104) return '1루 프리미엄석';
  if (blockNumber >= 105 && blockNumber <= 108) return '홈 응원석';
  if (blockNumber >= 109 && blockNumber <= 110) return '1루 내야석';
  if (blockNumber === 111) return '미니테이블석';
  if (blockNumber >= 112 && blockNumber <= 114) return '중앙 프리미엄석';
  if (blockNumber >= 115 && blockNumber <= 118) return '3루 테이블석';
  if (blockNumber >= 119 && blockNumber <= 120) return '3루 내야석';
  if (blockNumber >= 121 && blockNumber <= 124) return '원정 응원석';
  if (blockNumber === 125) return '3루 내야석';
  if (blockNumber >= 126 && blockNumber <= 127) return '바베큐석';
  if (blockNumber === 128) return '불펜 가족석';
  if (blockNumber === 129) return '외야 잔디석';
  if (blockNumber >= 130 && blockNumber <= 138) return '외야 지정석';
  if (blockNumber >= 201 && blockNumber <= 210) return '2층 1루 내야석';
  if (blockNumber >= 211 && blockNumber <= 223) return '2층 3루 내야석';
  if (blockNumber >= 301 && blockNumber <= 312) return '3층 1루 내야석';
  if (blockNumber >= 313 && blockNumber <= 315) return '3층 스카이박스';
  if (blockNumber >= 321 && blockNumber <= 333) return '3층 3루 내야석';
  return '4층 내야석';
}

function getSeatTypes(block: string): string[] {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 101 && blockNumber <= 104) return ['프리미엄석'];
  if (blockNumber >= 105 && blockNumber <= 108) return ['홈 응원석'];
  if (blockNumber === 111) return ['미니테이블석'];
  if (blockNumber >= 112 && blockNumber <= 114) return ['프리미엄 테이블석', '내야석'];
  if (blockNumber >= 115 && blockNumber <= 118) return ['테이블석'];
  if (blockNumber >= 121 && blockNumber <= 124) return ['원정 응원석'];
  if (blockNumber >= 126 && blockNumber <= 127) return ['바베큐석'];
  if (blockNumber === 128) return ['불펜 가족석'];
  if (blockNumber === 129) return ['외야 잔디석'];
  if (blockNumber >= 130 && blockNumber <= 138) return ['외야 지정석'];
  if (blockNumber >= 313 && blockNumber <= 315) return ['스카이박스'];
  return ['내야석'];
}

function getCategory(block: string): string {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 101 && blockNumber <= 104) return 'PREMIUM';
  if (blockNumber >= 105 && blockNumber <= 108) return 'CHEERING';
  if (blockNumber === 111) return 'MINI_TABLE';
  if (blockNumber >= 112 && blockNumber <= 114) return 'PREMIUM_TABLE';
  if (blockNumber >= 115 && blockNumber <= 118) return 'TABLE';
  if (blockNumber >= 121 && blockNumber <= 124) return 'AWAY';
  if (blockNumber >= 126 && blockNumber <= 127) return 'BBQ';
  if (blockNumber === 128) return 'BULLPEN_FAMILY';
  if (blockNumber === 129) return 'OUTFIELD_GRASS';
  if (blockNumber >= 130 && blockNumber <= 138) return 'OUTFIELD';
  if (blockNumber >= 313 && blockNumber <= 315) return 'SKYBOX';
  return 'INFIELD';
}

function getAliasExtra(block: string): string[] {
  const blockNumber = getBlockNumber(block);
  if (blockNumber >= 101 && blockNumber <= 104) return ['101-104', '1루 프리미엄'];
  if (blockNumber >= 105 && blockNumber <= 108) return ['105-108', '내야 응원석', '홈 응원'];
  if (blockNumber >= 112 && blockNumber <= 114) return ['112-114', '포수 후면', '중앙 테이블'];
  if (blockNumber >= 115 && blockNumber <= 118) return ['115-118', '3루 테이블'];
  if (blockNumber >= 121 && blockNumber <= 124) return ['121-124', '원정 응원', '원정석'];
  if (blockNumber >= 126 && blockNumber <= 127) return ['126-127', '바베큐석'];
  if (blockNumber === 128) return ['불펜 가족석'];
  if (blockNumber === 129) return ['외야 잔디석'];
  if (blockNumber >= 130 && blockNumber <= 138) return ['130-138', '외야 지정석'];
  if (blockNumber >= 201 && blockNumber <= 210) return ['201-210', '2층 1루 내야석'];
  if (blockNumber >= 211 && blockNumber <= 223) return ['211-223', '2층 3루 내야석'];
  if (blockNumber >= 301 && blockNumber <= 315) return ['301-315', blockNumber >= 313 ? '3층 스카이박스' : '3층 1루 내야석'];
  if (blockNumber >= 321 && blockNumber <= 333) return ['321-333', '3층 3루 내야석'];
  if (blockNumber >= 401 && blockNumber <= 416) return ['401-416', '4층 1루 내야석'];
  return ['420·422-433', '4층 3루 내야석'];
}

function buildBlockSpec(block: string): ChangwonBlockSpec {
  const imageGeometry = CHANGWON_IMAGE_GEOMETRY[block];

  if (!imageGeometry) {
    throw new Error(`Missing Changwon official image geometry for block ${block}`);
  }

  return {
    block,
    level: getLevel(block),
    side: getSide(block),
    fanRole: getFanRole(block),
    category: getCategory(block),
    name: getName(block),
    seatTypes: getSeatTypes(block),
    aliasExtra: getAliasExtra(block),
    imageGeometry,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function toChangwonBlock(spec: ChangwonBlockSpec): ChangwonBlock {
  const cat = CHANGWON_CATEGORIES[spec.category];
  const sourceNote = `NC 다이노스 공식 구장/시설 안내 좌석배치도에서 확인한 ${spec.block} 블록입니다.`;
  const seatViewSections = unique([
    spec.block,
    `${spec.block}블록`,
    `블록 ${spec.block}`,
    `${spec.block} ${spec.name}`,
    spec.name,
    getChangwonLevelLabel(spec.level),
    getChangwonSideLabel(spec.side),
    cat?.label ?? '',
    ...spec.seatTypes,
    ...spec.aliasExtra,
  ]);

  return {
    id: `changwon-block-${spec.block}`,
    level: spec.level,
    category: spec.category,
    name: spec.name,
    block: spec.block,
    officialBlocks: [spec.block],
    side: spec.side,
    fanRole: spec.fanRole,
    seatTypes: spec.seatTypes,
    sourceConfidence: 'OFFICIAL',
    sourceNote,
    seatViewSections,
    accessibilityNote: ACCESSIBLE_BLOCKS.has(spec.block)
      ? '공식 좌석도에 휠체어석 표기가 인접한 블록입니다.'
      : undefined,
    imageGeometry: spec.imageGeometry,
  };
}

const CHANGWON_SPECIAL_BLOCKS: ChangwonBlock[] = [
  {
    id: 'changwon-special-first-bbq',
    level: '2F',
    category: 'BBQ',
    name: '1루 바베큐석',
    block: '1루 바베큐석',
    officialBlocks: ['1루 바베큐석'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    seatTypes: ['바베큐석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 1루 바베큐석 구역입니다.',
    seatViewSections: ['1루 바베큐석', '바베큐석', 'NC파크 1루 바베큐석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['1루 바베큐석'],
  },
  {
    id: 'changwon-special-third-round-table',
    level: '2F',
    category: 'ROUND_TABLE',
    name: '3루 라운드 테이블석',
    block: '3루 라운드 테이블석',
    officialBlocks: ['3루 라운드 테이블석'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    seatTypes: ['라운드 테이블석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 3루 라운드 테이블석 구역입니다.',
    seatViewSections: ['3루 라운드 테이블석', '라운드 테이블석', 'NC파크 3루 라운드 테이블석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['3루 라운드 테이블석'],
  },
  {
    id: 'changwon-special-first-round-table',
    level: '3F',
    category: 'ROUND_TABLE',
    name: '1루 라운드 테이블석',
    block: '1루 라운드 테이블석',
    officialBlocks: ['1루 라운드 테이블석'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    seatTypes: ['라운드 테이블석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 1루 라운드 테이블석 구역입니다.',
    seatViewSections: ['1루 라운드 테이블석', '라운드 테이블석', 'NC파크 1루 라운드 테이블석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['1루 라운드 테이블석'],
  },
  {
    id: 'changwon-special-first-table',
    level: '3F',
    category: 'TABLE',
    name: '1루 테이블석',
    block: '1루 테이블석',
    officialBlocks: ['1루 테이블석'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    seatTypes: ['테이블석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 1루 테이블석 구역입니다.',
    seatViewSections: ['1루 테이블석', '테이블석', 'NC파크 1루 테이블석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['1루 테이블석'],
  },
  {
    id: 'changwon-special-outfield-counter',
    level: 'OUTFIELD',
    category: 'OUTFIELD_COUNTER',
    name: '외야 카운터석',
    block: '외야 카운터석',
    officialBlocks: ['외야 카운터석'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    seatTypes: ['외야 카운터석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 외야 카운터석 구역입니다.',
    seatViewSections: ['외야 카운터석', '카운터석', 'NC파크 외야 카운터석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['외야 카운터석'],
  },
  {
    id: 'changwon-special-outfield-family',
    level: 'OUTFIELD',
    category: 'OUTFIELD_FAMILY',
    name: '외야 가족석',
    block: '외야 가족석',
    officialBlocks: ['외야 가족석'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    seatTypes: ['외야 가족석'],
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'NC 다이노스 공식 구장/시설 안내 좌석배치도에서 색상으로 확인한 번호 없는 외야 가족석 구역입니다.',
    seatViewSections: ['외야 가족석', '가족석', 'NC파크 외야 가족석'],
    imageGeometry: CHANGWON_IMAGE_GEOMETRY['외야 가족석'],
  },
];

export const CHANGWON_BLOCKS: ChangwonBlock[] = CHANGWON_EXPECTED_VISIBLE_BLOCKS
  .map(buildBlockSpec)
  .map(toChangwonBlock)
  .concat(CHANGWON_SPECIAL_BLOCKS);

export function getChangwonSideLabel(side: ChangwonSide): string {
  if (side === 'FIRST_BASE') return '1루';
  if (side === 'THIRD_BASE') return '3루';
  if (side === 'CENTER') return '중앙';
  return '외야';
}

export function getChangwonFanRoleLabel(role: ChangwonFanRole): string {
  if (role === 'HOME') return '홈 응원';
  if (role === 'AWAY') return '원정 응원';
  return '중립';
}

export function getChangwonSourceLabel(confidence: ChangwonSourceConfidence): string {
  if (confidence === 'OFFICIAL') return '공식 확인';
  return '공식 확인 필요';
}

export function getChangwonLevelLabel(level: ChangwonLevel): string {
  if (level === '1F') return '1층';
  if (level === '2F') return '2층';
  if (level === '3F') return '3층';
  if (level === '4F') return '4층';
  return '외야';
}

export function getChangwonBlockDisplayName(block: ChangwonBlock): string {
  if (block.block === block.name) return block.name;
  return `${block.block} ${block.name}`;
}

export function isChangwonSpecialSelectableArea(block: ChangwonBlock): boolean {
  return CHANGWON_SPECIAL_SELECTABLE_AREAS.includes(block.block);
}

export function normalizeChangwonSeatMapSearchText(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

export function getChangwonSeatMapSearchTokens(block: ChangwonBlock): string[] {
  const category = CHANGWON_CATEGORIES[block.category];
  return unique([
    block.block,
    block.name,
    getChangwonBlockDisplayName(block),
    getChangwonLevelLabel(block.level),
    getChangwonSideLabel(block.side),
    getChangwonFanRoleLabel(block.fanRole),
    category?.label ?? '',
    ...block.officialBlocks,
    ...block.seatTypes,
    ...block.seatViewSections,
    block.accessibilityNote ?? '',
    isChangwonSpecialSelectableArea(block) ? '특수 구역' : '',
  ]).map(normalizeChangwonSeatMapSearchText).filter(Boolean);
}

export function searchChangwonSeatMapBlocks(query: string, blocks: ChangwonBlock[] = CHANGWON_BLOCKS): ChangwonBlock[] {
  const normalizedQuery = normalizeChangwonSeatMapSearchText(query);
  if (!normalizedQuery) return [];

  return blocks
    .map((block, order) => {
      const tokens = getChangwonSeatMapSearchTokens(block);
      const exactMatch = tokens.some((token) => token === normalizedQuery);
      const prefixMatch = tokens.some((token) => token.startsWith(normalizedQuery));
      const partialMatch = tokens.some((token) => token.includes(normalizedQuery));

      if (!partialMatch) return null;

      return {
        block,
        order,
        rank: exactMatch ? 0 : prefixMatch ? 1 : 2,
      };
    })
    .filter((match): match is { block: ChangwonBlock; order: number; rank: number } => Boolean(match))
    .sort((left, right) => left.rank - right.rank || left.order - right.order)
    .map((match) => match.block);
}

export function isChangwonBlockInCategoryGroup(block: ChangwonBlock, group: ChangwonCategoryGroup): boolean {
  if (group.id === 'all') return true;
  if (group.accessibilityOnly) return Boolean(block.accessibilityNote) || block.category === 'ACCESSIBLE';
  if (group.cats && group.cats.length > 0 && group.cats.includes(block.category)) return true;
  if (group.fanRoles && group.fanRoles.length > 0 && group.fanRoles.includes(block.fanRole)) return true;
  if (group.levels && group.levels.length > 0 && group.levels.includes(block.level)) return true;
  return false;
}
