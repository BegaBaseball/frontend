// Changwon NC Park seat data.
// Keep this static: do not add runtime crawling or web-search data collection.

export type ChangwonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type ChangwonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type ChangwonLevel = '1F' | '2F' | '3F' | '4F' | 'OUTFIELD';
export type ChangwonSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type ChangwonSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';
export type ChangwonTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'NEEDS_OPERATOR_REVIEW';

export interface ChangwonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
  traceStatus: ChangwonTraceStatus;
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
  BULLPEN_FAMILY: { label: '불펜 가족석', light: '#DB2777', dark: '#F472B6', textLight: '#831843', textDark: '#FCE7F3' },
  SKYBOX: { label: '스카이박스', light: '#4F46E5', dark: '#818CF8', textLight: '#312E81', textDark: '#E0E7FF' },
  ACCESSIBLE: { label: '휠체어석', light: '#06B6D4', dark: '#22D3EE', textLight: '#164E63', textDark: '#CFFAFE' },
};

export const CHANGWON_CATEGORY_GROUPS: ChangwonCategoryGroup[] = [
  { id: 'all', label: '전체', cats: null },
  { id: 'level1', label: '1층', cats: null, levels: ['1F', 'OUTFIELD'] },
  { id: 'level2', label: '2층', cats: null, levels: ['2F'] },
  { id: 'level34', label: '3·4층', cats: null, levels: ['3F', '4F'] },
  { id: 'cheer', label: '응원석', cats: ['CHEERING', 'AWAY'], fanRoles: ['HOME', 'AWAY'] },
  { id: 'outfield-special', label: '외야·특수', cats: ['OUTFIELD', 'OUTFIELD_GRASS', 'BBQ', 'BULLPEN_FAMILY', 'SKYBOX'] },
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

type ChangwonTraceReferenceTuple = [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const CHANGWON_TRACE_ANCHOR_TOLERANCE_PX = 8;
export const CHANGWON_TRACE_BOUNDS_TOLERANCE_PX = 12;

const toTraceReference = (
  entries: ChangwonTraceReferenceTuple[],
): Record<string, ChangwonOfficialTraceReference> => Object.fromEntries(entries.map(([
  block,
  anchorX,
  anchorY,
  minX,
  minY,
  maxX,
  maxY,
  expectedSubpathCount,
]) => [block, {
  numberAnchor: { x: anchorX, y: anchorY },
  expectedBounds: { minX, minY, maxX, maxY },
  expectedSubpathCount,
}]));

export const CHANGWON_OFFICIAL_TRACE_REFERENCE: Record<string, ChangwonOfficialTraceReference> = toTraceReference([
  ['101', 1423, 720, 1406, 685, 1440, 756, 1],
  ['102', 1423, 783, 1406, 757, 1440, 810, 1],
  ['103', 1423, 837, 1406, 811, 1440, 864, 1],
  ['104', 1408, 902, 1383, 867, 1432, 939, 1],
  ['105', 1325, 960, 1235, 897, 1406, 1025, 1],
  ['106', 1295, 1003, 1209, 943, 1372, 1066, 1],
  ['107', 1267, 1049, 1182, 988, 1345, 1112, 1],
  ['108', 1213, 1143, 1144, 1078, 1276, 1210, 1],
  ['109', 1124, 1202, 1048, 1163, 1195, 1243, 1],
  ['110', 1125, 1277, 1048, 1238, 1195, 1318, 1],
  ['111', 1117, 1384, 1076, 1337, 1155, 1433, 1],
  ['112', 1057, 1430, 1027, 1359, 1101, 1450, 2],
  ['113', 1010, 1397, 980, 1371, 1039, 1403, 2],
  ['114', 888, 1431, 858, 1358, 931, 1451, 2],
  ['115', 885, 1302, 828, 1244, 943, 1362, 1],
  ['116', 832, 1248, 763, 1178, 899, 1318, 1],
  ['117', 782, 1199, 720, 1137, 842, 1260, 1],
  ['118', 739, 1155, 676, 1094, 799, 1216, 1],
  ['119', 693, 1052, 605, 988, 777, 1116, 1],
  ['120', 665, 1007, 579, 943, 750, 1071, 1],
  ['121', 638, 960, 553, 897, 724, 1025, 1],
  ['122', 623, 920, 549, 865, 697, 979, 1],
  ['123', 619, 836, 549, 811, 689, 864, 1],
  ['124', 596, 783, 549, 757, 643, 810, 1],
  ['125', 555, 730, 507, 696, 602, 765, 1],
  ['126', 485, 779, 456, 719, 513, 841, 1],
  ['127', 478, 690, 439, 631, 513, 751, 1],
  ['128', 606, 584, 554, 524, 654, 646, 1],
  ['129', 760, 450, 637, 286, 913, 565, 1],
  ['130', 1072, 338, 1046, 286, 1098, 391, 1],
  ['131', 1124, 355, 1085, 308, 1162, 404, 1],
  ['132', 1170, 391, 1120, 336, 1218, 446, 1],
  ['133', 1213, 439, 1163, 391, 1260, 488, 1],
  ['134', 1290, 518, 1243, 472, 1336, 565, 1],
  ['135', 1340, 544, 1305, 510, 1374, 578, 1],
  ['136', 1376, 580, 1343, 547, 1409, 613, 1],
  ['137', 1412, 615, 1378, 582, 1446, 650, 1],
  ['138', 1412, 646, 1378, 608, 1446, 686, 1],
  ['201', 1484, 924, 1441, 876, 1522, 973, 1],
  ['202', 1460, 978, 1414, 939, 1502, 1019, 1],
  ['203', 1434, 1025, 1388, 986, 1475, 1065, 1],
  ['204', 1381, 1115, 1335, 1076, 1423, 1156, 1],
  ['205', 1346, 1175, 1290, 1123, 1397, 1230, 1],
  ['206', 1294, 1226, 1246, 1180, 1339, 1273, 1],
  ['207', 1251, 1269, 1203, 1224, 1296, 1316, 1],
  ['208', 1208, 1314, 1161, 1267, 1252, 1362, 1],
  ['209', 1220, 1406, 1190, 1376, 1248, 1437, 1],
  ['210', 1150, 1449, 1121, 1418, 1178, 1481, 1],
  ['211', 1112, 1465, 1084, 1435, 1138, 1496, 1],
  ['212', 1010, 1413, 980, 1398, 1039, 1429, 1],
  ['213', 1010, 1440, 980, 1424, 1039, 1456, 1],
  ['214', 949, 1412, 919, 1371, 979, 1456, 1],
  ['215', 848, 1465, 821, 1435, 875, 1496, 1],
  ['216', 809, 1449, 781, 1418, 838, 1481, 1],
  ['217', 773, 1429, 744, 1398, 802, 1461, 1],
  ['218', 713, 1382, 684, 1353, 741, 1412, 1],
  ['219', 665, 1333, 635, 1304, 693, 1362, 1],
  ['220', 640, 1308, 610, 1279, 668, 1337, 1],
  ['221', 590, 1258, 560, 1229, 618, 1287, 1],
  ['222', 552, 1217, 509, 1172, 593, 1262, 1],
  ['223', 580, 1116, 537, 1077, 623, 1155, 1],
  ['301', 1537, 990, 1506, 956, 1564, 1026, 1],
  ['302', 1498, 1087, 1452, 1018, 1540, 1158, 1],
  ['303', 1454, 1123, 1426, 1094, 1479, 1154, 1],
  ['304', 1437, 1172, 1401, 1139, 1470, 1207, 1],
  ['305', 1451, 1234, 1408, 1219, 1490, 1250, 1],
  ['306', 1411, 1299, 1379, 1269, 1441, 1330, 1],
  ['307', 1348, 1356, 1317, 1327, 1376, 1386, 1],
  ['308', 1334, 1373, 1280, 1355, 1383, 1392, 1],
  ['309', 1265, 1460, 1227, 1428, 1300, 1494, 1],
  ['310', 1201, 1487, 1174, 1458, 1227, 1518, 1],
  ['311', 1169, 1519, 1143, 1503, 1194, 1535, 1],
  ['312', 1258, 1449, 1220, 1417, 1293, 1482, 1],
  ['313', 1230, 1469, 1192, 1437, 1265, 1502, 1],
  ['314', 1170, 1491, 1143, 1475, 1194, 1508, 1],
  ['315', 1123, 1522, 1088, 1494, 1155, 1551, 1],
  ['321', 848, 1466, 824, 1438, 872, 1493, 1],
  ['322', 809, 1450, 784, 1421, 834, 1478, 1],
  ['323', 773, 1430, 747, 1401, 799, 1458, 1],
  ['324', 740, 1407, 714, 1379, 766, 1434, 1],
  ['325', 713, 1383, 687, 1356, 738, 1409, 1],
  ['326', 623, 1374, 597, 1348, 649, 1400, 1],
  ['327', 664, 1333, 638, 1307, 690, 1359, 1],
  ['328', 639, 1308, 613, 1282, 665, 1334, 1],
  ['329', 614, 1283, 588, 1257, 640, 1309, 1],
  ['330', 589, 1258, 563, 1232, 615, 1284, 1],
  ['331', 551, 1217, 512, 1175, 590, 1259, 1],
  ['332', 515, 1158, 482, 1124, 548, 1192, 1],
  ['333', 487, 1109, 456, 1078, 518, 1140, 1],
  ['401', 1575, 1037, 1551, 1010, 1598, 1063, 1],
  ['402', 1550, 1071, 1528, 1046, 1572, 1095, 1],
  ['403', 1527, 1112, 1505, 1088, 1548, 1136, 1],
  ['404', 1503, 1153, 1481, 1129, 1525, 1177, 1],
  ['405', 1484, 1205, 1451, 1171, 1517, 1239, 1],
  ['406', 1449, 1260, 1411, 1222, 1487, 1298, 1],
  ['407', 1341, 1287, 1313, 1259, 1369, 1315, 1],
  ['408', 1310, 1319, 1280, 1289, 1339, 1348, 1],
  ['409', 1286, 1418, 1255, 1388, 1314, 1449, 1],
  ['410', 1258, 1449, 1221, 1417, 1292, 1482, 1],
  ['411', 1230, 1469, 1193, 1437, 1264, 1502, 1],
  ['412', 1258, 1449, 1234, 1423, 1282, 1475, 1],
  ['413', 1230, 1469, 1206, 1442, 1255, 1496, 1],
  ['414', 1200, 1488, 1177, 1461, 1224, 1515, 1],
  ['415', 1168, 1505, 1146, 1478, 1191, 1532, 1],
  ['416', 1123, 1522, 1092, 1492, 1156, 1552, 1],
  ['420', 835, 1522, 803, 1492, 866, 1552, 1],
  ['422', 759, 1488, 735, 1461, 782, 1515, 1],
  ['423', 729, 1469, 704, 1442, 753, 1496, 1],
  ['424', 701, 1449, 677, 1423, 724, 1475, 1],
  ['425', 678, 1422, 654, 1397, 701, 1446, 1],
  ['426', 649, 1427, 622, 1401, 676, 1453, 1],
  ['427', 623, 1374, 597, 1348, 649, 1400, 1],
  ['428', 598, 1349, 572, 1323, 624, 1375, 1],
  ['429', 573, 1324, 547, 1298, 599, 1350, 1],
  ['431', 509, 1258, 469, 1216, 549, 1300, 1],
  ['432', 469, 1193, 432, 1153, 505, 1233, 1],
  ['433', 437, 1138, 406, 1107, 468, 1169, 1],
]);

const CHANGWON_GEOMETRY_PATH_TEMPLATES: Record<string, ChangwonImageGeometry> = {
  '101': { d: 'M 1389 706.8 L 1429.8 699.6 L 1438 727.3 L 1435.9 767.2 L 1397.4 771.8 L 1389.9 741.4 Z', labelX: 1414, labelY: 735, labelRotate: -3, labelFontSize: 18, shortLabel: '101', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '102': { d: 'M 1387 761.8 L 1427.8 754.6 L 1436 782.3 L 1433.9 822.2 L 1395.4 826.8 L 1387.9 796.4 Z', labelX: 1412, labelY: 790, labelRotate: -3, labelFontSize: 18, shortLabel: '102', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '103': { d: 'M 1385 817.8 L 1425.8 810.6 L 1434 838.3 L 1431.9 878.2 L 1393.4 882.8 L 1385.9 852.4 Z', labelX: 1410, labelY: 846, labelRotate: -3, labelFontSize: 18, shortLabel: '103', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '104': { d: 'M 1383 873.8 L 1423.8 866.6 L 1432 894.3 L 1429.9 934.2 L 1391.4 938.8 L 1383.9 908.4 Z', labelX: 1408, labelY: 902, labelRotate: -3, labelFontSize: 18, shortLabel: '104', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '105': { d: 'M 1261.1 955.1 L 1347.2 922 L 1369.9 943.3 L 1372.9 982.7 L 1291.4 1011.8 L 1269.7 987.6 Z', labelX: 1320, labelY: 966, labelRotate: -18, labelFontSize: 18, shortLabel: '105', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '106': { d: 'M 1215.5 1011.3 L 1299.1 972.2 L 1323.2 991.8 L 1328.9 1031 L 1249.7 1065.7 L 1226.3 1043 Z', labelX: 1275, labelY: 1018, labelRotate: -22, labelFontSize: 18, shortLabel: '106', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '107': { d: 'M 1170.2 1069.4 L 1250.8 1024.6 L 1276.3 1042.5 L 1284.7 1081.2 L 1208 1121.3 L 1183.2 1100.4 Z', labelX: 1230, labelY: 1072, labelRotate: -26, labelFontSize: 18, shortLabel: '107', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '108': { d: 'M 1128.2 1125.6 L 1205.5 1075.3 L 1232.1 1091.4 L 1243.2 1129.4 L 1169.5 1174.7 L 1143.3 1155.6 Z', labelX: 1188, labelY: 1124, labelRotate: -30, labelFontSize: 18, shortLabel: '108', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '109': { d: 'M 1090.4 1225.8 L 1164 1170.2 L 1191.7 1184.4 L 1205.4 1221.5 L 1135.1 1271.9 L 1107.6 1254.6 Z', labelX: 1150, labelY: 1220, labelRotate: -34, labelFontSize: 18, shortLabel: '109', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '110': { d: 'M 1045.8 1271.2 L 1130.6 1235 L 1154.1 1255.5 L 1158.4 1294.9 L 1078 1326.8 L 1055.5 1303.3 Z', labelX: 1105, labelY: 1280, labelRotate: -20, labelFontSize: 18, shortLabel: '110', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '111': { d: 'M 1079.5 1346.7 L 1143.3 1321.1 L 1161.8 1341.9 L 1166.3 1378.3 L 1105.7 1400.4 L 1087.8 1377 Z', labelX: 1125, labelY: 1360, labelRotate: -18, labelFontSize: 18, shortLabel: '111', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '112': { d: 'M 1035.5 1385.6 L 1100.9 1364.5 L 1118 1386.6 L 1119.9 1423.1 L 1058 1441 L 1041.7 1416.3 Z M 1072 1274.3 L 1130.8 1258.4 L 1144.3 1274.4 L 1143.7 1301.2 L 1088.2 1314.7 L 1075.5 1296.8 Z', labelX: 1080, labelY: 1400, labelRotate: -14, labelFontSize: 18, shortLabel: '112', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '113': { d: 'M 940.8 1385.3 L 1009.4 1380.7 L 1020.6 1406.2 L 1013.6 1442.2 L 949.2 1444.5 L 939.4 1416.6 Z M 945.3 1268.7 L 1006 1265.3 L 1016 1283.8 L 1009.8 1309.8 L 952.7 1311.5 L 944 1291.4 Z', labelX: 980, labelY: 1410, labelFontSize: 18, shortLabel: '113', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '114': { d: 'M 858.4 1364.6 L 926.1 1376.7 L 930.8 1404.2 L 915.3 1437.4 L 852.3 1424.1 L 849.5 1394.7 Z M 834.1 1259.9 L 894.2 1269.2 L 900 1289.4 L 888.6 1313.6 L 832.4 1303.3 L 828.1 1281.8 Z', labelX: 870, labelY: 1400, labelRotate: 14, labelFontSize: 18, shortLabel: '114', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '115': { d: 'M 804.6 1290.4 L 882.4 1310.9 L 887 1339.2 L 868.1 1370.8 L 795.6 1349.7 L 793.3 1319.7 Z', labelX: 840, labelY: 1330, labelRotate: 18, labelFontSize: 18, shortLabel: '115', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '116': { d: 'M 760.4 1225.9 L 834.7 1256.9 L 835.3 1285.6 L 812.2 1314.4 L 743.3 1283.4 L 745.2 1253.3 Z', labelX: 790, labelY: 1270, labelRotate: 26, labelFontSize: 18, shortLabel: '116', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '117': { d: 'M 708.6 1168.9 L 780.5 1205.1 L 779.1 1233.8 L 754 1260.8 L 687.5 1225.1 L 691.5 1195.2 Z', labelX: 735, labelY: 1215, labelRotate: 30, labelFontSize: 18, shortLabel: '117', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '118': { d: 'M 665.2 1113 L 735.8 1151.7 L 733.4 1180.3 L 707.4 1206.4 L 642.2 1168.4 L 647.2 1138.7 Z', labelX: 690, labelY: 1160, labelRotate: 32, labelFontSize: 18, shortLabel: '118', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '119': { d: 'M 623.6 1023.9 L 695.5 1060.1 L 694.1 1088.8 L 669 1115.8 L 602.5 1080.1 L 606.5 1050.2 Z', labelX: 650, labelY: 1070, labelRotate: 30, labelFontSize: 18, shortLabel: '119', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '120': { d: 'M 593.9 966.9 L 669.2 995.4 L 670.8 1024 L 648.7 1053.6 L 578.8 1025 L 579.7 994.9 Z', labelX: 625, labelY: 1010, labelRotate: 24, labelFontSize: 18, shortLabel: '120', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '121': { d: 'M 569.6 915.4 L 647.4 935.9 L 652 964.2 L 633.1 995.8 L 560.6 974.7 L 558.3 944.7 Z', labelX: 605, labelY: 955, labelRotate: 18, labelFontSize: 18, shortLabel: '121', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '122': { d: 'M 523.2 842.2 L 603.5 848.8 L 612.9 875.9 L 599.8 910.3 L 524.8 902.1 L 517.3 873 Z', labelX: 565, labelY: 875, labelRotate: 8, labelFontSize: 18, shortLabel: '122', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '123': { d: 'M 510.5 796 L 591 795.5 L 602.8 821.7 L 592.7 857.2 L 517.3 855.5 L 507.3 827.1 Z', labelX: 555, labelY: 825, labelRotate: 3, labelFontSize: 18, shortLabel: '123', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '124': { d: 'M 509.1 748.3 L 589.4 743.7 L 602.6 769.2 L 594.4 805.2 L 518.9 807.5 L 507.4 779.6 Z', labelX: 555, labelY: 775, labelFontSize: 18, shortLabel: '124', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '125': { d: 'M 507.3 706.6 L 587.2 696.4 L 602 720.9 L 596.4 757.3 L 521.3 764.9 L 507.9 737.9 Z', labelX: 555, labelY: 730, labelRotate: -4, labelFontSize: 18, shortLabel: '125', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '126': { d: 'M 450.2 757 L 516.4 747.8 L 529 771.7 L 524.6 806.8 L 462.3 813.4 L 451 787.2 Z', labelX: 490, labelY: 780, labelRotate: -4, labelFontSize: 18, shortLabel: '126', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '127': { d: 'M 438 681.2 L 502.9 665.3 L 517.9 687.6 L 517.2 723 L 456 736.1 L 441.9 711.3 Z', labelX: 480, labelY: 700, labelRotate: -10, labelFontSize: 18, shortLabel: '127', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '128': { d: 'M 535.8 537.3 L 597.8 512.4 L 615.8 532.5 L 620 567.6 L 561.2 589.1 L 543.9 566.4 Z', labelX: 580, labelY: 550, labelRotate: -18, labelFontSize: 18, shortLabel: '128', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '129': { d: 'M 637 436 L 862 286 L 913 286 L 913 392 L 865 392 L 684 565 Z', labelX: 760, labelY: 450, labelRotate: -20, labelFontSize: 18, shortLabel: '129', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '130': { d: 'M 1033.8 298.3 L 1092.8 313.4 L 1095.7 336.5 L 1080.6 362.9 L 1025.7 347.1 L 1024.6 322.5 Z', labelX: 1060, labelY: 330, labelRotate: 18, labelFontSize: 18, shortLabel: '130', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '131': { d: 'M 1101.1 316.5 L 1158.9 335.7 L 1160.1 359 L 1143.2 384.3 L 1089.6 364.7 L 1090.2 340.1 Z', labelX: 1125, labelY: 350, labelRotate: 22, labelFontSize: 18, shortLabel: '131', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '132': { d: 'M 1154.7 364.2 L 1210.2 389.3 L 1209 412.6 L 1189.6 436 L 1138.3 410.9 L 1141.4 386.5 Z', labelX: 1175, labelY: 400, labelRotate: 28, labelFontSize: 18, shortLabel: '132', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '133': { d: 'M 1209.7 414.2 L 1265.2 439.3 L 1264 462.6 L 1244.6 486 L 1193.3 460.9 L 1196.4 436.5 Z', labelX: 1230, labelY: 450, labelRotate: 28, labelFontSize: 18, shortLabel: '133', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '134': { d: 'M 1264.1 464.6 L 1320 488.7 L 1319.2 512 L 1300.2 535.8 L 1248.5 511.6 L 1251.2 487.1 Z', labelX: 1285, labelY: 500, labelRotate: 27, labelFontSize: 18, shortLabel: '134', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '135': { d: 'M 1317.3 510.7 L 1374.3 531.9 L 1374.8 555.2 L 1357 579.9 L 1304.1 558.5 L 1305.6 533.9 Z', labelX: 1340, labelY: 545, labelRotate: 24, labelFontSize: 18, shortLabel: '135', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '136': { d: 'M 1364.9 542.4 L 1423.3 559.5 L 1425.4 582.8 L 1409.4 608.6 L 1355.2 590.9 L 1354.9 566.3 Z', labelX: 1390, labelY: 575, labelRotate: 20, labelFontSize: 18, shortLabel: '136', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '137': { d: 'M 1391.7 585.2 L 1451.5 596.1 L 1456.1 619 L 1442.8 646.4 L 1387 634.5 L 1384.2 610 Z', labelX: 1420, labelY: 615, labelRotate: 14, labelFontSize: 18, shortLabel: '137', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '138': { d: 'M 1386.7 598.2 L 1446.5 609.1 L 1451.1 632 L 1437.8 659.4 L 1382 647.5 L 1379.2 623 Z', labelX: 1415, labelY: 628, labelRotate: 14, labelFontSize: 18, shortLabel: '138', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '201': { d: 'M 1448 935.4 L 1512.3 917.7 L 1527.5 936.9 L 1527.3 968.6 L 1466.6 983.6 L 1452.3 962.1 Z', labelX: 1490, labelY: 950, labelRotate: -12, labelFontSize: 16, shortLabel: '201', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '202': { d: 'M 1427.3 992.6 L 1490.6 971.5 L 1506.8 990 L 1508.3 1021.7 L 1448.3 1039.8 L 1432.9 1019.1 Z', labelX: 1470, labelY: 1005, labelRotate: -15, labelFontSize: 16, shortLabel: '202', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '203': { d: 'M 1396.7 1049.9 L 1458.8 1025.5 L 1476 1043.1 L 1479.1 1074.6 L 1420.2 1095.9 L 1403.7 1076 Z', labelX: 1440, labelY: 1060, labelRotate: -18, labelFontSize: 16, shortLabel: '203', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '204': { d: 'M 1361.2 1102.2 L 1422 1074.6 L 1440 1091.2 L 1444.8 1122.6 L 1387.1 1146.9 L 1369.6 1127.9 Z', labelX: 1405, labelY: 1110, labelRotate: -21, labelFontSize: 16, shortLabel: '204', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '205': { d: 'M 1325.9 1159.5 L 1385.1 1128.7 L 1404 1144.4 L 1410.4 1175.5 L 1354.1 1202.7 L 1335.6 1184.7 Z', labelX: 1370, labelY: 1165, labelRotate: -24, labelFontSize: 16, shortLabel: '205', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '206': { d: 'M 1285.7 1221 L 1343.8 1188.2 L 1363.3 1203.2 L 1370.7 1234.1 L 1315.4 1263.3 L 1296.3 1245.9 Z', labelX: 1330, labelY: 1225, labelRotate: -26, labelFontSize: 16, shortLabel: '206', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '207': { d: 'M 1245.6 1281.8 L 1303.2 1248 L 1322.9 1262.6 L 1330.9 1293.3 L 1276.1 1323.5 L 1256.7 1306.5 Z', labelX: 1290, labelY: 1285, labelRotate: -27, labelFontSize: 16, shortLabel: '207', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '208': { d: 'M 1200.5 1338.3 L 1256.9 1302.5 L 1277.1 1316.5 L 1286.2 1346.9 L 1232.4 1379 L 1212.4 1362.6 Z', labelX: 1245, labelY: 1340, labelRotate: -29, labelFontSize: 16, shortLabel: '208', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '209': { d: 'M 1150.5 1389.9 L 1205.6 1352.1 L 1226.2 1365.4 L 1236.4 1395.5 L 1183.8 1429.4 L 1163.3 1413.7 Z', labelX: 1195, labelY: 1390, labelRotate: -31, labelFontSize: 16, shortLabel: '209', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '210': { d: 'M 1095.6 1437.2 L 1148.6 1396.6 L 1169.9 1408.8 L 1181.6 1438.3 L 1130.9 1474.9 L 1109.5 1460.4 Z', labelX: 1140, labelY: 1435, labelRotate: -34, labelFontSize: 16, shortLabel: '210', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '211': { d: 'M 1042.3 1457.6 L 1105.6 1436.5 L 1121.8 1455 L 1123.3 1486.7 L 1063.3 1504.8 L 1047.9 1484.1 Z', labelX: 1085, labelY: 1470, labelRotate: -15, labelFontSize: 16, shortLabel: '211', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '212': { d: 'M 989.1 1467.5 L 1054.5 1454.3 L 1068.4 1474.6 L 1065.9 1506.2 L 1004.3 1516.9 L 991.5 1494.5 Z', labelX: 1030, labelY: 1485, labelRotate: -8, labelFontSize: 16, shortLabel: '212', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '213': { d: 'M 941.9 1467 L 1008.6 1463 L 1019.4 1485 L 1012.6 1516 L 950.1 1518 L 940.6 1494 Z', labelX: 980, labelY: 1490, labelFontSize: 16, shortLabel: '213', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '214': { d: 'M 890.5 1456.9 L 957 1462.2 L 964.8 1485.5 L 953.7 1515.3 L 891.5 1508.6 L 885.4 1483.5 Z', labelX: 925, labelY: 1485, labelRotate: 8, labelFontSize: 16, shortLabel: '214', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '215': { d: 'M 838.6 1443.5 L 904.2 1455.7 L 909.5 1479.7 L 895.4 1508.1 L 834.2 1494.9 L 830.8 1469.3 Z', labelX: 870, labelY: 1475, labelRotate: 14, labelFontSize: 16, shortLabel: '215', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '216': { d: 'M 787.1 1420.4 L 851.1 1439.4 L 853.8 1463.8 L 836.8 1490.6 L 777.3 1471.1 L 776.6 1445.3 Z', labelX: 815, labelY: 1455, labelRotate: 20, labelFontSize: 16, shortLabel: '216', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '217': { d: 'M 734.6 1388.5 L 797.1 1412 L 798.1 1436.5 L 779.2 1462 L 721.3 1438.4 L 722.3 1412.6 Z', labelX: 760, labelY: 1425, labelRotate: 24, labelFontSize: 16, shortLabel: '217', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '218': { d: 'M 686.5 1352.2 L 747.7 1378.9 L 747.4 1403.5 L 727.3 1428 L 670.6 1401.4 L 673 1375.7 Z', labelX: 710, labelY: 1390, labelRotate: 27, labelFontSize: 16, shortLabel: '218', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '219': { d: 'M 643.5 1311 L 703.2 1340.9 L 701.7 1365.4 L 680.3 1388.8 L 625.1 1359.3 L 628.8 1333.7 Z', labelX: 665, labelY: 1350, labelRotate: 30, labelFontSize: 16, shortLabel: '219', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '220': { d: 'M 599.9 1270.3 L 658.5 1302.2 L 656.1 1326.7 L 633.9 1349.3 L 579.8 1317.9 L 584.4 1292.5 Z', labelX: 620, labelY: 1310, labelRotate: 32, labelFontSize: 16, shortLabel: '220', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '221': { d: 'M 553.5 1221 L 613.2 1250.9 L 611.7 1275.4 L 590.3 1298.8 L 535.1 1269.3 L 538.8 1243.7 Z', labelX: 575, labelY: 1260, labelRotate: 30, labelFontSize: 16, shortLabel: '221', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '222': { d: 'M 515.9 1152.6 L 577.5 1178.3 L 577.6 1202.8 L 557.9 1227.7 L 500.8 1202.1 L 502.8 1176.3 Z', labelX: 540, labelY: 1190, labelRotate: 26, labelFontSize: 16, shortLabel: '222', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '223': { d: 'M 528.3 1089.4 L 591.6 1110.7 L 593.4 1135.1 L 575.5 1161.3 L 516.8 1139.8 L 516.9 1113.9 Z', labelX: 555, labelY: 1125, labelRotate: 22, labelFontSize: 16, shortLabel: '223', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '301': { d: 'M 1499 987 L 1553.9 971.7 L 1567 988.7 L 1567 1016.6 L 1515.2 1029.4 L 1502.8 1010.4 Z', labelX: 1535, labelY: 1000, labelRotate: -12, labelFontSize: 15, shortLabel: '301', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '302': { d: 'M 1473.6 1048.2 L 1527.9 1031.1 L 1541.6 1047.6 L 1542.5 1075.5 L 1491.2 1090.1 L 1478.2 1071.6 Z', labelX: 1510, labelY: 1060, labelRotate: -14, labelFontSize: 15, shortLabel: '302', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '303': { d: 'M 1423.4 1108.9 L 1477.4 1090.7 L 1491.4 1107 L 1492.8 1134.9 L 1441.7 1150.4 L 1428.4 1132.1 Z', labelX: 1460, labelY: 1120, labelRotate: -15, labelFontSize: 15, shortLabel: '303', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '304': { d: 'M 1393 1170.1 L 1446.3 1150.2 L 1460.9 1166 L 1463.3 1193.7 L 1412.8 1211 L 1398.9 1193.2 Z', labelX: 1430, labelY: 1180, labelRotate: -17, labelFontSize: 15, shortLabel: '304', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '305': { d: 'M 1397.6 1232.1 L 1449.8 1209.3 L 1465.1 1224.4 L 1469 1252 L 1419.4 1271.9 L 1404.6 1254.8 Z', labelX: 1435, labelY: 1240, labelRotate: -20, labelFontSize: 15, shortLabel: '305', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '306': { d: 'M 1347.3 1293.4 L 1398.7 1268.8 L 1414.5 1283.3 L 1419.4 1310.8 L 1370.6 1332.4 L 1355.1 1315.9 Z', labelX: 1385, labelY: 1300, labelRotate: -22, labelFontSize: 15, shortLabel: '306', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '307': { d: 'M 1312.1 1354.7 L 1362.6 1328.4 L 1378.9 1342.3 L 1384.7 1369.6 L 1336.7 1392.9 L 1320.7 1376.9 Z', labelX: 1350, labelY: 1360, labelRotate: -24, labelFontSize: 15, shortLabel: '307', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '308': { d: 'M 1276.9 1406 L 1326.5 1378 L 1343.3 1391.3 L 1350.1 1418.4 L 1302.9 1443.3 L 1286.3 1427.9 Z', labelX: 1315, labelY: 1410, labelRotate: -26, labelFontSize: 15, shortLabel: '308', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '309': { d: 'M 1226.8 1457.4 L 1275.4 1427.6 L 1292.6 1440.3 L 1300.3 1467.1 L 1254 1493.7 L 1237 1478.9 Z', labelX: 1265, labelY: 1460, labelRotate: -28, labelFontSize: 15, shortLabel: '309', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '310': { d: 'M 1176.8 1498.7 L 1224.2 1467.2 L 1241.9 1479.4 L 1250.6 1505.9 L 1205.2 1534.1 L 1187.6 1519.9 Z', labelX: 1215, labelY: 1500, labelRotate: -30, labelFontSize: 15, shortLabel: '310', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '311': { d: 'M 1131.7 1535 L 1178.1 1501.9 L 1196.2 1513.4 L 1205.7 1539.7 L 1161.4 1569.4 L 1143.3 1555.8 Z', labelX: 1170, labelY: 1535, labelRotate: -32, labelFontSize: 15, shortLabel: '311', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '312': { d: 'M 1220 1444.4 L 1270 1417.2 L 1286.6 1430.8 L 1292.9 1458 L 1245.3 1482.1 L 1229 1466.4 Z', labelX: 1258, labelY: 1449, labelRotate: -25, labelFontSize: 15, shortLabel: '312', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '313': { d: 'M 1192.1 1463.7 L 1242.6 1437.4 L 1258.9 1451.3 L 1264.7 1478.6 L 1216.7 1501.9 L 1200.7 1485.9 Z', labelX: 1230, labelY: 1469, labelRotate: -24, labelFontSize: 15, shortLabel: '313', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '314': { d: 'M 1130.9 1495.8 L 1183.8 1474.9 L 1198.6 1490.4 L 1201.5 1518.2 L 1151.3 1536.3 L 1137.1 1518.7 Z', labelX: 1168, labelY: 1505, labelRotate: -18, labelFontSize: 15, shortLabel: '314', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '315': { d: 'M 1087.5 1507.7 L 1142.9 1494.4 L 1155.4 1511.8 L 1154.4 1539.7 L 1102.1 1550.7 L 1090.5 1531.3 Z', labelX: 1123, labelY: 1522, labelRotate: -10, labelFontSize: 15, shortLabel: '315', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '321': { d: 'M 810.4 1492.7 L 865.5 1506.9 L 868.4 1528.2 L 854.4 1552.4 L 803.1 1537.5 L 801.9 1515 Z', labelX: 835, labelY: 1522, labelRotate: 18, labelFontSize: 15, shortLabel: '321', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '322': { d: 'M 736.5 1457.1 L 790.5 1475.1 L 791.8 1496.5 L 776.2 1519.6 L 726.1 1501.3 L 726.5 1478.7 Z', labelX: 759, labelY: 1488, labelRotate: 22, labelFontSize: 15, shortLabel: '322', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '323': { d: 'M 708.1 1436.9 L 761.1 1457.8 L 761.3 1479.2 L 744.6 1501.5 L 695.5 1480.5 L 697 1458 Z', labelX: 729, labelY: 1469, labelRotate: 25, labelFontSize: 15, shortLabel: '323', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '324': { d: 'M 681.8 1415.9 L 733.7 1439.5 L 732.8 1460.9 L 714.8 1482.3 L 666.9 1458.8 L 669.6 1436.3 Z', labelX: 701, labelY: 1449, labelRotate: 28, labelFontSize: 15, shortLabel: '324', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '325': { d: 'M 631 1393.2 L 682 1418.6 L 680.3 1440 L 661.7 1460.7 L 614.6 1435.6 L 618.1 1413.2 Z', labelX: 649, labelY: 1427, labelRotate: 30, labelFontSize: 15, shortLabel: '325', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '326': { d: 'M 605.6 1339.9 L 656.1 1366.2 L 654.1 1387.6 L 635.1 1408 L 588.4 1382 L 592.4 1359.7 Z', labelX: 623, labelY: 1374, labelRotate: 31, labelFontSize: 15, shortLabel: '326', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '327': { d: 'M 580 1315.2 L 631 1340.6 L 629.3 1362 L 610.7 1382.7 L 563.6 1357.6 L 567.1 1335.2 Z', labelX: 598, labelY: 1349, labelRotate: 30, labelFontSize: 15, shortLabel: '327', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '328': { d: 'M 553.8 1290.9 L 605.7 1314.5 L 604.8 1335.9 L 586.8 1357.3 L 538.9 1333.8 L 541.6 1311.3 Z', labelX: 573, labelY: 1324, labelRotate: 28, labelFontSize: 15, shortLabel: '328', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '329': { d: 'M 519.2 1247.2 L 571.5 1269.9 L 571 1291.4 L 553.4 1313 L 505.1 1290.4 L 507.4 1267.9 Z', labelX: 539, labelY: 1280, labelRotate: 27, labelFontSize: 15, shortLabel: '329', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '330': { d: 'M 488.7 1225.6 L 541.3 1247.3 L 541.2 1268.8 L 524 1290.8 L 475.3 1269 L 477.2 1246.4 Z', labelX: 509, labelY: 1258, labelRotate: 26, labelFontSize: 15, shortLabel: '330', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '331': { d: 'M 447 1161.7 L 500.7 1180.6 L 501.7 1202.1 L 485.7 1224.9 L 435.9 1205.7 L 436.7 1183.1 Z', labelX: 469, labelY: 1193, labelRotate: 23, labelFontSize: 15, shortLabel: '331', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '332': { d: 'M 412.9 1108.3 L 467.8 1123.5 L 470.2 1144.8 L 455.9 1168.7 L 404.8 1153 L 404 1130.4 Z', labelX: 437, labelY: 1138, labelRotate: 19, labelFontSize: 15, shortLabel: '332', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '333': { d: 'M 460.9 1081 L 516.7 1092.4 L 520.6 1113.5 L 508 1138.3 L 456 1126.2 L 453.6 1103.7 Z', labelX: 487, labelY: 1109, labelRotate: 15, labelFontSize: 15, shortLabel: '333', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '401': { d: 'M 1545.3 1052.6 L 1598.3 1037.9 L 1610.9 1054.1 L 1610.8 1080.8 L 1560.8 1093.1 L 1548.9 1075 Z', labelX: 1580, labelY: 1065, labelRotate: -12, labelFontSize: 15, shortLabel: '401', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '402': { d: 'M 1514.9 1113.8 L 1567.3 1097.3 L 1580.5 1113.1 L 1581.4 1139.7 L 1531.8 1153.8 L 1519.3 1136.1 Z', labelX: 1550, labelY: 1125, labelRotate: -14, labelFontSize: 15, shortLabel: '402', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '403': { d: 'M 1489.5 1180.1 L 1541.4 1161.7 L 1555.1 1177 L 1556.9 1203.6 L 1507.8 1219.4 L 1494.7 1202.2 Z', labelX: 1525, labelY: 1190, labelRotate: -16, labelFontSize: 15, shortLabel: '403', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '404': { d: 'M 1459.2 1239.3 L 1510.4 1219.2 L 1524.6 1234 L 1527.3 1260.5 L 1478.8 1278 L 1465.1 1261.2 Z', labelX: 1495, labelY: 1248, labelRotate: -18, labelFontSize: 15, shortLabel: '404', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '405': { d: 'M 1431.9 1294.6 L 1482.3 1272.6 L 1497.1 1286.9 L 1500.7 1313.3 L 1452.9 1332.5 L 1438.6 1316.3 Z', labelX: 1468, labelY: 1302, labelRotate: -20, labelFontSize: 15, shortLabel: '405', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '406': { d: 'M 1373.6 1369.5 L 1422.8 1344.9 L 1438.3 1358.4 L 1443.3 1384.6 L 1396.5 1406.3 L 1381.4 1390.8 Z', labelX: 1410, labelY: 1375, labelRotate: -23, labelFontSize: 15, shortLabel: '406', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '407': { d: 'M 1338.4 1420.7 L 1386.7 1394.5 L 1402.7 1407.5 L 1408.6 1433.4 L 1362.6 1456.7 L 1347 1441.8 Z', labelX: 1375, labelY: 1425, labelRotate: -25, labelFontSize: 15, shortLabel: '407', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '408': { d: 'M 1298.3 1472 L 1345.7 1444.1 L 1362 1456.5 L 1368.9 1482.3 L 1323.7 1507.1 L 1307.6 1492.7 Z', labelX: 1335, labelY: 1475, labelRotate: -27, labelFontSize: 15, shortLabel: '408', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '409': { d: 'M 1247.2 1416.3 L 1293.6 1386.8 L 1310.4 1398.6 L 1318.1 1424.1 L 1273.9 1450.5 L 1257.2 1436.7 Z', labelX: 1284, labelY: 1418, labelRotate: -29, labelFontSize: 15, shortLabel: '409', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '410': { d: 'M 1221.2 1448.6 L 1266.5 1417.4 L 1283.7 1428.7 L 1292.3 1453.9 L 1249 1481.9 L 1231.9 1468.6 Z', labelX: 1258, labelY: 1449, labelRotate: -31, labelFontSize: 15, shortLabel: '410', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '411': { d: 'M 1193.2 1469.2 L 1237.9 1437.3 L 1255.3 1448.2 L 1264.4 1473.3 L 1221.6 1502 L 1204.2 1489.1 Z', labelX: 1230, labelY: 1469, labelRotate: -32, labelFontSize: 15, shortLabel: '411', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '412': { d: 'M 1288.2 1573.9 L 1334 1543.6 L 1351 1555.1 L 1359.2 1580.5 L 1315.4 1607.7 L 1298.6 1594.1 Z', labelX: 1325, labelY: 1575, labelRotate: -30, labelFontSize: 15, shortLabel: '412', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '413': { d: 'M 1238.3 1621.4 L 1286.2 1594.3 L 1302.4 1607 L 1308.7 1632.8 L 1263.2 1656.9 L 1247.3 1642.3 Z', labelX: 1275, labelY: 1625, labelRotate: -26, labelFontSize: 15, shortLabel: '413', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '414': { d: 'M 1193.9 1652.6 L 1244.3 1630.6 L 1259.1 1644.9 L 1262.7 1671.3 L 1214.9 1690.5 L 1200.6 1674.3 Z', labelX: 1230, labelY: 1660, labelRotate: -20, labelFontSize: 15, shortLabel: '414', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '415': { d: 'M 1134.9 1653.8 L 1187.3 1637.3 L 1200.5 1653.1 L 1201.4 1679.7 L 1151.8 1693.8 L 1139.3 1676.1 Z', labelX: 1170, labelY: 1665, labelRotate: -14, labelFontSize: 15, shortLabel: '415', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '416': { d: 'M 1086.3 1645.2 L 1140.1 1634.3 L 1151.6 1651.3 L 1149.7 1677.9 L 1098.9 1686.7 L 1088.3 1667.8 Z', labelX: 1120, labelY: 1660, labelRotate: -8, labelFontSize: 15, shortLabel: '416', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '420': { d: 'M 748.3 1614.6 L 802.7 1622.7 L 807.6 1642.6 L 796.8 1667 L 746 1657.9 L 742.5 1636.5 Z', labelX: 775, labelY: 1640, labelRotate: 12, labelFontSize: 15, shortLabel: '420', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '422': { d: 'M 648.7 1550 L 700.5 1568.3 L 701.5 1588.8 L 686.2 1610.6 L 638.1 1592 L 638.8 1570.4 Z', labelX: 670, labelY: 1580, labelRotate: 23, labelFontSize: 15, shortLabel: '422', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '423': { d: 'M 599.7 1514.2 L 650.9 1534.4 L 651.2 1554.9 L 635.1 1576.2 L 587.7 1555.9 L 589.1 1534.3 Z', labelX: 620, labelY: 1545, labelRotate: 25, labelFontSize: 15, shortLabel: '423', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '424': { d: 'M 550.8 1478.5 L 601.3 1500.5 L 600.8 1521 L 584 1541.7 L 537.4 1519.8 L 539.5 1498.2 Z', labelX: 570, labelY: 1510, labelRotate: 27, labelFontSize: 15, shortLabel: '424', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '425': { d: 'M 501.9 1442.9 L 551.6 1466.6 L 550.4 1487.1 L 532.9 1507.1 L 487 1483.6 L 490 1462.2 Z', labelX: 520, labelY: 1475, labelRotate: 29, labelFontSize: 15, shortLabel: '425', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '426': { d: 'M 472.5 1402.6 L 521.7 1427.1 L 520.2 1447.6 L 502.4 1467.4 L 456.9 1443 L 460.2 1421.7 Z', labelX: 490, labelY: 1435, labelRotate: 30, labelFontSize: 15, shortLabel: '426', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '427': { d: 'M 447.5 1357.6 L 496.7 1382.1 L 495.2 1402.6 L 477.4 1422.4 L 431.9 1398 L 435.2 1376.7 Z', labelX: 465, labelY: 1390, labelRotate: 30, labelFontSize: 15, shortLabel: '427', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '428': { d: 'M 421.4 1318.2 L 471.4 1341 L 470.6 1361.5 L 453.5 1381.9 L 407.2 1359.2 L 409.7 1337.7 Z', labelX: 440, labelY: 1350, labelRotate: 28, labelFontSize: 15, shortLabel: '428', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '429': { d: 'M 400.8 1278.5 L 451.3 1300.5 L 450.8 1321 L 434 1341.7 L 387.4 1319.8 L 389.5 1298.2 Z', labelX: 420, labelY: 1310, labelRotate: 27, labelFontSize: 15, shortLabel: '429', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '431': { d: 'M 389.7 1209.2 L 440.9 1229.4 L 441.2 1249.9 L 425.1 1271.2 L 377.7 1250.9 L 379.1 1229.3 Z', labelX: 410, labelY: 1240, labelRotate: 25, labelFontSize: 15, shortLabel: '431', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '432': { d: 'M 446.6 1163.7 L 499.1 1180.3 L 500.8 1200.7 L 486.3 1223 L 437.6 1206.1 L 437.5 1184.5 Z', labelX: 469, labelY: 1193, labelRotate: 21, labelFontSize: 15, shortLabel: '432', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
  '433': { d: 'M 412.7 1110.4 L 466.1 1123.2 L 469.3 1143.5 L 456.3 1166.7 L 406.6 1153.3 L 405 1131.7 Z', labelX: 437, labelY: 1138, labelRotate: 17, labelFontSize: 15, shortLabel: '433', traceStatus: 'OFFICIAL_IMAGE_TRACED' },
};

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

function formatTraceNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function scaleTemplatePath(d: string, targetBounds: ChangwonBounds): string {
  const subpaths = parseGeometrySubpaths(d);
  const sourceBounds = getTraceBounds(subpaths);
  const sourceWidth = sourceBounds.maxX - sourceBounds.minX || 1;
  const sourceHeight = sourceBounds.maxY - sourceBounds.minY || 1;
  const targetWidth = targetBounds.maxX - targetBounds.minX;
  const targetHeight = targetBounds.maxY - targetBounds.minY;

  return subpaths.map((subpath) => {
    const commands = subpath.map((point, index) => {
      const x = targetBounds.minX + (((point.x - sourceBounds.minX) / sourceWidth) * targetWidth);
      const y = targetBounds.minY + (((point.y - sourceBounds.minY) / sourceHeight) * targetHeight);
      return `${index === 0 ? 'M' : 'L'} ${formatTraceNumber(x)} ${formatTraceNumber(y)}`;
    });

    return `${commands.join(' ')} Z`;
  }).join(' ');
}

export const CHANGWON_IMAGE_GEOMETRY: Record<string, ChangwonImageGeometry> = Object.fromEntries(
  CHANGWON_EXPECTED_VISIBLE_BLOCKS.map((block) => {
    const template = CHANGWON_GEOMETRY_PATH_TEMPLATES[block];
    const reference = CHANGWON_OFFICIAL_TRACE_REFERENCE[block];

    if (!template || !reference) {
      throw new Error(`Missing Changwon traced geometry reference for block ${block}`);
    }

    return [block, {
      ...template,
      d: scaleTemplatePath(template.d, reference.expectedBounds),
      labelX: reference.numberAnchor.x,
      labelY: reference.numberAnchor.y,
      shortLabel: block,
      traceStatus: 'OFFICIAL_IMAGE_TRACED',
    }];
  }),
);

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

export const CHANGWON_BLOCKS: ChangwonBlock[] = CHANGWON_EXPECTED_VISIBLE_BLOCKS
  .map(buildBlockSpec)
  .map(toChangwonBlock);

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
  return `${block.block} ${block.name}`;
}

export function isChangwonBlockInCategoryGroup(block: ChangwonBlock, group: ChangwonCategoryGroup): boolean {
  if (group.id === 'all') return true;
  if (group.accessibilityOnly) return Boolean(block.accessibilityNote) || block.category === 'ACCESSIBLE';
  if (group.cats && group.cats.length > 0 && group.cats.includes(block.category)) return true;
  if (group.fanRoles && group.fanRoles.length > 0 && group.fanRoles.includes(block.fanRole)) return true;
  if (group.levels && group.levels.length > 0 && group.levels.includes(block.level)) return true;
  return false;
}
