// Jamsil stadium seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type JamsilSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type JamsilFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type JamsilLevel = '1F' | '2F' | '3F' | 'OUTFIELD';
export type JamsilSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type JamsilSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';

export interface JamsilImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

export interface JamsilSeatMapImage {
  imagePath: string | null;
  imageWidth: number;
  imageHeight: number;
  sourceLabel: string;
  sourceUrl: string;
  assetStatus: JamsilSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface JamsilOfficialReference {
  id: 'LG' | 'DOOSAN';
  label: string;
  kind: 'SEATMAP' | 'STADIUM_GUIDE';
  sourceLabel: string;
  sourceUrl: string;
  imagePaths: string[];
}

export interface JamsilDoosanGuideImage {
  id: string;
  label: string;
  imagePath: string;
  width: number;
  height: number;
}

export interface JamsilDoosanSeatCount {
  label: string;
  count: number;
}

export interface JamsilDoosanStadiumGuide {
  sourceLabel: string;
  sourceUrl: string;
  title: string;
  summary: string;
  totalSeats: number;
  overviewImage: JamsilDoosanGuideImage;
  floorImages: JamsilDoosanGuideImage[];
  seatCounts: JamsilDoosanSeatCount[];
  entrances: {
    summary: string;
    floors: string[];
    publicEntrances: string[];
    restrictedEntranceNote: string;
  };
  transport: {
    subway: string[];
    buses: string[];
  };
  parking: {
    stadium: string[];
    nearby: string[];
  };
  implementationNote: string;
}

export interface JamsilBlock {
  id: string;
  tier: 1 | 2 | 3;
  level: JamsilLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: JamsilSide;
  fanRole: JamsilFanRole;
  angle: number;
  sweep: number;
  ringIn: number;
  ringOut: number;
  sourceConfidence: JamsilSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: JamsilImageGeometry;
  accessibilityNote?: string;
}

export interface JamsilCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface JamsilViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface JamsilReview {
  user: string;
  avatar: string;
  rating: number;
  date: string;
  row: string;
  seat: string;
  text: string;
  helpful: number;
  photos: number;
}

export interface DetailedRatings {
  view: number;
  comfort: number;
  vibe: number;
  access: number;
}

export interface CategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
}

const SOURCE_2026_LG_OFFICIAL = 'LG 트윈스 2026 공식 일반 티켓 좌석도 기준입니다.';
const SOURCE_2025_OFFICIAL = 'LG 트윈스 공식 티켓 안내 기준';

export const JAMSIL_SEATMAP_IMAGE: JamsilSeatMapImage = {
  imagePath: 'src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.png',
  imageWidth: 1570,
  imageHeight: 1570,
  sourceLabel: 'LG 트윈스 공식 티켓 안내 기준 좌석도',
  sourceUrl: 'https://www.lgtwins.com/ticket/general',
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'jamsil-lg-seatmap-default-2026.png',
};

export const JAMSIL_OFFICIAL_REFERENCES: JamsilOfficialReference[] = [
  {
    id: 'LG',
    label: 'LG 공식 좌석도',
    kind: 'SEATMAP',
    sourceLabel: 'LG 트윈스 공식 일반 티켓',
    sourceUrl: 'https://www.lgtwins.com/ticket/general',
    imagePaths: [
      'src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-bg-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-premium-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-table-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-exciting-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-blue-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-orange-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-red-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-navy-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-green-cheer-2026.png',
      'src/assets/stadiums/lg/jamsil-lg-seatmap-green-outfield-2026.png',
    ],
  },
  {
    id: 'DOOSAN',
    label: '두산 공식 구장 안내',
    kind: 'STADIUM_GUIDE',
    sourceLabel: '두산 베어스 공식 베어스 홈구장',
    sourceUrl: 'https://www.doosanbears.com/bears/stadium?tabId=seoul',
    imagePaths: [
      'src/assets/stadiums/doosan/jamsil-doosan-stadium-overview.png',
      'src/assets/stadiums/doosan/jamsil-doosan-floor-1f.jpg',
      'src/assets/stadiums/doosan/jamsil-doosan-floor-2f.jpg',
      'src/assets/stadiums/doosan/jamsil-doosan-floor-2-5f.jpg',
      'src/assets/stadiums/doosan/jamsil-doosan-floor-3-4f.jpg',
    ],
  },
];

export const JAMSIL_DOOSAN_STADIUM_GUIDE: JamsilDoosanStadiumGuide = {
  sourceLabel: '두산 베어스 공식 베어스 홈구장',
  sourceUrl: 'https://www.doosanbears.com/bears/stadium?tabId=seoul',
  title: '두산 공식 잠실야구장 안내',
  summary: '두산 공식 공개 페이지는 잠실야구장 전경, 층별 안내, 좌석수, 출입구, 교통/주차 정보를 제공합니다.',
  totalSeats: 25000,
  overviewImage: {
    id: 'overview',
    label: '잠실야구장 전경',
    imagePath: 'src/assets/stadiums/doosan/jamsil-doosan-stadium-overview.png',
    width: 800,
    height: 555,
  },
  floorImages: [
    {
      id: 'floor-1f',
      label: '1층 안내',
      imagePath: 'src/assets/stadiums/doosan/jamsil-doosan-floor-1f.jpg',
      width: 1184,
      height: 1075,
    },
    {
      id: 'floor-2f',
      label: '2층 안내',
      imagePath: 'src/assets/stadiums/doosan/jamsil-doosan-floor-2f.jpg',
      width: 1184,
      height: 894,
    },
    {
      id: 'floor-2-5f',
      label: '2.5층 안내',
      imagePath: 'src/assets/stadiums/doosan/jamsil-doosan-floor-2-5f.jpg',
      width: 1184,
      height: 738,
    },
    {
      id: 'floor-3-4f',
      label: '3/4층 안내',
      imagePath: 'src/assets/stadiums/doosan/jamsil-doosan-floor-3-4f.jpg',
      width: 1184,
      height: 745,
    },
  ],
  seatCounts: [
    { label: 'VIP석', count: 264 },
    { label: '테이블석', count: 502 },
    { label: '블루석', count: 2373 },
    { label: '레드석', count: 6399 },
    { label: '네이비석', count: 10112 },
    { label: '외야석', count: 5813 },
  ],
  entrances: {
    summary: '출입문 10개',
    floors: ['1층 7개', '2층 3개'],
    publicEntrances: ['1루 내야 출입구', '3루 내야 출입구', '1루 외야 출입구', '3루 외야 출입구'],
    restrictedEntranceNote: '중앙 출입구는 기자 및 구단 관계자를 위한 출입구입니다.',
  },
  transport: {
    subway: ['지하철 2호선, 9호선 종합운동장역 5,6번 출구'],
    buses: [
      '간선: 301, 333, 341, 342, 345, 350, 360',
      '지선: 2415, 3217, 3314, 3322, 3411, 3412, 3414, 3417, 3422, 4319',
      '경기/공항: 917, 11-3, 1100, 1700, 2000, 6900, 7007, 8001, 9303, 6006',
    ],
  },
  parking: {
    stadium: ['잠실야구장 주차장 수용대수 2,200대', '1회 입장 시 소형 4,000원 / 대형 8,000원'],
    nearby: [
      '송파탄천주차장: 수용대수 1,500대',
      '강남탄천주차장: 수용대수 1,009대',
      '한강시민공원 잠실지구 주차장 이용 가능',
    ],
  },
  implementationNote: '두산 공식 페이지는 좌석 등급 hit-area용 블록 배치도가 아니라 구장 안내 자료를 제공합니다.',
};

function rangeBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

type JamsilImageGeometryDraft = Omit<JamsilImageGeometry, 'shortLabel'> & { shortLabel?: string };

const JAMSIL_IMAGE_GEOMETRY_DRAFTS: Record<string, JamsilImageGeometryDraft> = {
  'block-101': { d: 'M 1178 757 L 1194 731 L 1234 725 L 1222 756 Z', labelX: 1208, labelY: 742 },
  'block-102': { d: 'M 1155 795 L 1173 766 L 1219 763 L 1204 798 Z', labelX: 1189, labelY: 780 },
  'block-103': { d: 'M 1135 826 L 1150 803 L 1200 805 L 1186 833 Z', labelX: 1168, labelY: 817 },
  'block-104': { d: 'M 1111 861 L 1131 833 L 1182 840 L 1162 875 Z', labelX: 1147, labelY: 853 },
  'block-105': { d: 'M 1085 898 L 1106 868 L 1158 881 L 1135 919 Z', labelX: 1122, labelY: 892 },
  'block-106': { d: 'M 1058 938 L 1080 905 L 1130 925 L 1101 964 Z', labelX: 1093, labelY: 933 },
  'block-107': { d: 'M 1030 976 L 1054 944 L 1097 970 L 1065 1005 Z', labelX: 1063, labelY: 974 },
  'block-108': { d: 'M 998 1011 L 1025 982 L 1059 1009 L 1025 1040 Z', labelX: 1028, labelY: 1011 },
  'block-109': { d: 'M 962 1043 L 993 1016 L 1018 1045 L 979 1072 Z', labelX: 989, labelY: 1044 },
  'block-110': { d: 'M 920 1071 L 956 1048 L 973 1076 L 932 1100 Z', labelX: 945, labelY: 1074 },
  'block-111': { d: 'M 878 1091 L 913 1075 L 925 1104 L 886 1122 Z', labelX: 901, labelY: 1099 },
  'block-112': { d: 'M 641 1102 L 652 1076 L 687 1091 L 680 1121 Z', labelX: 665, labelY: 1098 },
  'block-113': { d: 'M 593 1075 L 609 1050 L 646 1072 L 635 1099 Z', labelX: 620, labelY: 1075 },
  'block-114': { d: 'M 549 1044 L 571 1019 L 603 1046 L 587 1072 Z', labelX: 577, labelY: 1045 },
  'block-115': { d: 'M 507 1009 L 538 985 L 565 1015 L 543 1040 Z', labelX: 537, labelY: 1012 },
  'block-116': { d: 'M 470 969 L 508 947 L 532 980 L 502 1004 Z', labelX: 502, labelY: 975 },
  'block-117': { d: 'M 437 925 L 481 907 L 503 941 L 466 964 Z', labelX: 471, labelY: 934 },
  'block-118': { d: 'M 409 882 L 456 870 L 477 901 L 433 919 Z', labelX: 442, labelY: 893 },
  'block-119': { d: 'M 386 840 L 432 834 L 451 863 L 405 875 Z', labelX: 418, labelY: 854 },
  'block-120': { d: 'M 367 805 L 412 804 L 427 828 L 382 834 Z', labelX: 396, labelY: 818 },
  'block-121': { d: 'M 348 764 L 388 766 L 407 796 L 364 798 Z', labelX: 377, labelY: 781 },
  'block-122': { d: 'M 334 726 L 365 730 L 383 758 L 345 756 Z', labelX: 357, labelY: 743 },
  'block-201': { d: 'M 1234 753 L 1245 724 L 1302 719 L 1301 753 Z', labelX: 1273, labelY: 737 },
  'block-202': { d: 'M 1216 797 L 1231 761 L 1300 761 L 1293 804 Z', labelX: 1261, labelY: 781 },
  'block-203': { d: 'M 1196 837 L 1213 804 L 1291 814 L 1280 857 Z', labelX: 1247, labelY: 829 },
  'block-204': { d: 'M 1174 875 L 1193 844 L 1278 863 L 1264 904 Z', labelX: 1230, labelY: 873 },
  'block-205': { d: 'M 1152 910 L 1174 882 L 1261 912 L 1242 951 Z', labelX: 1209, labelY: 914 },
  'block-206': { d: 'M 1127 948 L 1150 917 L 1238 958 L 1216 993 Z', labelX: 1183, labelY: 954 },
  'block-207': { d: 'M 1100 983 L 1123 954 L 1212 999 L 1180 1037 Z', labelX: 1156, labelY: 995 },
  'block-208': { d: 'M 1069 1014 L 1094 988 L 1176 1043 L 1140 1076 Z', labelX: 1124, labelY: 1034 },
  'block-209': { d: 'M 1038 1042 L 1064 1020 L 1135 1082 L 1099 1109 Z', labelX: 1085, labelY: 1064 },
  'block-210': { d: 'M 1005 1067 L 1032 1047 L 1093 1114 L 1056 1137 Z', labelX: 1048, labelY: 1093 },
  'block-211': { d: 'M 973 1088 L 999 1071 L 1050 1141 L 1013 1160 Z', labelX: 1012, labelY: 1120 },
  'block-212': { d: 'M 933 1111 L 966 1092 L 1006 1164 L 962 1182 Z', labelX: 968, labelY: 1139 },
  'block-213': { d: 'M 888 1132 L 926 1115 L 955 1185 L 905 1200 Z', labelX: 919, labelY: 1159 },
  'block-214': { d: 'M 611 1183 L 639 1114 L 677 1131 L 660 1200 Z', labelX: 646, labelY: 1159 },
  'block-215': { d: 'M 559 1163 L 599 1092 L 632 1111 L 603 1182 Z', labelX: 597, labelY: 1138 },
  'block-216': { d: 'M 515 1141 L 566 1071 L 593 1088 L 552 1160 Z', labelX: 553, labelY: 1120 },
  'block-217': { d: 'M 472 1113 L 534 1046 L 560 1065 L 509 1137 Z', labelX: 518, labelY: 1092 },
  'block-218': { d: 'M 430 1081 L 502 1019 L 529 1041 L 466 1109 Z', labelX: 480, labelY: 1064 },
  'block-219': { d: 'M 389 1042 L 471 988 L 497 1013 L 425 1076 Z', labelX: 441, labelY: 1033 },
  'block-220': { d: 'M 353 999 L 444 953 L 467 983 L 385 1037 Z', labelX: 410, labelY: 994 },
  'block-221': { d: 'M 327 958 L 417 916 L 440 946 L 350 993 Z', labelX: 383, labelY: 954 },
  'block-222': { d: 'M 304 910 L 394 881 L 414 910 L 324 951 Z', labelX: 357, labelY: 914 },
  'block-223': { d: 'M 287 863 L 373 844 L 391 875 L 301 904 Z', labelX: 336, labelY: 872 },
  'block-224': { d: 'M 275 813 L 352 804 L 369 837 L 285 857 Z', labelX: 318, labelY: 829 },
  'block-225': { d: 'M 268 761 L 334 761 L 349 797 L 273 804 Z', labelX: 305, labelY: 781 },
  'block-226': { d: 'M 267 720 L 323 726 L 331 753 L 268 753 Z', labelX: 295, labelY: 738 },
  'block-301': { d: 'M 1311 756 L 1313 719 L 1399 712 L 1400 761 Z', labelX: 1358, labelY: 738 },
  'block-302': { d: 'M 1304 808 L 1310 768 L 1400 769 L 1398 818 Z', labelX: 1355, labelY: 791 },
  'block-303': { d: 'M 1293 854 L 1303 816 L 1397 826 L 1390 875 Z', labelX: 1347, labelY: 843 },
  'block-304': { d: 'M 1279 894 L 1290 863 L 1388 882 L 1377 929 Z', labelX: 1336, labelY: 894 },
  'block-305': { d: 'M 1261 934 L 1274 914 L 1375 937 L 1358 981 Z', labelX: 1321, labelY: 943 },
  'block-306': { d: 'M 1238 975 L 1251 954 L 1357 989 L 1338 1032 Z', labelX: 1300, labelY: 989 },
  'block-307': { d: 'M 1211 1014 L 1228 993 L 1334 1040 L 1309 1084 Z', labelX: 1275, labelY: 1035 },
  'block-308': { d: 'M 1180 1050 L 1197 1031 L 1224 1039 L 1305 1091 L 1276 1133 Z', labelX: 1243, labelY: 1080 },
  'block-309': { d: 'M 1149 1081 L 1165 1066 L 1191 1077 L 1271 1139 L 1240 1176 Z', labelX: 1211, labelY: 1120 },
  'block-310': { d: 'M 1114 1110 L 1132 1096 L 1157 1109 L 1235 1182 L 1200 1216 Z', labelX: 1174, labelY: 1155 },
  'block-311': { d: 'M 1077 1136 L 1097 1123 L 1120 1138 L 1195 1221 L 1155 1254 Z', labelX: 1135, labelY: 1189 },
  'block-312': { d: 'M 1037 1159 L 1059 1147 L 1080 1165 L 1149 1259 L 1106 1288 Z', labelX: 1091, labelY: 1219 },
  'block-313': { d: 'M 996 1179 L 1018 1169 L 1038 1189 L 1099 1293 L 1054 1317 Z', labelX: 1045, labelY: 1245 },
  'block-314': { d: 'M 950 1196 L 976 1187 L 994 1208 L 1047 1321 L 994 1342 Z', labelX: 995, labelY: 1268 },
  'block-315': { d: 'M 906 1208 L 930 1202 L 945 1225 L 987 1346 L 938 1361 Z', labelX: 942, labelY: 1286 },
  'block-316': { d: 'M 847 1243 L 851 1218 L 886 1212 L 930 1363 L 863 1376 Z', labelX: 884, labelY: 1299 },
  'block-317': { d: 'M 788 1247 L 794 1222 L 830 1221 L 855 1377 L 788 1382 Z', labelX: 817, labelY: 1307 },
  'block-318': { d: 'M 710 1371 L 735 1222 L 771 1222 L 778 1382 Z', labelX: 748, labelY: 1307 },
  'block-319': { d: 'M 635 1361 L 679 1213 L 714 1218 L 702 1376 Z', labelX: 681, labelY: 1299 },
  'block-320': { d: 'M 578 1344 L 621 1224 L 635 1202 L 658 1207 L 628 1360 Z', labelX: 623, labelY: 1286 },
  'block-321': { d: 'M 518 1320 L 572 1207 L 589 1187 L 614 1195 L 613 1224 L 571 1343 Z', labelX: 571, labelY: 1268 },
  'block-322': { d: 'M 466 1291 L 527 1189 L 547 1169 L 569 1178 L 511 1317 Z', labelX: 520, labelY: 1245 },
  'block-323': { d: 'M 416 1259 L 506 1147 L 528 1159 L 459 1288 Z', labelX: 474, labelY: 1219 },
  'block-324': { d: 'M 370 1221 L 445 1138 L 468 1123 L 488 1136 L 410 1254 Z', labelX: 430, labelY: 1189 },
  'block-325': { d: 'M 330 1182 L 409 1109 L 434 1096 L 451 1110 L 365 1216 Z', labelX: 390, labelY: 1155 },
  'block-326': { d: 'M 294 1139 L 374 1077 L 400 1066 L 416 1081 L 325 1176 Z', labelX: 354, labelY: 1120 },
  'block-327': { d: 'M 260 1090 L 367 1031 L 385 1050 L 289 1133 Z', labelX: 321, labelY: 1080 },
  'block-328': { d: 'M 231 1039 L 337 993 L 354 1014 L 256 1084 Z', labelX: 290, labelY: 1035 },
  'block-329': { d: 'M 209 988 L 314 954 L 327 975 L 229 1031 Z', labelX: 264, labelY: 990 },
  'block-330': { d: 'M 191 936 L 294 913 L 304 934 L 207 981 Z', labelX: 244, labelY: 943 },
  'block-331': { d: 'M 177 882 L 275 863 L 286 894 L 188 929 Z', labelX: 229, labelY: 894 },
  'block-332': { d: 'M 168 826 L 262 816 L 272 855 L 175 874 Z', labelX: 218, labelY: 843 },
  'block-333': { d: 'M 165 769 L 255 768 L 261 808 L 168 818 Z', labelX: 210, labelY: 791 },
  'block-334': { d: 'M 165 728 L 166 712 L 252 719 L 254 760 L 165 761 Z', labelX: 207, labelY: 738 },
  'block-401': { d: 'M 1276 576 L 1364 542 L 1387 615 L 1293 634 Z', labelX: 1333, labelY: 591 },
  'block-402': { d: 'M 1249 511 L 1328 467 L 1360 534 L 1273 568 Z', labelX: 1305, labelY: 519 },
  'block-403': { d: 'M 1217 457 L 1289 405 L 1325 460 L 1245 504 Z', labelX: 1271, labelY: 455 },
  'block-404': { d: 'M 1183 411 L 1247 354 L 1284 398 L 1213 450 Z', labelX: 1234, labelY: 403 },
  'block-405': { d: 'M 1146 372 L 1204 309 L 1244 348 L 1180 405 Z', labelX: 1194, labelY: 357 },
  'block-406': { d: 'M 1104 333 L 1153 268 L 1199 304 L 1142 367 Z', labelX: 1151, labelY: 317 },
  'block-407': { d: 'M 1057 301 L 1098 231 L 1148 263 L 1098 330 Z', labelX: 1101, labelY: 280 },
  'block-408': { d: 'M 1007 276 L 1043 201 L 1093 227 L 1051 298 Z', labelX: 1049, labelY: 250 },
  'block-409': { d: 'M 958 253 L 984 178 L 1036 199 L 1002 272 Z', labelX: 995, labelY: 225 },
  'block-410': { d: 'M 903 238 L 921 161 L 977 176 L 950 252 Z', labelX: 938, labelY: 205 },
  'block-411': { d: 'M 852 225 L 862 150 L 913 159 L 896 236 Z', labelX: 881, labelY: 192 },
  'block-412': { d: 'M 646 160 L 698 152 L 708 230 L 664 238 Z', labelX: 679, labelY: 194 },
  'block-413': { d: 'M 584 177 L 639 162 L 657 240 L 610 254 Z', labelX: 622, labelY: 207 },
  'block-414': { d: 'M 525 201 L 576 180 L 603 257 L 559 275 Z', labelX: 565, labelY: 227 },
  'block-415': { d: 'M 469 230 L 518 204 L 552 279 L 511 302 Z', labelX: 512, labelY: 252 },
  'block-416': { d: 'M 414 266 L 462 234 L 505 306 L 465 334 Z', labelX: 460, labelY: 283 },
  'block-417': { d: 'M 364 306 L 408 270 L 459 339 L 422 371 Z', labelX: 412, labelY: 320 },
  'block-418': { d: 'M 320 350 L 358 312 L 417 376 L 386 410 Z', labelX: 369, labelY: 361 },
  'block-419': { d: 'M 279 401 L 316 357 L 381 416 L 352 454 Z', labelX: 330, labelY: 406 },
  'block-420': { d: 'M 240 461 L 274 408 L 348 461 L 321 507 Z', labelX: 293, labelY: 459 },
  'block-421': { d: 'M 204 536 L 235 470 L 317 515 L 293 571 Z', labelX: 261, labelY: 522 },
  'block-422': { d: 'M 178 615 L 201 543 L 290 578 L 275 636 Z', labelX: 233, labelY: 593 },
  'premium-center': { d: 'M 668 1202 L 695 1093 L 871 1092 L 897 1202 L 807 1215 Z', labelX: 783, labelY: 1159, labelFontSize: 22, shortLabel: '테라존' },
  'exciting-first': { d: 'M 1039 876 L 1133 730 L 1188 718 L 1049 929 Z', labelX: 1106, labelY: 814, labelFontSize: 22, shortLabel: '1루 EX' },
  'exciting-third': { d: 'M 374 717 L 428 728 L 523 876 L 513 928 Z', labelX: 455, labelY: 813, labelFontSize: 22, shortLabel: '3루 EX' },
  'accessible-first': { d: 'M 1088 910 L 1154 910 L 1148 984 L 1090 984 Z', labelX: 1121, labelY: 947, labelFontSize: 18, shortLabel: '휠체어' },
  'accessible-third': { d: 'M 416 910 L 478 910 L 475 984 L 418 984 Z', labelX: 446, labelY: 947, labelFontSize: 18, shortLabel: '휠체어' },
};

const JAMSIL_IMAGE_GEOMETRY: Record<string, JamsilImageGeometry> = Object.fromEntries(
  Object.entries(JAMSIL_IMAGE_GEOMETRY_DRAFTS).map(([id, geometry]) => [
    id,
    {
      ...geometry,
      labelFontSize: geometry.labelFontSize ?? 18,
      shortLabel: geometry.shortLabel ?? id.replace('block-', ''),
    },
  ]),
) as Record<string, JamsilImageGeometry>;

const SIDE_LABELS: Record<JamsilSide, string> = {
  FIRST_BASE: '1루',
  THIRD_BASE: '3루',
  CENTER: '중앙',
  OUTFIELD: '외야',
};

const CATEGORY_BLOCK_LABELS: Record<string, string> = {
  PREMIUM: '프리미엄석',
  TABLE: '테이블석',
  BLUE: '블루석',
  EXCITING: '익사이팅존',
  ORANGE: '오렌지석',
  RED: '레드석',
  NAVY: '네이비석',
  OUTFIELD: '그린석',
  OUTFIELD_CHEER: '그린응원석',
  ACCESSIBLE: '휠체어석',
};

const CATEGORY_TIER: Record<string, 1 | 2 | 3> = {
  PREMIUM: 1,
  TABLE: 1,
  BLUE: 1,
  EXCITING: 1,
  ORANGE: 2,
  RED: 2,
  NAVY: 3,
  OUTFIELD: 3,
  OUTFIELD_CHEER: 3,
  ACCESSIBLE: 2,
};

function sectionAliases(name: string, categoryLabel: string, sideLabel: string, blocks: string[]) {
  const blockAliases = blocks.flatMap((block) => [
    block,
    block + '블록',
    '잠실 ' + block,
    '잠실 ' + block + '블록',
  ]);

  return Array.from(new Set([
    ...blockAliases,
    name,
    sideLabel + ' ' + categoryLabel,
    categoryLabel,
    sideLabel,
  ]));
}

function getNumberedBlockCategory(block: number): string {
  if ((block >= 101 && block <= 106) || (block >= 117 && block <= 122) || (block >= 201 && block <= 204) || (block >= 223 && block <= 226)) return 'RED';
  if ((block >= 107 && block <= 109) || (block >= 114 && block <= 116) || (block >= 209 && block <= 211) || (block >= 216 && block <= 218)) return 'BLUE';
  if ((block >= 110 && block <= 113) || (block >= 212 && block <= 215)) return 'TABLE';
  if ((block >= 205 && block <= 208) || (block >= 219 && block <= 222)) return 'ORANGE';
  if (block >= 301 && block <= 334) return 'NAVY';
  if (block >= 405 && block <= 408) return 'OUTFIELD_CHEER';
  if ((block >= 401 && block <= 404) || (block >= 409 && block <= 422)) return 'OUTFIELD';
  throw new Error('Unsupported Jamsil block category for ' + block);
}

function getNumberedBlockSide(block: number): JamsilSide {
  if ((block >= 101 && block <= 113) || (block >= 201 && block <= 213) || (block >= 301 && block <= 310)) return 'FIRST_BASE';
  if ((block >= 114 && block <= 122) || (block >= 214 && block <= 226) || (block >= 325 && block <= 334)) return 'THIRD_BASE';
  if (block >= 311 && block <= 324) return 'CENTER';
  return 'OUTFIELD';
}

function getNumberedBlockLevel(block: number): JamsilLevel {
  if (block >= 100 && block < 200) return '1F';
  if (block >= 200 && block < 300) return '2F';
  if (block >= 300 && block < 400) return '3F';
  return 'OUTFIELD';
}

function getRing(level: JamsilLevel): { ringIn: number; ringOut: number } {
  if (level === '1F') return { ringIn: 0.30, ringOut: 0.48 };
  if (level === '2F') return { ringIn: 0.46, ringOut: 0.64 };
  if (level === '3F') return { ringIn: 0.62, ringOut: 0.78 };
  return { ringIn: 0.52, ringOut: 0.70 };
}

function angleFromGeometry(geometry: JamsilImageGeometry): number {
  return Math.round((Math.atan2(geometry.labelY - 785, geometry.labelX - 785) * 180) / Math.PI);
}

function createNumberedBlock(blockNumber: string): JamsilBlock {
  const id = 'block-' + blockNumber;
  const imageGeometry = JAMSIL_IMAGE_GEOMETRY[id];
  if (!imageGeometry) {
    throw new Error('Missing Jamsil image geometry for ' + id);
  }

  const numericBlock = Number(blockNumber);
  const category = getNumberedBlockCategory(numericBlock);
  const side = getNumberedBlockSide(numericBlock);
  const level = getNumberedBlockLevel(numericBlock);
  const sideLabel = SIDE_LABELS[side];
  const categoryLabel = CATEGORY_BLOCK_LABELS[category];
  const name = blockNumber + ' 블록 ' + sideLabel + ' ' + categoryLabel;
  const { ringIn, ringOut } = getRing(level);

  return {
    id,
    tier: CATEGORY_TIER[category],
    level,
    category,
    name,
    block: blockNumber,
    officialBlocks: [blockNumber],
    side,
    fanRole: 'NEUTRAL',
    angle: angleFromGeometry(imageGeometry),
    sweep: 4,
    ringIn,
    ringOut,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2026_LG_OFFICIAL,
    seatViewSections: sectionAliases(name, categoryLabel, sideLabel, [blockNumber]),
    imageGeometry,
  };
}

function createSpecialBlock(block: Omit<JamsilBlock, 'imageGeometry' | 'angle' | 'ringIn' | 'ringOut'> & { ringIn?: number; ringOut?: number }): JamsilBlock {
  const imageGeometry = JAMSIL_IMAGE_GEOMETRY[block.id];
  if (!imageGeometry) {
    throw new Error('Missing Jamsil image geometry for ' + block.id);
  }

  const ring = getRing(block.level);
  return {
    ...block,
    angle: angleFromGeometry(imageGeometry),
    ringIn: block.ringIn ?? ring.ringIn,
    ringOut: block.ringOut ?? ring.ringOut,
    imageGeometry,
  };
}

const NUMBERED_BLOCKS = [
  ...rangeBlocks(101, 122),
  ...rangeBlocks(201, 226),
  ...rangeBlocks(301, 334),
  ...rangeBlocks(401, 422),
].map(createNumberedBlock);

const SPECIAL_BLOCKS: JamsilBlock[] = [
  createSpecialBlock({
    id: 'premium-center',
    tier: 1,
    level: '1F',
    category: 'PREMIUM',
    name: '중앙 프리미엄석',
    block: '테라존',
    officialBlocks: ['테라존'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    sweep: 18,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2026_LG_OFFICIAL,
    seatViewSections: ['중앙 프리미엄석', '프리미엄석', '테라존', '중앙석', '포수 후면', '홈플레이트 뒤'],
  }),
  createSpecialBlock({
    id: 'exciting-first',
    tier: 1,
    level: '1F',
    category: 'EXCITING',
    name: '1루 익사이팅존',
    block: '1루 익사이팅존',
    officialBlocks: ['1루 익사이팅존'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    sweep: 16,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2026_LG_OFFICIAL,
    seatViewSections: ['1루 익사이팅존', '익사이팅존', '1루 EX', '잠실 1루 익사이팅존'],
  }),
  createSpecialBlock({
    id: 'exciting-third',
    tier: 1,
    level: '1F',
    category: 'EXCITING',
    name: '3루 익사이팅존',
    block: '3루 익사이팅존',
    officialBlocks: ['3루 익사이팅존'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    sweep: 16,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2026_LG_OFFICIAL,
    seatViewSections: ['3루 익사이팅존', '익사이팅존', '3루 EX', '잠실 3루 익사이팅존'],
  }),
  createSpecialBlock({
    id: 'accessible-first',
    tier: 2,
    level: '2F',
    category: 'ACCESSIBLE',
    name: '1루 휠체어석',
    block: '101B / 102B / 109B',
    officialBlocks: ['101B', '102B', '109B'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    sweep: 8,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2025_OFFICIAL,
    seatViewSections: ['1루 휠체어석', '휠체어석', '101B', '102B', '109B', '잠실 101B', '잠실 102B', '잠실 109B'],
    accessibilityNote: '제1매표소 장애인 창구 발권 안내 대상입니다.',
  }),
  createSpecialBlock({
    id: 'accessible-third',
    tier: 2,
    level: '2F',
    category: 'ACCESSIBLE',
    name: '3루 휠체어석',
    block: '114B / 121B / 122B',
    officialBlocks: ['114B', '121B', '122B'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    sweep: 8,
    sourceConfidence: 'OFFICIAL',
    sourceNote: SOURCE_2025_OFFICIAL,
    seatViewSections: ['3루 휠체어석', '휠체어석', '114B', '121B', '122B', '잠실 114B', '잠실 121B', '잠실 122B'],
    accessibilityNote: '제1매표소 장애인 창구 발권 안내 대상입니다.',
  }),
];

export const JAMSIL_BLOCKS: JamsilBlock[] = [...NUMBERED_BLOCKS, ...SPECIAL_BLOCKS];

// ===== Categories =====
export const JAMSIL_CATEGORIES: Record<string, JamsilCategory> = {
  PREMIUM:       { label: '프리미엄/테라존', light: '#F2A51A', dark: '#E0A52A', textLight: '#8A5A00', textDark: '#FFD580' },
  TABLE:         { label: '테이블석',         light: '#A78BFA', dark: '#8B6FE8', textLight: '#4C1D95', textDark: '#DDD6FE' },
  BLUE:          { label: '블루석',           light: '#3B82F6', dark: '#3F7FE0', textLight: '#1E3A8A', textDark: '#BFDBFE' },
  EXCITING:      { label: '익사이팅존',       light: '#F97316', dark: '#FB7C30', textLight: '#7C2D12', textDark: '#FED7AA' },
  ORANGE:        { label: '오렌지/응원석',    light: '#FB923C', dark: '#F59042', textLight: '#7C2D12', textDark: '#FED7AA' },
  RED:           { label: '레드석',           light: '#EF4444', dark: '#E04848', textLight: '#7F1D1D', textDark: '#FECACA' },
  NAVY:          { label: '네이비석',         light: '#475569', dark: '#64748B', textLight: '#1E293B', textDark: '#CBD5E1' },
  OUTFIELD:      { label: '그린석(외야)',     light: '#94A3B8', dark: '#7E8A99', textLight: '#334155', textDark: '#E2E8F0' },
  OUTFIELD_CHEER:{ label: '그린응원석',       light: '#22C55E', dark: '#16A34A', textLight: '#14532D', textDark: '#BBF7D0' },
  ACCESSIBLE:    { label: '휠체어석',         light: '#06B6D4', dark: '#0891B2', textLight: '#164E63', textDark: '#CFFAFE' },
};

// ===== View info =====
const CATEGORY_VIEW_INFO: Record<string, Omit<JamsilViewInfo, 'photos' | 'rating'>> = {
  PREMIUM: { distance: '가까움', notes: '홈플레이트 뒤 중앙 프리미엄 구역입니다.', tags: ['중앙 시야'] },
  TABLE: { distance: '가까움', notes: '테이블 좌석 구역입니다.', tags: ['테이블'] },
  EXCITING: { distance: '매우 가까움', notes: '파울라인과 가까운 익사이팅존입니다.', tags: ['파울볼 주의'] },
  BLUE: { distance: '가까움', notes: '내야 하단 블루석 블록입니다.', tags: ['내야'] },
  ORANGE: { distance: '중간', notes: '응원 분위기가 강한 오렌지석 블록입니다.', tags: ['응원'] },
  RED: { distance: '중간', notes: '내야 측 레드석 블록입니다.', tags: ['내야'] },
  NAVY: { distance: '먼 편', notes: '상단 네이비석 블록입니다.', tags: ['상단'] },
  OUTFIELD: { distance: '먼 편', notes: '외야 그린석 블록입니다.', tags: ['외야'] },
  OUTFIELD_CHEER: { distance: '먼 편', notes: '외야 그린응원석 블록입니다.', tags: ['외야 응원'] },
  ACCESSIBLE: { distance: '구역별 상이', notes: '공식 안내 기준 휠체어석 구역입니다.', tags: ['휠체어석'] },
};

export const JAMSIL_VIEW_INFO: Record<string, JamsilViewInfo> = {
  default: { photos: 0, rating: null },
  ...Object.fromEntries(
    JAMSIL_BLOCKS.map((block) => [
      block.id,
      {
        photos: 0,
        rating: null,
        ...CATEGORY_VIEW_INFO[block.category],
      },
    ]),
  ),
};

// User-generated social proof must come from the seat-view API, not hardcoded samples.
export const JAMSIL_REVIEWS: Record<string, JamsilReview[]> = {};

// Detailed ratings are disabled until they can be backed by real data.
export const JAMSIL_DETAILED_RATINGS: Record<string, DetailedRatings> = {};

// ===== Category filter groups =====
export const JAMSIL_CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'all',        label: '전체',     cats: null },
  { id: 'cheer',      label: '응원석',   cats: ['ORANGE', 'OUTFIELD_CHEER'] },
  { id: 'premium',    label: '프리미엄', cats: ['PREMIUM', 'TABLE'] },
  { id: 'infield',    label: '내야석',   cats: ['BLUE', 'RED', 'EXCITING'] },
  { id: 'outfield',   label: '외야석',   cats: ['OUTFIELD', 'OUTFIELD_CHEER'] },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'] },
  { id: 'value',      label: '가성비',   cats: ['NAVY', 'OUTFIELD'] },
];

export function getJamsilSideLabel(side: JamsilSide): string {
  if (side === 'FIRST_BASE') return '1루';
  if (side === 'THIRD_BASE') return '3루';
  if (side === 'OUTFIELD') return '외야';
  return '중앙';
}

export function getJamsilSourceLabel(confidence: JamsilSourceConfidence): string {
  return confidence === 'OFFICIAL' ? '공식 확인' : '2026 공식 확인 필요';
}
