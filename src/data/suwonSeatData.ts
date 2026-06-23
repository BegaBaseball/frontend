// Suwon kt wiz Park seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type SuwonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type SuwonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type SuwonLevel = '1F' | '2F' | '3F' | '4F' | '5F' | 'OUTFIELD';
export type SuwonSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type SuwonGeometryTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'DRAFT_APPROXIMATE';
export type SuwonSeatMapPoint = [number, number];

export interface SuwonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

export interface SuwonBlock {
  id: string;
  level: SuwonLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: SuwonSide;
  fanRole: SuwonFanRole;
  sourceConfidence: SuwonSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: SuwonImageGeometry;
  hitGeometry: SuwonImageGeometry;
  hitPriority: number;
  traceStatus: SuwonGeometryTraceStatus;
  accessibilityNote?: string;
}

export interface SuwonCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

type GeometryDraft = Omit<SuwonImageGeometry, 'shortLabel'> & { shortLabel?: string };
type GeometryDraftRecord = {
  imageGeometry: SuwonImageGeometry;
  hitGeometry: SuwonImageGeometry;
  hitPriority: number;
  traceStatus: SuwonGeometryTraceStatus;
};
type BlockDefinition = Omit<SuwonBlock, 'imageGeometry' | 'hitGeometry' | 'hitPriority' | 'traceStatus' | 'sourceConfidence' | 'sourceNote' | 'seatViewSections'> & {
  sourceConfidence?: SuwonSourceConfidence;
  sourceNote?: string;
  seatViewSections?: string[];
};
type Point = SuwonSeatMapPoint;

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => {
      deepFreeze(item as unknown, seen);
    });
  } else {
    Object.values(value).forEach((item) => {
      deepFreeze(item as unknown, seen);
    });
  }

  return Object.isFrozen(value) ? value : Object.freeze(value);
}

export const SUWON_SEATMAP_IMAGE = {
  imagePath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp',
  imageWidth: 4290,
  imageHeight: 9679,
  minimumOfficialImageWidth: 4290,
  minimumOfficialImageHeight: 9679,
  sourceLabel: 'kt wiz 공식 좌석 안내 2026 좌석도(SEAT_MAP_PC, 2026-03-26)',
  sourceUrl: 'https://www.ktwiz.co.kr/ticket/seatmap',
  assetStatus: 'OFFICIAL' as const,
  requiredAssetFileName: 'suwon-kt-seatmap-official-2026@2x.webp',
  requiredAssetPath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp',
};

export const SUWON_SEATMAP_VIEWPORT = {
  cropY: 1000,
  cropHeight: 4550,
};

export const SUWON_CATEGORIES: Record<string, SuwonCategory> = {
  GENIE: { label: '지니존/BC카드존', light: '#31343B', dark: '#4B5563', textLight: '#111827', textDark: '#F8FAFC' },
  CENTRAL: { label: '중앙지정석', light: '#8657A5', dark: '#A779C2', textLight: '#4C1D95', textDark: '#F3E8FF' },
  HOME_CHEERING: { label: '1루 응원지정석', light: '#D71920', dark: '#F0444B', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  AWAY_CHEERING: { label: '3루 응원지정석', light: '#C7253A', dark: '#E64B5D', textLight: '#7F1D1D', textDark: '#FFE4E6' },
  INFIELD_RED: { label: '내야지정석', light: '#B91C2B', dark: '#D8424C', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  INFIELD_BLUE: { label: '내야일반석', light: '#52B7CF', dark: '#6BD0E3', textLight: '#164E63', textDark: '#E0F2FE' },
  HIGHFIVE: { label: '하이파이브존', light: '#00A5A8', dark: '#27C3C5', textLight: '#134E4A', textDark: '#CCFBF1' },
  SKYBOX: { label: '스카이박스', light: '#63C8DC', dark: '#7BD9E7', textLight: '#164E63', textDark: '#E0F2FE' },
  SKYZONE: { label: '스카이존', light: '#172142', dark: '#2E3C66', textLight: '#111827', textDark: '#E0E7FF' },
  OUTFIELD_GRASS: { label: '외야 잔디 자유석', light: '#B8D776', dark: '#C7E38B', textLight: '#365314', textDark: '#ECFCCB' },
  OUTFIELD_TABLE: { label: '외야테이블석', light: '#E78AAE', dark: '#F0A3C0', textLight: '#831843', textDark: '#FCE7F3' },
  K_LIVE: { label: 'K-라이브존', light: '#16833A', dark: '#36A65A', textLight: '#14532D', textDark: '#DCFCE7' },
  PUB: { label: '펍/그린존', light: '#666A73', dark: '#818793', textLight: '#1F2937', textDark: '#F1F5F9' },
  KIDS: { label: '키즈랜드 캠핑존', light: '#17A673', dark: '#34C38F', textLight: '#14532D', textDark: '#DCFCE7' },
  ACCESSIBLE: { label: '휠체어석', light: '#FACC15', dark: '#FDE047', textLight: '#713F12', textDark: '#FEF3C7' },
};

export const SUWON_CATEGORY_GROUPS = [
  { id: 'all', label: '전체', cats: null },
  { id: 'cheer', label: '응원석', cats: ['HOME_CHEERING', 'AWAY_CHEERING'] },
  { id: 'infield', label: '내야석', cats: ['GENIE', 'CENTRAL', 'INFIELD_RED', 'INFIELD_BLUE', 'HIGHFIVE'] },
  { id: 'sky', label: '스카이', cats: ['SKYBOX', 'SKYZONE'] },
  { id: 'outfield', label: '외야/특수석', cats: ['OUTFIELD_GRASS', 'OUTFIELD_TABLE', 'K_LIVE', 'PUB', 'KIDS'] },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'] },
] as const;

export const SUWON_VIEW_INFO = {
  default: { photos: 0, rating: null },
};

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function polygonPath(points: Point[]): string {
  const [first, ...rest] = points;
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
}

function polygonGeometry(
  shortLabel: string,
  points: Point[],
  labelX: number,
  labelY: number,
  labelRotate = 0,
  labelFontSize = 54,
): GeometryDraft {
  return { d: polygonPath(points), labelX, labelY, labelRotate, labelFontSize, shortLabel };
}

const officialSkyboxGeometries: Record<string, GeometryDraft> = {
  'suwon-sb1': polygonGeometry('01', [[3439, 2574], [3550, 2621], [3523, 2716], [3415, 2660]], 3483, 2643, 27, 48),
  'suwon-sb2': polygonGeometry('02', [[3388, 2755], [3412, 2670], [3520, 2726], [3492, 2820]], 3455, 2744, 32, 48),
  'suwon-sb3': polygonGeometry('03', [[3388, 2767], [3492, 2835], [3466, 2928], [3362, 2863]], 3426, 2847, 33, 48),
  'suwon-sb4': polygonGeometry('04', [[3357, 2872], [3464, 2939], [3435, 3033], [3331, 2968]], 3397, 2954, 32, 48),
  'suwon-sb5': polygonGeometry('05', [[3329, 2980], [3433, 3046], [3388, 3122], [3284, 3056]], 3358, 3051, 32, 48),
  'suwon-sb6': polygonGeometry('06', [[3279, 3067], [3385, 3135], [3343, 3212], [3237, 3145]], 3311, 3139, 33, 48),
  'suwon-sb7': polygonGeometry('07', [[3233, 3156], [3337, 3223], [3292, 3298], [3189, 3232]], 3263, 3227, 33, 48),
  'suwon-sb8': polygonGeometry('08', [[3155, 3293], [3185, 3245], [3289, 3311], [3246, 3388], [3156, 3331]], 3216, 3316, 32, 48),
  'suwon-sb9': polygonGeometry('09', [[3106, 3384], [3156, 3345], [3240, 3400], [3195, 3474], [3093, 3409]], 3172, 3411, 33, 48),
  'suwon-sb10': polygonGeometry('10', [[3087, 3420], [3192, 3487], [3150, 3564], [3045, 3497]], 3118, 3492, 33, 48),
  'suwon-sb11': polygonGeometry('11', [[3040, 3508], [3144, 3575], [3099, 3650], [2997, 3585]], 3070, 3580, 33, 48),
  'suwon-sb12': polygonGeometry('12', [[2991, 3597], [3096, 3663], [3053, 3740], [2949, 3674]], 3022, 3668, 32, 48),
  'suwon-sb13': polygonGeometry('13', [[2944, 3687], [3046, 3754], [3004, 3829], [2900, 3763]], 2973, 3758, 32, 48),
  'suwon-sb14': polygonGeometry('14', [[2894, 3775], [2998, 3841], [2955, 3918], [2852, 3853]], 2924, 3846, 32, 48),
  'suwon-sb15': polygonGeometry('15', [[2844, 3866], [2948, 3932], [2903, 4008], [2802, 3944]], 2874, 3938, 32, 48),
  'suwon-sb16': polygonGeometry('16', [[2795, 3958], [2898, 4024], [2858, 4095], [2816, 4076], [2752, 4035]], 2824, 4028, 33, 48),
  'suwon-sb17': polygonGeometry('17', [[2744, 4049], [2806, 4089], [2796, 4149], [2709, 4164], [2686, 4145]], 2748, 4111, -59, 48),
  'suwon-sb18': polygonGeometry('18', [[2674, 4154], [2711, 4184], [2748, 4282], [2713, 4322], [2619, 4226]], 2682, 4237, 46, 48),
  'suwon-sb19': polygonGeometry('19', [[2538, 4298], [2610, 4237], [2703, 4333], [2616, 4405]], 2619, 4322, 46, 48),
  'suwon-sb20': polygonGeometry('20', [[2526, 4307], [2606, 4415], [2506, 4473], [2444, 4357]], 2523, 4392, 53, 48),
  'suwon-sb21': polygonGeometry('21', [[2431, 4363], [2492, 4482], [2390, 4520], [2346, 4395]], 2417, 4443, 63, 48),
  'suwon-sb22': polygonGeometry('22', [[2237, 4420], [2333, 4401], [2374, 4527], [2284, 4549], [2258, 4549]], 2302, 4478, 72, 48),
  'suwon-sb23': polygonGeometry('23', [[1750, 4385], [1858, 4425], [1820, 4541], [1695, 4498]], 1780, 4464, 19, 48),
  'suwon-sb24': polygonGeometry('24', [[1631, 4325], [1733, 4379], [1679, 4491], [1562, 4431]], 1650, 4409, 27, 48),
  'suwon-sb25': polygonGeometry('25', [[1442, 4342], [1527, 4248], [1617, 4317], [1546, 4421]], 1531, 4334, 37, 48),
  'suwon-sb26': polygonGeometry('26', [[1343, 4236], [1440, 4156], [1514, 4237], [1429, 4331]], 1429, 4242, 48, 48),
  'suwon-sb27': polygonGeometry('27', [[1271, 4114], [1375, 4051], [1429, 4142], [1331, 4220]], 1349, 4134, -39, 48),
  'suwon-sb28': polygonGeometry('28', [[1324, 3958], [1364, 4036], [1262, 4100], [1221, 4025]], 1293, 4029, -33, 48),
  'suwon-sb29': polygonGeometry('29', [[1276, 3869], [1315, 3944], [1212, 4009], [1171, 3934]], 1243, 3938, -32, 48),
  'suwon-sb30': polygonGeometry('30', [[1225, 3776], [1265, 3853], [1161, 3916], [1121, 3843]], 1193, 3847, -33, 48),
  'suwon-sb31': polygonGeometry('31', [[1071, 3749], [1175, 3684], [1216, 3761], [1112, 3826]], 1144, 3755, -32, 48),
  'suwon-sb32': polygonGeometry('32', [[1125, 3592], [1166, 3670], [1062, 3735], [1021, 3660]], 1094, 3664, -33, 48),
  'suwon-sb33': polygonGeometry('33', [[1076, 3502], [1117, 3578], [1012, 3644], [971, 3569]], 1044, 3572, -33, 48),
  'suwon-sb34': polygonGeometry('34', [[1026, 3410], [1067, 3487], [961, 3551], [921, 3478]], 994, 3481, -33, 48),
  'suwon-sb35': polygonGeometry('35', [[977, 3320], [1018, 3397], [913, 3463], [872, 3388]], 945, 3391, -33, 48),
};

const officialImageGeometries: Record<string, GeometryDraft> = {
  'suwon-101': polygonGeometry('101', [[3011,2442],[3117,2506],[3077,2578],[2972,2514]], 3045, 2510, 122.3, 54),
  'suwon-102': polygonGeometry('102', [[2964,2527],[3069,2592],[3029,2664],[2925,2600]], 2997, 2596, 121.9, 54),
  'suwon-103': polygonGeometry('103', [[2917,2613],[3020,2678],[2980,2751],[2877,2685]], 2949, 2682, 119.1, 54),
  'suwon-104': polygonGeometry('104', [[2869,2700],[2972,2764],[2932,2837],[2830,2772]], 2901, 2769, 119.1, 54),
  'suwon-105': polygonGeometry('105', [[2822,2786],[2924,2851],[2884,2923],[2782,2858]], 2853, 2855, 119.1, 54),
  'suwon-106': polygonGeometry('106', [[2774,2872],[2876,2938],[2835,3010],[2735,2945]], 2806, 2941, 117.8, 54),
  'suwon-107': polygonGeometry('107', [[2727,2958],[2827,3024],[2787,3097],[2687,3031]], 2757, 3028, 121, 54),
  'suwon-108': polygonGeometry('108', [[2679,3045],[2779,3111],[2738,3184],[2639,3118]], 2709, 3115, 121.7, 54),
  'suwon-109': polygonGeometry('109', [[2632,3132],[2730,3197],[2690,3270],[2592,3205]], 2661, 3201, 121.7, 54),
  'suwon-110': polygonGeometry('110', [[2584,3219],[2682,3285],[2658,3328],[2604,3333],[2544,3292]], 2613, 3276, 123.7, 54),
  'suwon-111': polygonGeometry('111', [[2536,3306],[2595,3346],[2594,3382],[2568,3428],[2496,3379]], 2546, 3367, 119.7, 54),
  'suwon-112': polygonGeometry('112', [[2488,3393],[2560,3442],[2519,3515],[2448,3466]], 2504, 3454, 117.2, 54),
  'suwon-113': polygonGeometry('113', [[2440,3480],[2511,3528],[2470,3601],[2400,3553]], 2456, 3541, 126.6, 54),
  'suwon-114': polygonGeometry('114', [[2392,3567],[2462,3615],[2420,3688],[2352,3640]], 2407, 3628, 24, 54),
  'suwon-115': polygonGeometry('115', [[2344,3655],[2412,3702],[2378,3763],[2318,3702]], 2365, 3709, 24, 54),
  'suwon-116': polygonGeometry('116', [[2262,3597],[2314,3635],[2297,3678],[2252,3736],[2230,3761],[2159,3784],[2137,3729],[2190,3698]], 2230, 3700, -12, 54),
  'suwon-117': polygonGeometry('117', [[1998,3730],[2058,3730],[2120,3734],[2141,3791],[2058,3796],[1975,3791]], 2058, 3766, 0, 54),
  'suwon-118': polygonGeometry('118', [[1801,3635],[1855,3599],[1932,3673],[1980,3728],[1953,3783],[1863,3748],[1818,3710]], 1885, 3700, 12, 54),
  'suwon-119': polygonGeometry('119', [[1772,3657],[1796,3702],[1737,3761],[1704,3703]], 1750, 3706, -35, 54),
  'suwon-120': polygonGeometry('120', [[1723,3568],[1762,3641],[1694,3685],[1655,3615]], 1708, 3627, -35, 54),
  'suwon-121': polygonGeometry('121', [[1675,3481],[1712,3555],[1646,3599],[1607,3529]], 1660, 3540, -35, 54),
  'suwon-122': polygonGeometry('122', [[1627,3393],[1665,3467],[1598,3513],[1558,3441]], 1612, 3453, -35, 54),
  'suwon-123': polygonGeometry('123', [[1579,3306],[1617,3380],[1549,3424],[1510,3354]], 1564, 3365, -35, 54),
  'suwon-124': polygonGeometry('124', [[1531,3219],[1569,3293],[1501,3338],[1461,3267]], 1516, 3279, -35, 54),
  'suwon-125': polygonGeometry('125', [[1483,3132],[1523,3205],[1452,3251],[1412,3180]], 1467, 3192, -35, 54),
  'suwon-126': polygonGeometry('126', [[1436,3046],[1474,3119],[1403,3164],[1383,3128],[1377,3085]], 1422, 3105, -35, 54),
  'suwon-127': polygonGeometry('127', [[1287,3024],[1388,2959],[1425,3033],[1364,3073],[1315,3074]], 1359, 3023, -35, 54),
  'suwon-128': polygonGeometry('128', [[1340,2872],[1378,2946],[1279,3010],[1239,2938]], 1309, 2941, -35, 54),
  'suwon-129': polygonGeometry('129', [[1293,2786],[1331,2859],[1230,2922],[1191,2852]], 1261, 2854, -35, 54),
  'suwon-130': polygonGeometry('130', [[1245,2699],[1283,2773],[1182,2836],[1143,2766]], 1213, 2768, -35, 54),
  'suwon-131': polygonGeometry('131', [[1094,2678],[1199,2615],[1237,2686],[1134,2750]], 1166, 2682, -35, 54),
  'suwon-132': polygonGeometry('132', [[1047,2591],[1151,2528],[1188,2601],[1086,2664]], 1118, 2596, -35, 54),
  'suwon-133': polygonGeometry('133', [[999,2505],[1105,2444],[1142,2514],[1038,2578]], 1070, 2510, -35, 54),
  'suwon-201': polygonGeometry('201', [[3148,2525],[3312,2625],[3290,2710],[3107,2597]], 3210, 2618, 127.7, 54),
  'suwon-202': polygonGeometry('202', [[3100,2611],[3286,2726],[3260,2809],[3059,2684]], 3173, 2710, 125.3, 54),
  'suwon-203': polygonGeometry('203', [[3051,2698],[3255,2825],[3227,2906],[3011,2770]], 3133, 2802, 122.6, 54),
  'suwon-204': polygonGeometry('204', [[3003,2784],[3099,2845],[3058,2918],[2963,2857]], 3031, 2851, 112.2, 54),
  'suwon-205': polygonGeometry('205', [[2954,2871],[3050,2931],[3010,3005],[2935,2957],[2924,2925]], 2987, 2938, 126.9, 54),
  'suwon-206': polygonGeometry('206', [[2894,2937],[3004,3002],[2950,3094],[2840,3029]], 2922, 3015, 31, 54),
  'suwon-207': polygonGeometry('207', [[2844,3026],[2954,3091],[2900,3183],[2790,3118]], 2872, 3104, 31, 54),
  'suwon-208': polygonGeometry('208', [[2804,3109],[2914,3174],[2860,3266],[2750,3201]], 2832, 3187, 31, 54),
  'suwon-209': polygonGeometry('209', [[2749,3201],[2859,3266],[2805,3358],[2695,3293]], 2777, 3279, 31, 54),
  'suwon-210': polygonGeometry('210', [[2710,3290],[2820,3355],[2766,3447],[2656,3382]], 2738, 3368, 31, 54),
  'suwon-211': polygonGeometry('211', [[2669,3396],[2758,3457],[2718,3530],[2624,3464]], 2691, 3460, 31, 54),
  'suwon-212': polygonGeometry('212', [[2615,3480],[2709,3544],[2669,3618],[2575,3551]], 2641, 3548, 31, 54),
  'suwon-213': polygonGeometry('213', [[2566,3567],[2661,3633],[2620,3706],[2535,3622]], 2597, 3637, 31, 54),
  'suwon-214': polygonGeometry('214', [[2517,3655],[2612,3720],[2572,3793],[2477,3726]], 2544, 3721, 31, 54),
  'suwon-215': polygonGeometry('215', [[2468,3742],[2563,3808],[2503,3892],[2427,3813]], 2492, 3813, 31, 54),
  'suwon-216': polygonGeometry('216', [[2321,3727],[2360,3760],[2391,3800],[2430,3840],[2491,3904],[2453,3935],[2418,3960],[2378,3984],[2340,4002],[2296,4016],[2257,4028],[2235,3990],[2217,3945],[2197,3880],[2180,3838],[2218,3821],[2260,3800],[2303,3760]], 2325, 3887, 12, 54),
  'suwon-217': polygonGeometry('217', [[1955,3838],[1990,3839],[2058,3847],[2132,3839],[2161,3838],[2177,3880],[2193,3920],[2209,3960],[2225,4000],[2209,4028],[2148,4025],[2103,4053],[2058,4054],[2013,4053],[1968,4025],[1878,4034],[1891,4000],[1907,3960],[1923,3920],[1939,3880]], 2058, 3954, 0, 54),
  'suwon-218': polygonGeometry('218', [[1794,3727],[1818,3770],[1857,3803],[1896,3822],[1937,3838],[1919,3880],[1903,3920],[1887,3960],[1871,4000],[1860,4030],[1818,4018],[1779,4002],[1740,3956],[1701,3963],[1662,3937],[1623,3904],[1662,3864],[1701,3823],[1740,3783]], 1790, 3888, -12, 54),
  'suwon-219': polygonGeometry('219', [[1551,3808],[1646,3742],[1688,3814],[1612,3892]], 1620, 3817, -35, 54),
  'suwon-220': polygonGeometry('220', [[1502,3720],[1598,3654],[1638,3728],[1543,3794]], 1569, 3724, -35, 54),
  'suwon-221': polygonGeometry('221', [[1454,3632],[1559,3585],[1589,3640],[1494,3706]], 1520, 3639, -35, 54),
  'suwon-222': polygonGeometry('222', [[1400,3543],[1501,3475],[1545,3554],[1444,3624]], 1472, 3549, -35, 54),
  'suwon-223': polygonGeometry('223', [[1356,3457],[1452,3393],[1492,3465],[1397,3530]], 1424, 3461, -35, 54),
  'suwon-224': polygonGeometry('224', [[1292,3391],[1388,3327],[1428,3399],[1333,3464]], 1360, 3395, -35, 54),
  'suwon-225': polygonGeometry('225', [[1242,3296],[1338,3232],[1378,3304],[1283,3369]], 1310, 3300, -35, 54),
  'suwon-226': polygonGeometry('226', [[1192,3201],[1288,3137],[1328,3209],[1233,3274]], 1260, 3205, -35, 54),
  'suwon-227': polygonGeometry('227', [[1142,3111],[1238,3047],[1278,3119],[1183,3184]], 1210, 3115, -35, 54),
  'suwon-228': polygonGeometry('228', [[1097,3016],[1193,2952],[1233,3024],[1138,3089]], 1165, 3020, -35, 54),
  'suwon-229': polygonGeometry('229', [[1042,2926],[1138,2862],[1178,2934],[1083,2999]], 1110, 2930, -35, 54),
  'suwon-230': polygonGeometry('230', [[1007,2856],[1103,2792],[1143,2864],[1048,2929]], 1075, 2860, -35, 54),
  'suwon-231': polygonGeometry('231', [[1064,2698],[1103,2770],[888,2906],[860,2825]], 1040, 2780, -35, 54),
  'suwon-232': polygonGeometry('232', [[1015,2611],[1055,2684],[854,2809],[829,2726]], 1005, 2690, -35, 54),
  'suwon-233': polygonGeometry('233', [[966,2526],[1007,2597],[824,2709],[803,2625]], 930, 2600, -35, 54),
  'suwon-301': polygonGeometry('301', [[3130,2864],[3234,2930],[3189,3002],[3084,2936]], 3157, 2931, 24, 54),
  'suwon-302': polygonGeometry('302', [[3081,2951],[3195,3024],[3149,3096],[3035,3023]], 3115, 3018, 24, 54),
  'suwon-303': polygonGeometry('303', [[3039,3047],[3162,3123],[3121,3189],[2998,3113]], 3080, 3118, 24, 54),
  'suwon-304': polygonGeometry('304', [[2990,3135],[3113,3211],[3072,3277],[2949,3201]], 3031, 3206, 24, 54),
  'suwon-305': polygonGeometry('305', [[2935,3224],[3058,3300],[3017,3366],[2894,3290]], 2976, 3295, 24, 54),
  'suwon-306': polygonGeometry('306', [[2892,3311],[3015,3387],[2974,3453],[2851,3377]], 2933, 3382, 24, 54),
  'suwon-307': polygonGeometry('307', [[2839,3394],[2962,3470],[2921,3536],[2798,3460]], 2880, 3465, 24, 54),
  'suwon-308': polygonGeometry('308', [[2789,3477],[2914,3562],[2867,3633],[2741,3548]], 2827, 3556, 24, 54),
  'suwon-309': polygonGeometry('309', [[2740,3565],[2865,3650],[2817,3721],[2692,3635]], 2779, 3644, 24, 54),
  'suwon-310': polygonGeometry('310', [[2692,3653],[2816,3739],[2767,3809],[2643,3723]], 2730, 3728, 24, 54),
  'suwon-311': polygonGeometry('311', [[2643,3741],[2767,3828],[2719,3898],[2594,3811]], 2680, 3821, 24, 54),
  'suwon-312': polygonGeometry('312', [[2516,3936],[2595,3827],[2712,3912],[2632,4021]], 2621, 3919, 24, 54),
  'suwon-313': polygonGeometry('313', [[2509,3945],[2549,3980],[2581,4013],[2577,4061],[2549,4089],[2515,4118],[2485,4140],[2447,4164],[2379,4175],[2374,4180],[2351,4140],[2330,4100],[2311,4064],[2345,4050],[2379,4033],[2413,4015],[2447,3993],[2481,3969]], 2454, 4068, -31, 54),
  'suwon-314': polygonGeometry('314', [[2095,4110],[2200,4096],[2270,4078],[2340,4071],[2340,4162],[2305,4225],[2235,4227],[2200,4250],[2130,4249],[2061,4262],[2061,4140]], 2201, 4167, -10, 54),
  'suwon-315': polygonGeometry('315', [[1742,4067],[1818,4069],[1856,4081],[1932,4100],[2008,4109],[2042,4140],[2042,4250],[1970,4249],[1932,4254],[1856,4228],[1810,4200],[1770,4180],[1780,4169]], 1917, 4164, 11, 54),
  'suwon-316': polygonGeometry('316', [[1514,4033],[1549,3998],[1584,3962],[1601,3945],[1650,3980],[1712,4020],[1795,4060],[1774,4100],[1754,4140],[1724,4197],[1689,4180],[1654,4160],[1619,4137],[1584,4109],[1549,4075]], 1655, 4074, 38, 54),
  'suwon-317': polygonGeometry('317', [[1520,3827],[1601,3937],[1484,4023],[1403,3912]], 1498, 3923, -24, 54),
  'suwon-318': polygonGeometry('318', [[1347,3828],[1472,3741],[1521,3811],[1396,3898]], 1438, 3821, -24, 54),
  'suwon-319': polygonGeometry('319', [[1299,3739],[1423,3653],[1472,3723],[1347,3809]], 1388, 3732, -24, 54),
  'suwon-320': polygonGeometry('320', [[1249,3650],[1374,3565],[1422,3635],[1297,3721]], 1334, 3642, -24, 54),
  'suwon-321': polygonGeometry('321', [[1200,3562],[1325,3477],[1373,3548],[1248,3632]], 1287, 3554, -24, 54),
  'suwon-322': polygonGeometry('322', [[1157,3473],[1280,3397],[1321,3463],[1198,3539]], 1239, 3468, -24, 54),
  'suwon-323': polygonGeometry('323', [[1098,3389],[1221,3313],[1262,3379],[1139,3455]], 1180, 3384, -24, 54),
  'suwon-324': polygonGeometry('324', [[1049,3302],[1172,3226],[1213,3292],[1090,3368]], 1131, 3297, -24, 54),
  'suwon-325': polygonGeometry('325', [[1001,3213],[1124,3137],[1165,3203],[1042,3279]], 1083, 3208, -24, 54),
  'suwon-326': polygonGeometry('326', [[960,3121],[1083,3045],[1124,3111],[1001,3187]], 1042, 3116, -24, 54),
  'suwon-327': polygonGeometry('327', [[920,3024],[1033,2951],[1079,3023],[965,3096]], 1004, 3023, -24, 54),
  'suwon-328': polygonGeometry('328', [[880,2930],[985,2864],[1030,2936],[926,3002]], 960, 2930, -24, 54),
  'suwon-401': polygonGeometry('401', [[3329,3449],[3469,3532],[3392,3663],[3252,3579]], 3359, 3555, 24, 54),
  'suwon-402': polygonGeometry('402', [[3252,3596],[3396,3684],[3326,3799],[3182,3711]], 3290, 3697, 24, 54),
  'suwon-403': polygonGeometry('403', [[3258,3936],[3111,3846],[3182,3730],[3329,3820]], 3219, 3833, 24, 54),
  'suwon-404': polygonGeometry('404', [[3112,3866],[3260,3956],[3192,4067],[3044,3976]], 3152, 3966, 24, 54),
  'suwon-405': polygonGeometry('405', [[3121,4204],[2972,4113],[3044,3995],[3193,4086]], 3084, 4099, 24, 54),
  'suwon-406': polygonGeometry('406', [[2970,4131],[3115,4220],[3037,4347],[2892,4259]], 3007, 4238, 24, 54),
  'suwon-407': polygonGeometry('407', [[2894,4263],[3027,4361],[2940,4480],[2807,4382]], 2921, 4370, 24, 54),
  'suwon-408': polygonGeometry('408', [[2697,4498],[2815,4380],[2926,4491],[2807,4609]], 2816, 4495, 24, 54),
  'suwon-409': polygonGeometry('409', [[2560,4578],[2709,4485],[2793,4620],[2644,4713]], 2675, 4603, 18, 54),
  'suwon-410': polygonGeometry('410', [[2409,4641],[2568,4575],[2630,4723],[2471,4790]], 2516, 4686, 10, 54),
  'suwon-411': polygonGeometry('411', [[2236,4688],[2414,4641],[2455,4795],[2277,4842]], 2347, 4740, 5, 54),
  'suwon-412': polygonGeometry('412', [[2054,4706],[2238,4685],[2256,4845],[2071,4865]], 2155, 4777, 2, 54),
  'suwon-413': polygonGeometry('413', [[1918,4695],[2059,4704],[2049,4865],[1907,4856]], 1984, 4782, -176.3, 54),
  'suwon-414': polygonGeometry('414', [[1782,4667],[1922,4696],[1890,4855],[1750,4826]], 1835, 4765, -2, 54),
  'suwon-415': polygonGeometry('415', [[1650,4622],[1785,4668],[1733,4821],[1597,4775]], 1692, 4725, -5, 54),
  'suwon-416': polygonGeometry('416', [[1582,4767],[1453,4703],[1525,4559],[1654,4623]], 1554, 4666, -10, 54),
  'suwon-417': polygonGeometry('417', [[1414,4480],[1531,4564],[1439,4691],[1322,4608]], 1424, 4588, -18, 54),
  'suwon-418': polygonGeometry('418', [[1318,4387],[1417,4483],[1311,4593],[1212,4497]], 1324, 4490, -24, 54),
  'suwon-419': polygonGeometry('419', [[1233,4273],[1313,4381],[1201,4464],[1121,4356]], 1232, 4351, -24, 54),
  'suwon-420': polygonGeometry('420', [[1235,4257],[1115,4339],[1068,4270],[1188,4189]], 1148, 4264, -24, 54),
  'suwon-421': polygonGeometry('421', [[1019,4182],[1140,4099],[1188,4168],[1067,4251]], 1104, 4175, -24, 54),
  'suwon-422': polygonGeometry('422', [[1140,4078],[1018,4162],[970,4092],[1092,4008]], 1055, 4085, -24, 54),
  'suwon-423': polygonGeometry('423', [[920,4001],[1043,3916],[1092,3986],[970,4072]], 1003, 3994, -24, 54),
  'suwon-424': polygonGeometry('424', [[1043,3894],[920,3980],[870,3909],[993,3823]], 956, 3902, -24, 54),
  'suwon-425': polygonGeometry('425', [[992,3802],[870,3888],[819,3817],[941,3730]], 905, 3811, -24, 54),
  'suwon-426': polygonGeometry('426', [[944,3707],[820,3795],[768,3723],[892,3634]], 856, 3715, -24, 54),
  'suwon-427': polygonGeometry('427', [[894,3611],[769,3701],[716,3628],[841,3538]], 805, 3620, -24, 54),
  'suwon-428': polygonGeometry('428', [[841,3517],[717,3606],[664,3532],[788,3443]], 752, 3526, -24, 54),
  'suwon-429': polygonGeometry('429', [[792,3418],[665,3510],[611,3435],[738,3343]], 701, 3426, -24, 54),
  'suwon-430': polygonGeometry('430', [[740,3319],[612,3413],[557,3338],[685,3244]], 648, 3328, -24, 54),
  'suwon-431': polygonGeometry('431', [[687,3219],[559,3314],[503,3239],[631,3143]], 595, 3229, -24, 54),
  'suwon-432': polygonGeometry('432', [[632,3120],[505,3215],[453,3145],[580,3050]], 543, 3132, -24, 54),
  'suwon-genie': polygonGeometry('지니존', [[1810,3796],[1910,3792],[2058,3792],[2195,3795],[2228,3822],[2192,3852],[2070,3858],[1945,3858],[1818,3852],[1788,3822]], 2005, 3830, 0, 60),
  'suwon-lf-grass': polygonGeometry('잔디', [[1031,2214],[1105,2150],[1167,2100],[1239,2050],[1322,2000],[1419,1950],[1538,1900],[1699,1850],[1850,1825],[1850,2062],[1705,2100],[1571,2150],[1468,2200],[1382,2250],[1306,2300],[1239,2350],[1201,2380]], 1458, 2083, -26, 54),
  'suwon-rf-grass': polygonGeometry('잔디', [[2195,1869],[2350,1867],[2479,1867],[2585,1900],[2704,1950],[2801,2000],[2874,2046],[2838,2095],[2805,2145],[2783,2220],[2765,2307],[2678,2265],[2630,2240],[2550,2210],[2470,2180],[2315,2112],[2187,2054],[2188,1975]], 2644, 2083, 24, 54),
  'suwon-7pub': polygonGeometry('7 PUB', [[1853,1815],[1910,1812],[1990,1809],[2055,1807],[2130,1808],[2174,1812],[2174,2050],[2090,2049],[1990,2052],[1888,2059],[1853,2060]], 2030, 1930, 0, 54),
  'suwon-green': polygonGeometry('그린존', [[2874,2046],[2916,2074],[2943,2093],[2978,2119],[3006,2141],[3041,2170],[3075,2200],[3095,2219],[3076,2242],[3040,2278],[3000,2317],[2952,2356],[2930,2377],[2888,2365],[2840,2345],[2765,2307],[2783,2220],[2805,2145],[2838,2095]], 2940, 2228, 36, 54),
  'suwon-501-508': polygonGeometry('테이블', [[2756,1703],[2807,1600],[2865,1502],[2940,1534],[3020,1580],[3110,1633],[3184,1677],[3260,1730],[3315,1778],[3385,1840],[3429,1892],[3376,1946],[3265,2055],[3200,2000],[3136,1952],[3055,1900],[2988,1860],[2900,1805],[2860,1782]], 3091, 1770, 35, 54),
  'suwon-k-live': polygonGeometry('K-LIVE', [[2668,1850],[2682,1822],[2707,1774],[2716,1757],[2767,1780],[2829,1811],[2896,1848],[2949,1880],[2989,1906],[2982,1916],[2930,1990],[2810,1928]], 2827, 1871, 29, 54),
  'suwon-hite-pub': polygonGeometry('펍', [[3197,2210],[3262,2145],[3313,2200],[3357,2252],[3385,2287],[3403,2312],[3416,2352],[3417,2376],[3413,2404],[3393,2456],[3374,2426],[3338,2392],[3316,2352],[3277,2300],[3234,2250],[3207,2200]], 3323, 2290, 61, 54),
  'suwon-kids-camp': polygonGeometry('캠핑', [[3300,2108],[3357,2053],[3377,2034],[3434,2105],[3467,2147],[3515,2210],[3540,2246],[3569,2300],[3583,2339],[3593,2389],[3596,2419],[3596,2450],[3592,2487],[3504,2466],[3454,2452],[3464,2400],[3466,2350],[3451,2300],[3419,2250],[3377,2200],[3335,2150]], 3476, 2280, 66, 54),
  'suwon-wiz-garden': polygonGeometry('가든', [[3641,2340],[3704,2315],[3727,2306],[3732,2309],[3741,2358],[3748,2415],[3753,2482],[3755,2552],[3754,2626],[3750,2701],[3745,2757],[3737,2820],[3727,2880],[3715,2937],[3699,2999],[3686,3041],[3634,3173],[3597,3243],[3556,3315],[3427,3246],[3428,3230],[3443,3200],[3468,3150],[3493,3100],[3534,3000],[3559,2900],[3582,2800],[3606,2700],[3630,2600],[3651,2500],[3654,2450],[3652,2400]], 3629, 2852, -76, 54),
  'suwon-3b-highfive': polygonGeometry('하이파이브', [[1368,2832],[1450,2815],[1657,3200],[1582,3274],[1368,2870]], 1518, 3060, -66, 54),
  'suwon-1b-highfive': polygonGeometry('하이파이브', [[2660,2818],[2747,2846],[2558,3260],[2488,3274],[2462,3205],[2655,2860]], 2600, 3060, 64, 54),
  'suwon-wheel-center': polygonGeometry('휠체어', [[2300,4198],[2315,4171],[2346,4163],[2372,4179],[2379,4210],[2365,4230],[2340,4267],[2320,4248],[2309,4230]], 2340, 4215, 0, 42),
  'suwon-wheel-1b': polygonGeometry('휠체어', [[2730,4150],[2795,4100],[2820,4084],[2854,4099],[2868,4120],[2864,4148],[2836,4180],[2825,4187],[2792,4160]], 2828, 4124, 0, 42),
  'suwon-wheel-3b': polygonGeometry('휠체어', [[1764,4201],[1778,4172],[1809,4163],[1837,4180],[1843,4210],[1829,4230],[1804,4267],[1790,4248]], 1804, 4215, 0, 42),
};

const IMAGE_GEOMETRY: Record<string, GeometryDraft> = {
  ...officialImageGeometries,
  ...officialSkyboxGeometries,
};

function completeGeometry(id: string, geometry: GeometryDraft): SuwonImageGeometry {
  return {
    ...geometry,
    labelFontSize: geometry.labelFontSize ?? 54,
    shortLabel: geometry.shortLabel ?? id.replace('suwon-', '').toUpperCase(),
  };
}

const HIT_GEOMETRY_OVERRIDES: Record<string, GeometryDraft> = {};

const HIT_PRIORITY_OVERRIDES: Record<string, number> = {
  ...Object.fromEntries(Object.keys(officialSkyboxGeometries).map((id) => [id, 120])),
};

function priorityFor(id: string): number {
  if (HIT_PRIORITY_OVERRIDES[id]) return HIT_PRIORITY_OVERRIDES[id];

  const numericBlock = id.match(/^suwon-(\d+)$/)?.[1];
  if (numericBlock) {
    const blockNumber = Number(numericBlock);
    if (blockNumber >= 401) return 50;
    if (blockNumber >= 301) return 72;
    if (blockNumber >= 201) return 68;
    return 70;
  }
  if (id.includes('wheel')) return 90;
  if (id.includes('highfive')) return 65;
  if (id === 'suwon-genie') return 92;
  if (id.includes('grass')) return 10;
  if (/^suwon-sb/.test(id)) return 64;
  return 30;
}

function aliases(name: string, block: string, officialBlocks: string[]): string[] {
  return Array.from(new Set([
    block,
    `${block}블록`,
    ...officialBlocks,
    ...officialBlocks.map((officialBlock) => `${officialBlock}블록`),
    `수원 ${block}`,
    `KT ${block}`,
    `kt wiz ${block}`,
    name,
  ]));
}

function blockDefinition(input: BlockDefinition): Required<Pick<BlockDefinition, 'sourceConfidence' | 'sourceNote' | 'seatViewSections'>> & BlockDefinition {
  const officialBlocks = input.officialBlocks.length > 0 ? input.officialBlocks : [input.block];
  return {
    ...input,
    officialBlocks,
    sourceConfidence: input.sourceConfidence ?? 'OFFICIAL',
    sourceNote: input.sourceNote ?? 'kt wiz 공식 좌석 안내 이미지 기준 정적 좌표입니다.',
    seatViewSections: input.seatViewSections ?? aliases(input.name, input.block, officialBlocks),
  };
}

function numberDefinitions(blocks: string[], level: SuwonLevel, category: string | ((block: string) => string), side: SuwonSide, fanRole: SuwonFanRole): BlockDefinition[] {
  return blocks.map((block) => {
    const blockCategory = typeof category === 'function' ? category(block) : category;
    return blockDefinition({
      id: `suwon-${block}`,
      level,
      category: blockCategory,
      name: `${block} ${SUWON_CATEGORIES[blockCategory].label}`,
      block,
      officialBlocks: [block],
      side,
      fanRole,
    });
  });
}

function firstBaseCategory(block: string): string {
  return ['107', '108', '109', '110', '207', '208', '209', '210'].includes(block) ? 'HOME_CHEERING' : 'INFIELD_RED';
}

function thirdBaseCategory(block: string): string {
  return ['127', '128', '129', '130', '227', '228', '229', '230'].includes(block) ? 'AWAY_CHEERING' : 'INFIELD_RED';
}

const skyboxBlockDefinitions: BlockDefinition[] = [
  blockDefinition({ id: 'suwon-sb1', level: '4F', category: 'SKYBOX', name: '01 스카이박스', block: 'SB1', officialBlocks: ['스카이박스 01'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb2', level: '4F', category: 'SKYBOX', name: '02 스카이박스', block: 'SB2', officialBlocks: ['스카이박스 02'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb3', level: '4F', category: 'SKYBOX', name: '03 스카이박스', block: 'SB3', officialBlocks: ['스카이박스 03'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb4', level: '4F', category: 'SKYBOX', name: '04 스카이박스', block: 'SB4', officialBlocks: ['스카이박스 04'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb5', level: '4F', category: 'SKYBOX', name: '05 스카이박스', block: 'SB5', officialBlocks: ['스카이박스 05'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb6', level: '4F', category: 'SKYBOX', name: '06 스카이박스', block: 'SB6', officialBlocks: ['스카이박스 06'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb7', level: '4F', category: 'SKYBOX', name: '07 스카이박스', block: 'SB7', officialBlocks: ['스카이박스 07'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb8', level: '4F', category: 'SKYBOX', name: '08 스카이박스', block: 'SB8', officialBlocks: ['스카이박스 08'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb9', level: '4F', category: 'SKYBOX', name: '09 스카이박스', block: 'SB9', officialBlocks: ['스카이박스 09'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb10', level: '4F', category: 'SKYBOX', name: '10 스카이박스', block: 'SB10', officialBlocks: ['스카이박스 10'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb11', level: '4F', category: 'SKYBOX', name: '11 스카이박스', block: 'SB11', officialBlocks: ['스카이박스 11'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb12', level: '4F', category: 'SKYBOX', name: '12 스카이박스', block: 'SB12', officialBlocks: ['스카이박스 12'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb13', level: '4F', category: 'SKYBOX', name: '13 스카이박스', block: 'SB13', officialBlocks: ['스카이박스 13'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb14', level: '4F', category: 'SKYBOX', name: '14 스카이박스', block: 'SB14', officialBlocks: ['스카이박스 14'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb15', level: '4F', category: 'SKYBOX', name: '15 스카이박스', block: 'SB15', officialBlocks: ['스카이박스 15'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb16', level: '4F', category: 'SKYBOX', name: '16 스카이박스', block: 'SB16', officialBlocks: ['스카이박스 16'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb17', level: '4F', category: 'SKYBOX', name: '17 스카이박스', block: 'SB17', officialBlocks: ['스카이박스 17'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb18', level: '4F', category: 'SKYBOX', name: '18 스카이박스', block: 'SB18', officialBlocks: ['스카이박스 18'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb19', level: '4F', category: 'SKYBOX', name: '19 스카이박스', block: 'SB19', officialBlocks: ['스카이박스 19'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb20', level: '4F', category: 'SKYBOX', name: '20 스카이박스', block: 'SB20', officialBlocks: ['스카이박스 20'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb21', level: '4F', category: 'SKYBOX', name: '21 스카이박스', block: 'SB21', officialBlocks: ['스카이박스 21'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb22', level: '4F', category: 'SKYBOX', name: '22 스카이박스', block: 'SB22', officialBlocks: ['스카이박스 22'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb23', level: '4F', category: 'SKYBOX', name: '23 스카이박스', block: 'SB23', officialBlocks: ['스카이박스 23'], side: 'FIRST_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb24', level: '4F', category: 'SKYBOX', name: '24 스카이박스', block: 'SB24', officialBlocks: ['스카이박스 24'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb25', level: '4F', category: 'SKYBOX', name: '25 스카이박스', block: 'SB25', officialBlocks: ['스카이박스 25'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb26', level: '4F', category: 'SKYBOX', name: '26 스카이박스', block: 'SB26', officialBlocks: ['스카이박스 26'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb27', level: '4F', category: 'SKYBOX', name: '27 스카이박스', block: 'SB27', officialBlocks: ['스카이박스 27'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb28', level: '4F', category: 'SKYBOX', name: '28 스카이박스', block: 'SB28', officialBlocks: ['스카이박스 28'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb29', level: '4F', category: 'SKYBOX', name: '29 스카이박스', block: 'SB29', officialBlocks: ['스카이박스 29'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb30', level: '4F', category: 'SKYBOX', name: '30 스카이박스', block: 'SB30', officialBlocks: ['스카이박스 30'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb31', level: '4F', category: 'SKYBOX', name: '31 스카이박스', block: 'SB31', officialBlocks: ['스카이박스 31'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb32', level: '4F', category: 'SKYBOX', name: '32 스카이박스', block: 'SB32', officialBlocks: ['스카이박스 32'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb33', level: '4F', category: 'SKYBOX', name: '33 스카이박스', block: 'SB33', officialBlocks: ['스카이박스 33'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb34', level: '4F', category: 'SKYBOX', name: '34 스카이박스', block: 'SB34', officialBlocks: ['스카이박스 34'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-sb35', level: '4F', category: 'SKYBOX', name: '35 스카이박스', block: 'SB35', officialBlocks: ['스카이박스 35'], side: 'THIRD_BASE', fanRole: 'NEUTRAL' }),
];

const definitions: BlockDefinition[] = [
  ...numberDefinitions(numberedBlocks(101, 113), '1F', firstBaseCategory, 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(114, 123), '1F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(124, 133), '1F', thirdBaseCategory, 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(201, 213), '2F', firstBaseCategory, 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(214, 223), '2F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(224, 233), '2F', thirdBaseCategory, 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(301, 313), '3F', 'INFIELD_BLUE', 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(314, 319), '3F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(320, 328), '3F', 'INFIELD_BLUE', 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(401, 432), '5F', 'SKYZONE', 'OUTFIELD', 'NEUTRAL'),
  ...skyboxBlockDefinitions,
  blockDefinition({ id: 'suwon-genie', level: '1F', category: 'GENIE', name: '지니존/BC카드존', block: 'GENIE', officialBlocks: ['지니존', 'BC카드존'], side: 'CENTER', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-lf-grass', level: 'OUTFIELD', category: 'OUTFIELD_GRASS', name: '3루 외야 잔디 자유석', block: 'LF-GRASS', officialBlocks: ['3루 외야 잔디 자유석'], side: 'OUTFIELD', fanRole: 'AWAY' }),
  blockDefinition({ id: 'suwon-rf-grass', level: 'OUTFIELD', category: 'OUTFIELD_GRASS', name: '1루 외야 잔디 자유석', block: 'RF-GRASS', officialBlocks: ['1루 외야 잔디 자유석'], side: 'OUTFIELD', fanRole: 'HOME' }),
  blockDefinition({ id: 'suwon-7pub', level: 'OUTFIELD', category: 'PUB', name: '7 PUB', block: '7PUB', officialBlocks: ['7 PUB'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-green', level: 'OUTFIELD', category: 'PUB', name: '그린존', block: 'GREEN', officialBlocks: ['그린존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-501-508', level: 'OUTFIELD', category: 'OUTFIELD_TABLE', name: '외야테이블석', block: '501-508', officialBlocks: numberedBlocks(501, 508), side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-k-live', level: 'OUTFIELD', category: 'K_LIVE', name: 'K-라이브존', block: 'K-LIVE', officialBlocks: ['K-라이브존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-hite-pub', level: 'OUTFIELD', category: 'PUB', name: '하이트펍존', block: 'HITE-PUB', officialBlocks: ['하이트펍존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-kids-camp', level: 'OUTFIELD', category: 'KIDS', name: '키즈랜드 캠핑존', block: 'KIDS-CAMP', officialBlocks: ['키즈랜드 캠핑존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-wiz-garden', level: 'OUTFIELD', category: 'KIDS', name: '위즈가든', block: 'WIZ-GARDEN', officialBlocks: ['위즈가든'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-3b-highfive', level: '1F', category: 'HIGHFIVE', name: '3루 하이파이브존', block: '3B-HIGHFIVE', officialBlocks: ['3루 하이파이브존'], side: 'THIRD_BASE', fanRole: 'AWAY' }),
  blockDefinition({ id: 'suwon-1b-highfive', level: '1F', category: 'HIGHFIVE', name: '1루 하이파이브존', block: '1B-HIGHFIVE', officialBlocks: ['1루 하이파이브존'], side: 'FIRST_BASE', fanRole: 'HOME' }),
  blockDefinition({ id: 'suwon-wheel-center', level: '1F', category: 'ACCESSIBLE', name: '중앙 휠체어석', block: 'WHEEL-CENTER', officialBlocks: ['중앙 휠체어석'], side: 'CENTER', fanRole: 'NEUTRAL', accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 중앙 구역입니다.' }),
  blockDefinition({ id: 'suwon-wheel-1b', level: '1F', category: 'ACCESSIBLE', name: '1루 휠체어석', block: 'WHEEL-1B', officialBlocks: ['1루 휠체어석'], side: 'FIRST_BASE', fanRole: 'HOME', accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 1루 구역입니다.' }),
  blockDefinition({ id: 'suwon-wheel-3b', level: '1F', category: 'ACCESSIBLE', name: '3루 휠체어석', block: 'WHEEL-3B', officialBlocks: ['3루 휠체어석'], side: 'THIRD_BASE', fanRole: 'AWAY', accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 3루 구역입니다.' }),
];

const SUWON_HIT_GEOMETRY_EXCEPTION_NOTES_RAW: Record<string, string> = {};

export const SUWON_HIT_GEOMETRY_EXCEPTION_NOTES = deepFreeze(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES_RAW);

const SUWON_IMAGE_GEOMETRY_DRAFTS_RAW: Record<string, GeometryDraftRecord> = Object.fromEntries(definitions.map((definition) => {
  const imageGeometry = IMAGE_GEOMETRY[definition.id];
  if (!imageGeometry) {
    throw new Error(`Missing Suwon geometry for ${definition.id}`);
  }
  const geometry = completeGeometry(definition.id, imageGeometry);
  const hitGeometry = completeGeometry(definition.id, HIT_GEOMETRY_OVERRIDES[definition.id] ?? imageGeometry);
  return [definition.id, {
    imageGeometry: geometry,
    hitGeometry,
    hitPriority: priorityFor(definition.id),
    traceStatus: 'OFFICIAL_IMAGE_TRACED' as const,
  }];
}));

export const SUWON_IMAGE_GEOMETRY_DRAFTS = deepFreeze(SUWON_IMAGE_GEOMETRY_DRAFTS_RAW);

export const SUWON_BLOCKS: SuwonBlock[] = deepFreeze(definitions.map((definition) => {
  const geometryDraft = SUWON_IMAGE_GEOMETRY_DRAFTS[definition.id];
  if (!geometryDraft) {
    throw new Error(`Missing Suwon geometry draft for ${definition.id}`);
  }
  return {
    ...definition,
    sourceConfidence: definition.sourceConfidence ?? 'OFFICIAL',
    sourceNote: definition.sourceNote ?? 'kt wiz 공식 좌석 안내 이미지 기준 정적 좌표입니다.',
    seatViewSections: definition.seatViewSections ?? aliases(definition.name, definition.block, definition.officialBlocks),
    imageGeometry: geometryDraft.imageGeometry,
    hitGeometry: geometryDraft.hitGeometry,
    hitPriority: geometryDraft.hitPriority,
    traceStatus: geometryDraft.traceStatus,
  };
}));

function probeFromBlock(id: string, note: string) {
  const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
  if (!block) {
    throw new Error(`Missing Suwon QA probe block ${id}`);
  }
  return { id, point: [block.imageGeometry.labelX, block.imageGeometry.labelY] as Point, note };
}

const SUWON_FIRSTFLOOR_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-101', '1층 101 대표 구역'),
  probeFromBlock('suwon-102', '1층 102 대표 구역'),
  probeFromBlock('suwon-103', '1층 103 대표 구역'),
  probeFromBlock('suwon-104', '1층 104 대표 구역'),
  probeFromBlock('suwon-105', '1층 105 대표 구역'),
  probeFromBlock('suwon-106', '1층 106 대표 구역'),
  probeFromBlock('suwon-107', '1층 107 대표 구역'),
  probeFromBlock('suwon-108', '1층 108 대표 구역'),
  probeFromBlock('suwon-109', '1층 109 대표 구역'),
  probeFromBlock('suwon-110', '1층 110 대표 구역'),
  probeFromBlock('suwon-111', '1층 111 대표 구역'),
  probeFromBlock('suwon-112', '1층 112 대표 구역'),
  probeFromBlock('suwon-113', '1층 113 대표 구역'),
  probeFromBlock('suwon-114', '1층 114 대표 구역'),
  probeFromBlock('suwon-115', '1층 115 대표 구역'),
  probeFromBlock('suwon-116', '1층 116 대표 구역'),
  probeFromBlock('suwon-117', '1층 117 대표 구역'),
  probeFromBlock('suwon-118', '1층 118 대표 구역'),
  probeFromBlock('suwon-119', '1층 119 대표 구역'),
  probeFromBlock('suwon-120', '1층 120 대표 구역'),
  probeFromBlock('suwon-121', '1층 121 대표 구역'),
  probeFromBlock('suwon-122', '1층 122 대표 구역'),
  probeFromBlock('suwon-123', '1층 123 대표 구역'),
  probeFromBlock('suwon-124', '1층 124 대표 구역'),
  probeFromBlock('suwon-125', '1층 125 대표 구역'),
  probeFromBlock('suwon-126', '1층 126 대표 구역'),
  probeFromBlock('suwon-127', '1층 127 대표 구역'),
  probeFromBlock('suwon-128', '1층 128 대표 구역'),
  probeFromBlock('suwon-129', '1층 129 대표 구역'),
  probeFromBlock('suwon-130', '1층 130 대표 구역'),
  probeFromBlock('suwon-131', '1층 131 대표 구역'),
  probeFromBlock('suwon-132', '1층 132 대표 구역'),
  probeFromBlock('suwon-133', '1층 133 대표 구역'),
]);

const SUWON_FIRSTBASE_2F_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-201', '2층 1루 201 대표 구역'),
  probeFromBlock('suwon-202', '2층 1루 202 대표 구역'),
  probeFromBlock('suwon-203', '2층 1루 203 대표 구역'),
  probeFromBlock('suwon-204', '2층 1루 204 대표 구역'),
  probeFromBlock('suwon-205', '2층 1루 205 대표 구역'),
  probeFromBlock('suwon-206', '2층 1루 206 대표 구역'),
  probeFromBlock('suwon-207', '2층 1루 207 대표 구역'),
  probeFromBlock('suwon-208', '2층 1루 208 대표 구역'),
  probeFromBlock('suwon-209', '2층 1루 209 대표 구역'),
  probeFromBlock('suwon-210', '2층 1루 210 대표 구역'),
  probeFromBlock('suwon-211', '2층 1루 211 대표 구역'),
  probeFromBlock('suwon-212', '2층 1루 212 대표 구역'),
  probeFromBlock('suwon-213', '2층 1루 213 대표 구역'),
  probeFromBlock('suwon-214', '2층 1루 214 대표 구역'),
  probeFromBlock('suwon-215', '2층 1루 215 대표 구역'),
]);

const SUWON_THIRDBASE_2F_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-219', '2층 3루 219 대표 구역'),
  probeFromBlock('suwon-220', '2층 3루 220 대표 구역'),
  probeFromBlock('suwon-221', '2층 3루 221 대표 구역'),
  probeFromBlock('suwon-222', '2층 3루 222 대표 구역'),
  probeFromBlock('suwon-223', '2층 3루 223 대표 구역'),
  probeFromBlock('suwon-224', '2층 3루 224 대표 구역'),
  probeFromBlock('suwon-225', '2층 3루 225 대표 구역'),
  probeFromBlock('suwon-226', '2층 3루 226 대표 구역'),
  probeFromBlock('suwon-227', '2층 3루 227 대표 구역'),
  probeFromBlock('suwon-228', '2층 3루 228 대표 구역'),
  probeFromBlock('suwon-229', '2층 3루 229 대표 구역'),
  probeFromBlock('suwon-230', '2층 3루 230 대표 구역'),
  probeFromBlock('suwon-231', '2층 3루 231 대표 구역'),
  probeFromBlock('suwon-232', '2층 3루 232 대표 구역'),
  probeFromBlock('suwon-233', '2층 3루 233 대표 구역'),
]);

const SUWON_SKYBOX_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-sb1', '스카이박스 01 대표 구역'),
  probeFromBlock('suwon-sb2', '스카이박스 02 대표 구역'),
  probeFromBlock('suwon-sb3', '스카이박스 03 대표 구역'),
  probeFromBlock('suwon-sb4', '스카이박스 04 대표 구역'),
  probeFromBlock('suwon-sb5', '스카이박스 05 대표 구역'),
  probeFromBlock('suwon-sb6', '스카이박스 06 대표 구역'),
  probeFromBlock('suwon-sb7', '스카이박스 07 대표 구역'),
  probeFromBlock('suwon-sb8', '스카이박스 08 대표 구역'),
  probeFromBlock('suwon-sb9', '스카이박스 09 대표 구역'),
  probeFromBlock('suwon-sb10', '스카이박스 10 대표 구역'),
  probeFromBlock('suwon-sb11', '스카이박스 11 대표 구역'),
  probeFromBlock('suwon-sb12', '스카이박스 12 대표 구역'),
  probeFromBlock('suwon-sb13', '스카이박스 13 대표 구역'),
  probeFromBlock('suwon-sb14', '스카이박스 14 대표 구역'),
  probeFromBlock('suwon-sb15', '스카이박스 15 대표 구역'),
  probeFromBlock('suwon-sb16', '스카이박스 16 대표 구역'),
  probeFromBlock('suwon-sb17', '스카이박스 17 대표 구역'),
  probeFromBlock('suwon-sb18', '스카이박스 18 대표 구역'),
  probeFromBlock('suwon-sb19', '스카이박스 19 대표 구역'),
  probeFromBlock('suwon-sb20', '스카이박스 20 대표 구역'),
  probeFromBlock('suwon-sb21', '스카이박스 21 대표 구역'),
  probeFromBlock('suwon-sb22', '스카이박스 22 대표 구역'),
  probeFromBlock('suwon-sb23', '스카이박스 23 대표 구역'),
  probeFromBlock('suwon-sb24', '스카이박스 24 대표 구역'),
  probeFromBlock('suwon-sb25', '스카이박스 25 대표 구역'),
  probeFromBlock('suwon-sb26', '스카이박스 26 대표 구역'),
  probeFromBlock('suwon-sb27', '스카이박스 27 대표 구역'),
  probeFromBlock('suwon-sb28', '스카이박스 28 대표 구역'),
  probeFromBlock('suwon-sb29', '스카이박스 29 대표 구역'),
  probeFromBlock('suwon-sb30', '스카이박스 30 대표 구역'),
  probeFromBlock('suwon-sb31', '스카이박스 31 대표 구역'),
  probeFromBlock('suwon-sb32', '스카이박스 32 대표 구역'),
  probeFromBlock('suwon-sb33', '스카이박스 33 대표 구역'),
  probeFromBlock('suwon-sb34', '스카이박스 34 대표 구역'),
  probeFromBlock('suwon-sb35', '스카이박스 35 대표 구역'),
]);

const SUWON_SKYZONE_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-401', '스카이존 401 대표 구역'),
  probeFromBlock('suwon-402', '스카이존 402 대표 구역'),
  probeFromBlock('suwon-403', '스카이존 403 대표 구역'),
  probeFromBlock('suwon-404', '스카이존 404 대표 구역'),
  probeFromBlock('suwon-405', '스카이존 405 대표 구역'),
  probeFromBlock('suwon-406', '스카이존 406 대표 구역'),
  probeFromBlock('suwon-407', '스카이존 407 대표 구역'),
  probeFromBlock('suwon-408', '스카이존 408 대표 구역'),
  probeFromBlock('suwon-409', '스카이존 409 대표 구역'),
  probeFromBlock('suwon-410', '스카이존 410 대표 구역'),
  probeFromBlock('suwon-411', '스카이존 411 대표 구역'),
  probeFromBlock('suwon-412', '스카이존 412 대표 구역'),
  probeFromBlock('suwon-413', '스카이존 413 대표 구역'),
  probeFromBlock('suwon-414', '스카이존 414 대표 구역'),
  probeFromBlock('suwon-415', '스카이존 415 대표 구역'),
  probeFromBlock('suwon-416', '스카이존 416 대표 구역'),
  probeFromBlock('suwon-417', '스카이존 417 대표 구역'),
  probeFromBlock('suwon-418', '스카이존 418 대표 구역'),
  probeFromBlock('suwon-419', '스카이존 419 대표 구역'),
  probeFromBlock('suwon-420', '스카이존 420 대표 구역'),
  probeFromBlock('suwon-421', '스카이존 421 대표 구역'),
  probeFromBlock('suwon-422', '스카이존 422 대표 구역'),
  probeFromBlock('suwon-423', '스카이존 423 대표 구역'),
  probeFromBlock('suwon-424', '스카이존 424 대표 구역'),
  probeFromBlock('suwon-425', '스카이존 425 대표 구역'),
  probeFromBlock('suwon-426', '스카이존 426 대표 구역'),
  probeFromBlock('suwon-427', '스카이존 427 대표 구역'),
  probeFromBlock('suwon-428', '스카이존 428 대표 구역'),
  probeFromBlock('suwon-429', '스카이존 429 대표 구역'),
  probeFromBlock('suwon-430', '스카이존 430 대표 구역'),
  probeFromBlock('suwon-431', '스카이존 431 대표 구역'),
  probeFromBlock('suwon-432', '스카이존 432 대표 구역'),
]);

const SUWON_OUTFIELD_SPECIAL_LABEL_PROBES = deepFreeze([
  probeFromBlock('suwon-lf-grass', '3루 외야 잔디 자유석 대표 구역'),
  probeFromBlock('suwon-rf-grass', '1루 외야 잔디 자유석 대표 구역'),
  probeFromBlock('suwon-501-508', '외야테이블석 대표 구역'),
  probeFromBlock('suwon-7pub', '7 PUB 대표 구역'),
  probeFromBlock('suwon-green', '그린존 대표 구역'),
  probeFromBlock('suwon-k-live', 'K-라이브존 대표 구역'),
  probeFromBlock('suwon-hite-pub', '하이트펍존 대표 구역'),
  probeFromBlock('suwon-kids-camp', '키즈랜드 캠핑존 대표 구역'),
  probeFromBlock('suwon-wiz-garden', '위즈가든 대표 구역'),
]);

const SUWON_FIRSTFLOOR_EDGE_PROBES = deepFreeze([
  { id: 'suwon-109', point: [2648, 3220] as Point, note: '109/110 경계 109 안쪽 회귀 좌표' },
  { id: 'suwon-110', point: [2615, 3298] as Point, note: '109/110 경계 110 안쪽 회귀 좌표' },
  { id: 'suwon-115', point: [2355, 3715] as Point, note: '115/116 경계 115 안쪽 회귀 좌표' },
  { id: 'suwon-116', point: [2292, 3668] as Point, note: '115/116 경계 116 안쪽 회귀 좌표' },
  { id: 'suwon-118', point: [1920, 3735] as Point, note: '118/119 경계 118 안쪽 회귀 좌표' },
  { id: 'suwon-119', point: [1755, 3718] as Point, note: '118/119 경계 119 안쪽 회귀 좌표' },
  { id: 'suwon-123', point: [1540, 3370] as Point, note: '123/124 경계 123 안쪽 회귀 좌표' },
  { id: 'suwon-124', point: [1500, 3295] as Point, note: '123/124 경계 124 안쪽 회귀 좌표' },
  { id: 'suwon-125', point: [1455, 3210] as Point, note: '124/125 경계 125 안쪽 회귀 좌표' },
  { id: 'suwon-126', point: [1410, 3118] as Point, note: '125/126 경계 126 안쪽 회귀 좌표' },
  { id: 'suwon-127', point: [1350, 3045] as Point, note: '126/127 경계 127 안쪽 회귀 좌표' },
  { id: 'suwon-128', point: [1285, 2955] as Point, note: '127/128 경계 128 안쪽 회귀 좌표' },
  { id: 'suwon-129', point: [1235, 2870] as Point, note: '128/129 경계 129 안쪽 회귀 좌표' },
  { id: 'suwon-130', point: [1200, 2785] as Point, note: '130/131 경계 130 안쪽 회귀 좌표' },
  { id: 'suwon-131', point: [1150, 2700] as Point, note: '130/131 경계 131 안쪽 회귀 좌표' },
]);

const SUWON_OUTFIELD_SPECIAL_EDGE_PROBES = deepFreeze([
  { id: 'suwon-lf-grass', point: [1125, 2250] as Point, note: '3루 외야 잔디 자유석 좌측 하단 몸통 회귀 좌표' },
  { id: 'suwon-lf-grass', point: [1460, 2090] as Point, note: '3루 외야 잔디 자유석 중앙 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-lf-grass', point: [1538, 1900] as Point, note: '3루 외야 잔디 자유석 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-lf-grass', point: [1615, 1920] as Point, note: '3루 외야 잔디 자유석 상단 몸통 회귀 좌표' },
  { id: 'suwon-lf-grass', point: [1760, 1900] as Point, note: '3루 외야 잔디 자유석 우측 상단 몸통 회귀 좌표' },
  { id: 'suwon-lf-grass', point: [1775, 2045] as Point, note: '3루 외야 잔디 자유석 우측 안쪽 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2250, 1930] as Point, note: '1루 외야 잔디 자유석 상단 좌측 몸통 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2645, 1945] as Point, note: '1루 외야 잔디 자유석 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2705, 1960] as Point, note: '1루 외야 잔디 자유석 상단 중앙 곡선 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2795, 2010] as Point, note: '1루 외야 잔디 자유석 우측 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2585, 2085] as Point, note: '1루 외야 잔디 자유석 중앙 몸통 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2850, 2065] as Point, note: '1루 외야 잔디 자유석/그린존 공유 경계 안쪽 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2820, 2075] as Point, note: '1루 외야 잔디 자유석 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-rf-grass', point: [2700, 2180] as Point, note: '1루 외야 잔디 자유석/그린존 인접 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [2875, 1525] as Point, note: '외야테이블석 501 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [2825, 1600] as Point, note: '외야테이블석 501 좌측 상단 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [2880, 1630] as Point, note: '외야테이블석 501 내부 회귀 좌표' },
  { id: 'suwon-501-508', point: [3030, 1725] as Point, note: '외야테이블석 502 내부 회귀 좌표' },
  { id: 'suwon-501-508', point: [3150, 1800] as Point, note: '외야테이블석 503 내부 회귀 좌표' },
  { id: 'suwon-501-508', point: [3275, 1905] as Point, note: '외야테이블석 504 내부 회귀 좌표' },
  { id: 'suwon-501-508', point: [3190, 1970] as Point, note: '외야테이블석 505 하단 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [3385, 1890] as Point, note: '외야테이블석 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [3250, 2035] as Point, note: '외야테이블석 하단 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-501-508', point: [2910, 1540] as Point, note: '외야테이블석 501 상단 호 안쪽 회귀 좌표' },
  { id: 'suwon-7pub', point: [1915, 1860] as Point, note: '7 PUB/위즈테라스 좌측 회색 블록 안쪽 회귀 좌표' },
  { id: 'suwon-7pub', point: [2030, 1930] as Point, note: '7 PUB/위즈테라스 대표 회색 블록 회귀 좌표' },
  { id: 'suwon-7pub', point: [2150, 1845] as Point, note: '7 PUB/위즈테라스 우측 상단 회색 블록 안쪽 회귀 좌표' },
  { id: 'suwon-7pub', point: [2140, 2025] as Point, note: '7 PUB/위즈테라스 우측 하단 회색 블록 안쪽 회귀 좌표' },
  { id: 'suwon-7pub', point: [1870, 1825] as Point, note: '7 PUB/위즈테라스 좌측 상단 회색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-7pub', point: [2170, 2040] as Point, note: '7 PUB/위즈테라스 우측 하단 회색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [2875, 2160] as Point, note: '그린존 상단 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [2940, 2228] as Point, note: '그린존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [3000, 2265] as Point, note: '그린존 우측 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [3060, 2225] as Point, note: '그린존 우측 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [3040, 2215] as Point, note: '그린존 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [2960, 2340] as Point, note: '그린존 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [2860, 2310] as Point, note: '그린존 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [3000, 2305] as Point, note: '그린존 우측 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-green', point: [2888, 2355] as Point, note: '그린존 하단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2720, 1835] as Point, note: 'K-라이브존 좌측 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2725, 1785] as Point, note: 'K-라이브존 상단 좌측 공식 갈색 블록 회귀 좌표' },
  { id: 'suwon-k-live', point: [2685, 1840] as Point, note: 'K-라이브존 좌측 하단 공식 갈색 블록 회귀 좌표' },
  { id: 'suwon-k-live', point: [2750, 1840] as Point, note: 'K-라이브존 좌측 몸통 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2850, 1900] as Point, note: 'K-라이브존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2960, 1900] as Point, note: 'K-라이브존 우측 상단 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2920, 1950] as Point, note: 'K-라이브존 우측 하단 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2980, 1910] as Point, note: 'K-라이브존 우측 끝 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-k-live', point: [2930, 1970] as Point, note: 'K-라이브존 하단 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3260, 2240] as Point, note: '하이트펍존 상단 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3330, 2290] as Point, note: '하이트펍존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3345, 2390] as Point, note: '하이트펍존 하단 좌측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3385, 2400] as Point, note: '하이트펍존 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3375, 2425] as Point, note: '하이트펍존 하단 안쪽 회귀 좌표' },
  { id: 'suwon-hite-pub', point: [3390, 2450] as Point, note: '하이트펍존 하단 끝 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3370, 2180] as Point, note: '키즈랜드 캠핑존 상단 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3510, 2220] as Point, note: '키즈랜드 캠핑존 상단 우측 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3480, 2300] as Point, note: '키즈랜드 캠핑존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3550, 2360] as Point, note: '키즈랜드 캠핑존 우측 몸통 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3525, 2410] as Point, note: '키즈랜드 캠핑존 하단 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3565, 2470] as Point, note: '키즈랜드 캠핑존 우측 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3588, 2480] as Point, note: '키즈랜드 캠핑존 우측 하단 끝 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-kids-camp', point: [3454, 2452] as Point, note: '키즈랜드 캠핑존 하단 좌측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3643, 2350] as Point, note: '위즈가든 상단 좌측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3700, 2450] as Point, note: '위즈가든 상단 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3735, 2650] as Point, note: '위즈가든 우측 상단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3660, 2800] as Point, note: '위즈가든 중앙 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3600, 3150] as Point, note: '위즈가든 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3580, 3230] as Point, note: '위즈가든 우측 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3556, 3310] as Point, note: '위즈가든 하단 끝 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-wiz-garden', point: [3510, 3230] as Point, note: '위즈가든 하단 좌측 안쪽 회귀 좌표' },
]);

const SUWON_BC_CARD_EDGE_PROBES = deepFreeze([
  { id: 'suwon-116', point: [2292, 3668] as Point, note: '116 BC카드존 우측 상단 꺾임 안쪽 회귀 좌표' },
  { id: 'suwon-116', point: [2238, 3750] as Point, note: '116 BC카드존 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-116', point: [2188, 3730] as Point, note: '116/117 인접 116 안쪽 회귀 좌표' },
  { id: 'suwon-117', point: [2058, 3732] as Point, note: '117 BC카드존 상단 얕은 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-117', point: [1990, 3780] as Point, note: '117/118 인접 117 안쪽 회귀 좌표' },
  { id: 'suwon-117', point: [2132, 3780] as Point, note: '117/116 인접 117 안쪽 회귀 좌표' },
  { id: 'suwon-118', point: [1850, 3655] as Point, note: '118 BC카드존 좌측 상단 꺾임 안쪽 회귀 좌표' },
  { id: 'suwon-118', point: [1920, 3735] as Point, note: '118/117 인접 118 안쪽 회귀 좌표' },
  { id: 'suwon-118', point: [1950, 3775] as Point, note: '118 BC카드존 하단 곡선 안쪽 회귀 좌표' },
]);

const SUWON_FORMER_HIT_EXCEPTION_EDGE_PROBES = deepFreeze([
  { id: 'suwon-216', point: [2322, 3783] as Point, note: '216 상단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2280, 3977] as Point, note: '216 하단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-301', point: [3139, 2887] as Point, note: '301 스카이박스 인접 경계 안쪽 회귀 좌표' },
  { id: 'suwon-301', point: [3207, 2930] as Point, note: '301 우측 경계 안쪽 회귀 좌표' },
  { id: 'suwon-305', point: [2949, 3249] as Point, note: '305 상단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-305', point: [3029, 3298] as Point, note: '305 우측 경계 안쪽 회귀 좌표' },
  { id: 'suwon-309', point: [2754, 3593] as Point, note: '309 상단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-309', point: [2835, 3648] as Point, note: '309 우측 경계 안쪽 회귀 좌표' },
  { id: 'suwon-311', point: [2656, 3769] as Point, note: '311 상단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-311', point: [2737, 3826] as Point, note: '311 우측 경계 안쪽 회귀 좌표' },
  { id: 'suwon-312', point: [2604, 3859] as Point, note: '312 상단 경계 안쪽 회귀 좌표' },
  { id: 'suwon-312', point: [2680, 3914] as Point, note: '312 우측 경계 안쪽 회귀 좌표' },
]);

const SUWON_FIRSTBASE_2F_EDGE_PROBES = deepFreeze([
  { id: 'suwon-201', point: [3276, 2623] as Point, note: '201 스카이박스 인접 경계 안쪽 회귀 좌표' },
  { id: 'suwon-201', point: [3143, 2604] as Point, note: '201 내야지정석 좌측 경계 안쪽 회귀 좌표' },
  { id: 'suwon-202', point: [3110, 2678] as Point, note: '202 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-202', point: [3238, 2768] as Point, note: '202 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-203', point: [3060, 2765] as Point, note: '203 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-203', point: [3210, 2868] as Point, note: '203 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-204', point: [3020, 2888] as Point, note: '204/205 경계 204 안쪽 회귀 좌표' },
  { id: 'suwon-205', point: [2969, 2918] as Point, note: '204/205 경계 205 안쪽 회귀 좌표' },
  { id: 'suwon-205', point: [3020, 2950] as Point, note: '205 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-206', point: [2890, 3020] as Point, note: '206 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-206', point: [2965, 3020] as Point, note: '206 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-207', point: [2825, 3120] as Point, note: '207 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-207', point: [2895, 3125] as Point, note: '207 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-208', point: [2810, 3190] as Point, note: '208 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-208', point: [2860, 3220] as Point, note: '208 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-209', point: [2760, 3275] as Point, note: '209 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-209', point: [2820, 3310] as Point, note: '209 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-210', point: [2700, 3340] as Point, note: '210 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-210', point: [2760, 3400] as Point, note: '210 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-211', point: [2645, 3465] as Point, note: '211 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-211', point: [2720, 3480] as Point, note: '211 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-212', point: [2605, 3550] as Point, note: '212 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-212', point: [2675, 3560] as Point, note: '212 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-213', point: [2555, 3640] as Point, note: '213 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-213', point: [2625, 3660] as Point, note: '213 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-214', point: [2505, 3730] as Point, note: '214 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-214', point: [2580, 3740] as Point, note: '214 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-215', point: [2460, 3820] as Point, note: '215 좌측 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-215', point: [2520, 3840] as Point, note: '215 우측 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-215', point: [2470, 3845] as Point, note: '215/216 경계 215 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2388, 3860] as Point, note: '215/216 경계 216 안쪽 회귀 좌표' },
]);

const SUWON_THIRDBASE_2F_EDGE_PROBES = deepFreeze([
  { id: 'suwon-219', point: [1585, 3815] as Point, note: '219 하단 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-219', point: [1640, 3820] as Point, note: '219/218 인접 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-220', point: [1530, 3730] as Point, note: '220 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-220', point: [1600, 3730] as Point, note: '220 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-221', point: [1485, 3640] as Point, note: '221 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-221', point: [1545, 3650] as Point, note: '221 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-222', point: [1435, 3555] as Point, note: '222 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-222', point: [1500, 3560] as Point, note: '222 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-223', point: [1390, 3468] as Point, note: '223 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-223', point: [1458, 3470] as Point, note: '223 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-224', point: [1325, 3395] as Point, note: '224 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-224', point: [1390, 3405] as Point, note: '224 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-225', point: [1275, 3305] as Point, note: '225 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-225', point: [1340, 3310] as Point, note: '225 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-226', point: [1225, 3210] as Point, note: '226 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-226', point: [1295, 3210] as Point, note: '226 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-227', point: [1180, 3125] as Point, note: '227 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-227', point: [1245, 3130] as Point, note: '227 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-228', point: [1130, 3030] as Point, note: '228 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-228', point: [1200, 3030] as Point, note: '228 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-229', point: [1085, 2935] as Point, note: '229 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-229', point: [1150, 2940] as Point, note: '229 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-230', point: [1045, 2860] as Point, note: '230 좌측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-230', point: [1110, 2865] as Point, note: '230 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-231', point: [920, 2835] as Point, note: '231 확장된 좌측 공식 회색 slab 안쪽 회귀 좌표' },
  { id: 'suwon-231', point: [1050, 2765] as Point, note: '231 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-232', point: [900, 2730] as Point, note: '232 확장된 좌측 공식 회색 slab 안쪽 회귀 좌표' },
  { id: 'suwon-232', point: [1020, 2670] as Point, note: '232 우측 공식 구분선 안쪽 회귀 좌표' },
  { id: 'suwon-233', point: [850, 2635] as Point, note: '233 확장된 좌측 공식 회색 slab 안쪽 회귀 좌표' },
  { id: 'suwon-233', point: [970, 2585] as Point, note: '233 우측 공식 구분선 안쪽 회귀 좌표' },
]);

const SUWON_CENTER_BOTTOM_EDGE_PROBES = deepFreeze([
  { id: 'suwon-genie', point: [2005, 3830] as Point, note: '지니존 중앙 텍스트 띠 안쪽 회귀 좌표' },
  { id: 'suwon-genie', point: [2184, 3850] as Point, note: '지니존/216 경계 지니존 안쪽 회귀 좌표' },
  { id: 'suwon-217', point: [2005, 3940] as Point, note: '지니존/217 경계 217 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2335, 3745] as Point, note: '216 상단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2240, 3900] as Point, note: '216/217 경계 216 안쪽 회귀 좌표' },
  { id: 'suwon-217', point: [2185, 3950] as Point, note: '216/217 경계 217 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2400, 3970] as Point, note: '216 하단 곡선 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2450, 3930] as Point, note: '216 우측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-216', point: [2296, 4010] as Point, note: '216 하단 좌측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-218', point: [1840, 3940] as Point, note: '217/218 경계 218 안쪽 회귀 좌표' },
  { id: 'suwon-218', point: [1818, 3775] as Point, note: '218 상단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-218', point: [1662, 3930] as Point, note: '218 좌측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-218', point: [1858, 4025] as Point, note: '218 하단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-217', point: [1950, 3960] as Point, note: '217/218 경계 217 안쪽 회귀 좌표' },
  { id: 'suwon-217', point: [2103, 4045] as Point, note: '217 하단 우측 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-217', point: [2058, 4040] as Point, note: '217 하단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-218', point: [1780, 4000] as Point, note: '218 하단 공식 녹색 경계 안쪽 회귀 좌표' },
  { id: 'suwon-313', point: [2549, 4085] as Point, note: '313 우측 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-313', point: [2380, 4170] as Point, note: '313 하단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-314', point: [2130, 4240] as Point, note: '314 하단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-315', point: [1970, 4240] as Point, note: '315 하단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-315', point: [1818, 4080] as Point, note: '315 좌측 상단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-316', point: [1619, 4130] as Point, note: '316 좌측 하단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-316', point: [1724, 4188] as Point, note: '316 하단 공식 핑크 경계 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-center', point: [2325, 4198] as Point, note: '중앙 휠체어석/314 경계 휠체어 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-center', point: [2360, 4225] as Point, note: '중앙 휠체어석 우측 하단 핀 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-center', point: [2320, 4240] as Point, note: '중앙 휠체어석 좌측 하단 핀 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-3b', point: [1775, 4188] as Point, note: '3루 휠체어석/315 경계 휠체어 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-3b', point: [1820, 4225] as Point, note: '3루 휠체어석 우측 하단 핀 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-3b', point: [1790, 4240] as Point, note: '3루 휠체어석 좌측 하단 핀 안쪽 회귀 좌표' },
  { id: 'suwon-315', point: [1850, 4150] as Point, note: '3루 휠체어석/315 경계 315 안쪽 회귀 좌표' },
  { id: 'suwon-wheel-1b', point: [2828, 4124] as Point, note: '1루 휠체어석 E/V 핀 중심 회귀 좌표' },
  { id: 'suwon-wheel-1b', point: [2830, 4140] as Point, note: '1루 휠체어석 아이콘 내부 회귀 좌표' },
]);

const SUWON_HIGHFIVE_EDGE_PROBES = deepFreeze([
  { id: 'suwon-3b-highfive', point: [1400, 2860] as Point, note: '3루 하이파이브존 상단 안쪽 회귀 좌표' },
  { id: 'suwon-3b-highfive', point: [1500, 3040] as Point, note: '3루 하이파이브존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-3b-highfive', point: [1600, 3220] as Point, note: '3루 하이파이브존 하단 안쪽 회귀 좌표' },
  { id: 'suwon-3b-highfive', point: [1588, 3265] as Point, note: '3루 하이파이브존 하단 공식 색상 띠 안쪽 회귀 좌표' },
  { id: 'suwon-1b-highfive', point: [2700, 2860] as Point, note: '1루 하이파이브존 상단 안쪽 회귀 좌표' },
  { id: 'suwon-1b-highfive', point: [2600, 3040] as Point, note: '1루 하이파이브존 중앙 안쪽 회귀 좌표' },
  { id: 'suwon-1b-highfive', point: [2520, 3220] as Point, note: '1루 하이파이브존 하단 안쪽 회귀 좌표' },
  { id: 'suwon-1b-highfive', point: [2492, 3268] as Point, note: '1루 하이파이브존 하단 공식 색상 띠 안쪽 회귀 좌표' },
]);

const SUWON_THIRDFLOOR_EDGE_PROBES = deepFreeze([
  { id: 'suwon-301', point: [3168, 2965] as Point, note: '301/302 경계 301 안쪽 회귀 좌표' },
  { id: 'suwon-302', point: [3128, 3000] as Point, note: '301/302 경계 302 안쪽 회귀 좌표' },
  { id: 'suwon-303', point: [3066, 3088] as Point, note: '302/303 경계 303 안쪽 회귀 좌표' },
  { id: 'suwon-304', point: [3028, 3188] as Point, note: '303/304 경계 304 안쪽 회귀 좌표' },
  { id: 'suwon-306', point: [2920, 3350] as Point, note: '305/306 경계 306 안쪽 회귀 좌표' },
  { id: 'suwon-307', point: [2860, 3425] as Point, note: '306/307 경계 307 안쪽 회귀 좌표' },
  { id: 'suwon-308', point: [2805, 3508] as Point, note: '307/308 경계 308 안쪽 회귀 좌표' },
  { id: 'suwon-310', point: [2728, 3770] as Point, note: '309/310 경계 310 안쪽 회귀 좌표' },
  { id: 'suwon-313', point: [2488, 3990] as Point, note: '312/313 경계 313 안쪽 회귀 좌표' },
  { id: 'suwon-314', point: [2265, 4120] as Point, note: '313/314 경계 314 안쪽 회귀 좌표' },
  { id: 'suwon-315', point: [2015, 4160] as Point, note: '314/315 경계 315 안쪽 회귀 좌표' },
  { id: 'suwon-316', point: [1720, 4070] as Point, note: '315/316 경계 316 안쪽 회귀 좌표' },
  { id: 'suwon-317', point: [1535, 3905] as Point, note: '316/317 경계 317 안쪽 회귀 좌표' },
  { id: 'suwon-318', point: [1420, 3810] as Point, note: '317/318 경계 318 안쪽 회귀 좌표' },
  { id: 'suwon-319', point: [1365, 3735] as Point, note: '318/319 경계 319 안쪽 회귀 좌표' },
  { id: 'suwon-320', point: [1315, 3650] as Point, note: '319/320 경계 320 안쪽 회귀 좌표' },
  { id: 'suwon-321', point: [1265, 3560] as Point, note: '320/321 경계 321 안쪽 회귀 좌표' },
  { id: 'suwon-322', point: [1215, 3470] as Point, note: '321/322 경계 322 안쪽 회귀 좌표' },
  { id: 'suwon-323', point: [1160, 3387] as Point, note: '322/323 경계 323 안쪽 회귀 좌표' },
  { id: 'suwon-324', point: [1115, 3300] as Point, note: '323/324 경계 324 안쪽 회귀 좌표' },
  { id: 'suwon-325', point: [1068, 3215] as Point, note: '324/325 경계 325 안쪽 회귀 좌표' },
  { id: 'suwon-326', point: [1025, 3125] as Point, note: '325/326 경계 326 안쪽 회귀 좌표' },
  { id: 'suwon-327', point: [980, 3030] as Point, note: '326/327 경계 327 안쪽 회귀 좌표' },
  { id: 'suwon-328', point: [940, 2965] as Point, note: '327/328 경계 328 안쪽 회귀 좌표' },
]);

const SUWON_SKYBOX_EDGE_PROBES = deepFreeze([
  { id: 'suwon-sb1', point: [3492, 2652] as Point, note: '스카이박스 01/201 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb2', point: [3443, 2747] as Point, note: '스카이박스 02/201 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb4', point: [3389, 2960] as Point, note: '스카이박스 04/301 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb8', point: [3210, 3330] as Point, note: '스카이박스 08/307 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb16', point: [2818, 4040] as Point, note: '스카이박스 16/312 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb17', point: [2740, 4120] as Point, note: '스카이박스 17 중앙 곡선 visual hit 회귀 좌표' },
  { id: 'suwon-sb18', point: [2675, 4230] as Point, note: '스카이박스 18 중앙 곡선 visual hit 회귀 좌표' },
  { id: 'suwon-sb22', point: [2295, 4488] as Point, note: '스카이박스 22 중앙 하단 visual hit 회귀 좌표' },
  { id: 'suwon-sb23', point: [1788, 4473] as Point, note: '스카이박스 23 중앙 하단 visual hit 회귀 좌표' },
  { id: 'suwon-sb28', point: [1295, 4038] as Point, note: '스카이박스 28/317 인접 visual hit 회귀 좌표' },
  { id: 'suwon-sb35', point: [944, 3405] as Point, note: '스카이박스 35/432 인접 visual hit 회귀 좌표' },
]);

const SUWON_SKYZONE_EDGE_PROBES = deepFreeze([
  { id: 'suwon-401', point: [3322, 3526] as Point, note: '401/SB9 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-402', point: [3246, 3674] as Point, note: '402/SB11 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-403', point: [3180, 3800] as Point, note: '403/SB12 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-404', point: [3106, 3942] as Point, note: '404/SB14 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-405', point: [3042, 4067] as Point, note: '405/SB15 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-406', point: [2970, 4196] as Point, note: '406/SB16 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-407', point: [2873, 4343] as Point, note: '407/SB18 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-408', point: [2777, 4460] as Point, note: '408/SB19 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-409', point: [2645, 4561] as Point, note: '409/SB20 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-410', point: [2496, 4637] as Point, note: '410/SB21 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-411', point: [2338, 4688] as Point, note: '411/SB22 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-412', point: [2184, 4717] as Point, note: '412/SB22 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-413', point: [1943, 4718] as Point, note: '413/SB23 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-414', point: [1824, 4705] as Point, note: '414/SB23 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-415', point: [1710, 4673] as Point, note: '415/SB23 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-416', point: [1573, 4615] as Point, note: '416/SB24 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-417', point: [1445, 4537] as Point, note: '417/SB25 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-418', point: [1365, 4459] as Point, note: '418/SB25 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-419', point: [1271, 4329] as Point, note: '419/SB26 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-420', point: [1188, 4238] as Point, note: '420/SB27 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-421', point: [1142, 4146] as Point, note: '421/SB28 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-422', point: [1093, 4056] as Point, note: '422/SB29 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-423', point: [1041, 3965] as Point, note: '423/SB30 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-424', point: [994, 3873] as Point, note: '424/SB31 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-425', point: [943, 3782] as Point, note: '425/SB32 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-426', point: [894, 3686] as Point, note: '426/SB33 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-427', point: [843, 3592] as Point, note: '427/SB34 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-428', point: [791, 3499] as Point, note: '428/SB35 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-429', point: [750, 3419] as Point, note: '429/SB35 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-430', point: [707, 3341] as Point, note: '430/SB35 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-431', point: [630, 3245] as Point, note: '431/SB35 인접 스카이존 안쪽 회귀 좌표' },
  { id: 'suwon-432', point: [580, 3100] as Point, note: '432/SB35 인접 스카이존 안쪽 회귀 좌표' },
]);

export const SUWON_ALIGNMENT_PROBES = deepFreeze([
  ...SUWON_FIRSTFLOOR_LABEL_PROBES,
  ...SUWON_FIRSTBASE_2F_LABEL_PROBES,
  { id: 'suwon-216', point: [2325, 3887] as Point, note: '2층 중앙 우측 곡선 경계 재추적 구역' },
  probeFromBlock('suwon-217', '2층 중앙 하단 곡선 경계 재추적 구역'),
  probeFromBlock('suwon-218', '2층 중앙 좌측 곡선 경계 재추적 구역'),
  ...SUWON_THIRDBASE_2F_LABEL_PROBES,
  probeFromBlock('suwon-301', '3층 1루 측 재추적 시작 블록'),
  probeFromBlock('suwon-311', '3층 1루 중앙 중첩 회귀 구역'),
  probeFromBlock('suwon-312', '3층 1루 중앙 중첩 회귀 구역'),
  probeFromBlock('suwon-313', '3층 중앙 진입 회귀 구역'),
  probeFromBlock('suwon-315', '3층 중앙지정석 대표 구역'),
  probeFromBlock('suwon-328', '3층 3루 측 재추적 시작 블록'),
  ...SUWON_SKYZONE_LABEL_PROBES,
  ...SUWON_SKYBOX_LABEL_PROBES,
  probeFromBlock('suwon-genie', '중앙 프리미엄 구역'),
  probeFromBlock('suwon-3b-highfive', '3루 하이파이브존 대표 구역'),
  probeFromBlock('suwon-1b-highfive', '1루 하이파이브존 대표 구역'),
  ...SUWON_OUTFIELD_SPECIAL_LABEL_PROBES,
  probeFromBlock('suwon-wheel-center', '중앙 휠체어석'),
  probeFromBlock('suwon-wheel-1b', '1루 휠체어석'),
  probeFromBlock('suwon-wheel-3b', '3루 휠체어석'),
  ...SUWON_FIRSTFLOOR_EDGE_PROBES,
  ...SUWON_FORMER_HIT_EXCEPTION_EDGE_PROBES,
  ...SUWON_BC_CARD_EDGE_PROBES,
  ...SUWON_FIRSTBASE_2F_EDGE_PROBES,
  ...SUWON_THIRDBASE_2F_EDGE_PROBES,
  ...SUWON_CENTER_BOTTOM_EDGE_PROBES,
  ...SUWON_HIGHFIVE_EDGE_PROBES,
  ...SUWON_THIRDFLOOR_EDGE_PROBES,
  ...SUWON_SKYBOX_EDGE_PROBES,
  ...SUWON_SKYZONE_EDGE_PROBES,
  ...SUWON_OUTFIELD_SPECIAL_EDGE_PROBES,
]);

export const SUWON_BROWSER_QA_PROBES = deepFreeze([
  { id: 'suwon-101', point: [3045, 2510] as Point, note: 'Playwright 대표 좌표: 101 내야지정석' },
  { id: 'suwon-102', point: [2997, 2596] as Point, note: 'Playwright 대표 좌표: 102 내야지정석' },
  { id: 'suwon-103', point: [2949, 2682] as Point, note: 'Playwright 대표 좌표: 103 내야지정석' },
  { id: 'suwon-104', point: [2901, 2769] as Point, note: 'Playwright 대표 좌표: 104 내야지정석' },
  { id: 'suwon-105', point: [2853, 2855] as Point, note: 'Playwright 대표 좌표: 105 내야지정석' },
  { id: 'suwon-106', point: [2806, 2941] as Point, note: 'Playwright 대표 좌표: 106 내야지정석' },
  { id: 'suwon-107', point: [2757, 3028] as Point, note: 'Playwright 대표 좌표: 107 1루 응원지정석' },
  { id: 'suwon-108', point: [2709, 3115] as Point, note: 'Playwright 대표 좌표: 108 1루 응원지정석' },
  { id: 'suwon-109', point: [2661, 3201] as Point, note: 'Playwright 대표 좌표: 109 1루 응원지정석' },
  { id: 'suwon-110', point: [2613, 3276] as Point, note: 'Playwright 대표 좌표: 110 1루 응원지정석' },
  { id: 'suwon-111', point: [2546, 3367] as Point, note: 'Playwright 대표 좌표: 111 내야지정석' },
  { id: 'suwon-112', point: [2504, 3454] as Point, note: 'Playwright 대표 좌표: 112 내야지정석' },
  { id: 'suwon-113', point: [2456, 3541] as Point, note: 'Playwright 대표 좌표: 113 내야지정석' },
  { id: 'suwon-114', point: [2407, 3628] as Point, note: 'Playwright 대표 좌표: 114 중앙지정석' },
  { id: 'suwon-115', point: [2365, 3709] as Point, note: 'Playwright 대표 좌표: 115 중앙지정석' },
  { id: 'suwon-116', point: [2230, 3700] as Point, note: 'Playwright 대표 좌표: 116 중앙지정석' },
  { id: 'suwon-117', point: [2058, 3766] as Point, note: 'Playwright 대표 좌표: 117 중앙지정석' },
  { id: 'suwon-118', point: [1885, 3700] as Point, note: 'Playwright 대표 좌표: 118 중앙지정석' },
  { id: 'suwon-119', point: [1750, 3706] as Point, note: 'Playwright 대표 좌표: 119 중앙지정석' },
  { id: 'suwon-120', point: [1708, 3627] as Point, note: 'Playwright 대표 좌표: 120 중앙지정석' },
  { id: 'suwon-121', point: [1660, 3540] as Point, note: 'Playwright 대표 좌표: 121 중앙지정석' },
  { id: 'suwon-122', point: [1612, 3453] as Point, note: 'Playwright 대표 좌표: 122 중앙지정석' },
  { id: 'suwon-123', point: [1564, 3365] as Point, note: 'Playwright 대표 좌표: 123 중앙지정석' },
  { id: 'suwon-124', point: [1516, 3279] as Point, note: 'Playwright 대표 좌표: 124 내야지정석' },
  { id: 'suwon-125', point: [1467, 3192] as Point, note: 'Playwright 대표 좌표: 125 내야지정석' },
  { id: 'suwon-126', point: [1422, 3105] as Point, note: 'Playwright 대표 좌표: 126 내야지정석' },
  { id: 'suwon-127', point: [1359, 3023] as Point, note: 'Playwright 대표 좌표: 127 3루 응원지정석' },
  { id: 'suwon-128', point: [1309, 2941] as Point, note: 'Playwright 대표 좌표: 128 3루 응원지정석' },
  { id: 'suwon-129', point: [1261, 2854] as Point, note: 'Playwright 대표 좌표: 129 3루 응원지정석' },
  { id: 'suwon-130', point: [1213, 2768] as Point, note: 'Playwright 대표 좌표: 130 3루 응원지정석' },
  { id: 'suwon-131', point: [1166, 2682] as Point, note: 'Playwright 대표 좌표: 131 내야지정석' },
  { id: 'suwon-132', point: [1118, 2596] as Point, note: 'Playwright 대표 좌표: 132 내야지정석' },
  { id: 'suwon-133', point: [1070, 2510] as Point, note: 'Playwright 대표 좌표: 133 내야지정석' },
  { id: 'suwon-201', point: [3210, 2618] as Point, note: 'Playwright 대표 좌표: 201 내야지정석' },
  { id: 'suwon-202', point: [3173, 2710] as Point, note: 'Playwright 대표 좌표: 202 내야지정석' },
  { id: 'suwon-203', point: [3133, 2802] as Point, note: 'Playwright 대표 좌표: 203 내야지정석' },
  { id: 'suwon-204', point: [3031, 2851] as Point, note: 'Playwright 대표 좌표: 204 내야지정석' },
  { id: 'suwon-205', point: [2987, 2938] as Point, note: 'Playwright 대표 좌표: 205 내야지정석' },
  { id: 'suwon-206', point: [2922, 3015] as Point, note: 'Playwright 대표 좌표: 206 내야지정석' },
  { id: 'suwon-207', point: [2872, 3104] as Point, note: 'Playwright 대표 좌표: 207 내야지정석' },
  { id: 'suwon-208', point: [2832, 3187] as Point, note: 'Playwright 대표 좌표: 208 내야지정석' },
  { id: 'suwon-209', point: [2777, 3279] as Point, note: 'Playwright 대표 좌표: 209 내야지정석' },
  { id: 'suwon-210', point: [2738, 3368] as Point, note: 'Playwright 대표 좌표: 210 내야지정석' },
  { id: 'suwon-211', point: [2691, 3460] as Point, note: 'Playwright 대표 좌표: 211 내야지정석' },
  { id: 'suwon-212', point: [2641, 3548] as Point, note: 'Playwright 대표 좌표: 212 내야지정석' },
  { id: 'suwon-213', point: [2597, 3637] as Point, note: 'Playwright 대표 좌표: 213 내야지정석' },
  { id: 'suwon-214', point: [2544, 3721] as Point, note: 'Playwright 대표 좌표: 214 내야지정석' },
  { id: 'suwon-215', point: [2492, 3813] as Point, note: 'Playwright 대표 좌표: 215 내야지정석' },
  { id: 'suwon-216', point: [2325, 3887] as Point, note: 'Playwright 대표 좌표: 216 중앙지정석' },
  { id: 'suwon-217', point: [2058, 3954] as Point, note: 'Playwright 대표 좌표: 217 중앙지정석' },
  { id: 'suwon-218', point: [1790, 3888] as Point, note: 'Playwright 대표 좌표: 218 중앙지정석' },
  { id: 'suwon-219', point: [1620, 3817] as Point, note: 'Playwright 대표 좌표: 219 중앙지정석' },
  { id: 'suwon-220', point: [1569, 3724] as Point, note: 'Playwright 대표 좌표: 220 중앙지정석' },
  { id: 'suwon-221', point: [1520, 3639] as Point, note: 'Playwright 대표 좌표: 221 중앙지정석' },
  { id: 'suwon-222', point: [1472, 3549] as Point, note: 'Playwright 대표 좌표: 222 중앙지정석' },
  { id: 'suwon-223', point: [1424, 3461] as Point, note: 'Playwright 대표 좌표: 223 중앙지정석' },
  { id: 'suwon-224', point: [1360, 3395] as Point, note: 'Playwright 대표 좌표: 224 내야지정석' },
  { id: 'suwon-225', point: [1310, 3300] as Point, note: 'Playwright 대표 좌표: 225 내야지정석' },
  { id: 'suwon-226', point: [1260, 3205] as Point, note: 'Playwright 대표 좌표: 226 내야지정석' },
  { id: 'suwon-227', point: [1210, 3115] as Point, note: 'Playwright 대표 좌표: 227 3루 응원지정석' },
  { id: 'suwon-228', point: [1165, 3020] as Point, note: 'Playwright 대표 좌표: 228 3루 응원지정석' },
  { id: 'suwon-229', point: [1110, 2930] as Point, note: 'Playwright 대표 좌표: 229 3루 응원지정석' },
  { id: 'suwon-230', point: [1075, 2860] as Point, note: 'Playwright 대표 좌표: 230 3루 응원지정석' },
  { id: 'suwon-231', point: [1040, 2780] as Point, note: 'Playwright 대표 좌표: 231 내야지정석' },
  { id: 'suwon-232', point: [1005, 2690] as Point, note: 'Playwright 대표 좌표: 232 내야지정석' },
  { id: 'suwon-233', point: [930, 2600] as Point, note: 'Playwright 대표 좌표: 233 내야지정석' },
  { id: 'suwon-301', point: [3157, 2931] as Point, note: 'Playwright 대표 좌표: 301 내야일반석' },
  { id: 'suwon-302', point: [3115, 3018] as Point, note: 'Playwright 대표 좌표: 302 내야일반석' },
  { id: 'suwon-303', point: [3080, 3118] as Point, note: 'Playwright 대표 좌표: 303 내야일반석' },
  { id: 'suwon-304', point: [3031, 3206] as Point, note: 'Playwright 대표 좌표: 304 내야일반석' },
  { id: 'suwon-305', point: [2976, 3295] as Point, note: 'Playwright 대표 좌표: 305 내야일반석' },
  { id: 'suwon-306', point: [2933, 3382] as Point, note: 'Playwright 대표 좌표: 306 내야일반석' },
  { id: 'suwon-307', point: [2880, 3465] as Point, note: 'Playwright 대표 좌표: 307 내야일반석' },
  { id: 'suwon-308', point: [2827, 3556] as Point, note: 'Playwright 대표 좌표: 308 내야일반석' },
  { id: 'suwon-309', point: [2779, 3644] as Point, note: 'Playwright 대표 좌표: 309 내야일반석' },
  { id: 'suwon-310', point: [2730, 3728] as Point, note: 'Playwright 대표 좌표: 310 내야일반석' },
  { id: 'suwon-311', point: [2680, 3821] as Point, note: 'Playwright 대표 좌표: 311 내야일반석' },
  { id: 'suwon-312', point: [2621, 3919] as Point, note: 'Playwright 대표 좌표: 312 내야일반석' },
  { id: 'suwon-313', point: [2454, 4068] as Point, note: 'Playwright 대표 좌표: 313 내야일반석' },
  { id: 'suwon-314', point: [2201, 4167] as Point, note: 'Playwright 대표 좌표: 314 중앙지정석' },
  { id: 'suwon-315', point: [1917, 4164] as Point, note: 'Playwright 대표 좌표: 315 중앙지정석' },
  { id: 'suwon-316', point: [1655, 4074] as Point, note: 'Playwright 대표 좌표: 316 중앙지정석' },
  { id: 'suwon-317', point: [1498, 3923] as Point, note: 'Playwright 대표 좌표: 317 중앙지정석' },
  { id: 'suwon-318', point: [1438, 3821] as Point, note: 'Playwright 대표 좌표: 318 중앙지정석' },
  { id: 'suwon-319', point: [1388, 3732] as Point, note: 'Playwright 대표 좌표: 319 중앙지정석' },
  { id: 'suwon-320', point: [1334, 3642] as Point, note: 'Playwright 대표 좌표: 320 내야일반석' },
  { id: 'suwon-321', point: [1287, 3554] as Point, note: 'Playwright 대표 좌표: 321 내야일반석' },
  { id: 'suwon-322', point: [1239, 3468] as Point, note: 'Playwright 대표 좌표: 322 내야일반석' },
  { id: 'suwon-323', point: [1180, 3384] as Point, note: 'Playwright 대표 좌표: 323 내야일반석' },
  { id: 'suwon-324', point: [1131, 3297] as Point, note: 'Playwright 대표 좌표: 324 내야일반석' },
  { id: 'suwon-325', point: [1083, 3208] as Point, note: 'Playwright 대표 좌표: 325 내야일반석' },
  { id: 'suwon-326', point: [1042, 3116] as Point, note: 'Playwright 대표 좌표: 326 내야일반석' },
  { id: 'suwon-327', point: [1004, 3023] as Point, note: 'Playwright 대표 좌표: 327 내야일반석' },
  { id: 'suwon-328', point: [960, 2930] as Point, note: 'Playwright 대표 좌표: 328 내야일반석' },
  { id: 'suwon-401', point: [3359, 3555] as Point, note: 'Playwright 대표 좌표: 401 스카이존' },
  { id: 'suwon-402', point: [3290, 3697] as Point, note: 'Playwright 대표 좌표: 402 스카이존' },
  { id: 'suwon-403', point: [3219, 3833] as Point, note: 'Playwright 대표 좌표: 403 스카이존' },
  { id: 'suwon-404', point: [3152, 3966] as Point, note: 'Playwright 대표 좌표: 404 스카이존' },
  { id: 'suwon-405', point: [3084, 4099] as Point, note: 'Playwright 대표 좌표: 405 스카이존' },
  { id: 'suwon-406', point: [3007, 4238] as Point, note: 'Playwright 대표 좌표: 406 스카이존' },
  { id: 'suwon-407', point: [2921, 4370] as Point, note: 'Playwright 대표 좌표: 407 스카이존' },
  { id: 'suwon-408', point: [2816, 4495] as Point, note: 'Playwright 대표 좌표: 408 스카이존' },
  { id: 'suwon-409', point: [2675, 4603] as Point, note: 'Playwright 대표 좌표: 409 스카이존' },
  { id: 'suwon-410', point: [2516, 4686] as Point, note: 'Playwright 대표 좌표: 410 스카이존' },
  { id: 'suwon-411', point: [2347, 4740] as Point, note: 'Playwright 대표 좌표: 411 스카이존' },
  { id: 'suwon-412', point: [2155, 4777] as Point, note: 'Playwright 대표 좌표: 412 스카이존' },
  { id: 'suwon-413', point: [1984, 4782] as Point, note: 'Playwright 대표 좌표: 413 스카이존' },
  { id: 'suwon-414', point: [1835, 4765] as Point, note: 'Playwright 대표 좌표: 414 스카이존' },
  { id: 'suwon-415', point: [1692, 4725] as Point, note: 'Playwright 대표 좌표: 415 스카이존' },
  { id: 'suwon-416', point: [1554, 4666] as Point, note: 'Playwright 대표 좌표: 416 스카이존' },
  { id: 'suwon-417', point: [1424, 4588] as Point, note: 'Playwright 대표 좌표: 417 스카이존' },
  { id: 'suwon-418', point: [1324, 4490] as Point, note: 'Playwright 대표 좌표: 418 스카이존' },
  { id: 'suwon-419', point: [1232, 4351] as Point, note: 'Playwright 대표 좌표: 419 스카이존' },
  { id: 'suwon-420', point: [1148, 4264] as Point, note: 'Playwright 대표 좌표: 420 스카이존' },
  { id: 'suwon-421', point: [1104, 4175] as Point, note: 'Playwright 대표 좌표: 421 스카이존' },
  { id: 'suwon-422', point: [1055, 4085] as Point, note: 'Playwright 대표 좌표: 422 스카이존' },
  { id: 'suwon-423', point: [1003, 3994] as Point, note: 'Playwright 대표 좌표: 423 스카이존' },
  { id: 'suwon-424', point: [956, 3902] as Point, note: 'Playwright 대표 좌표: 424 스카이존' },
  { id: 'suwon-425', point: [905, 3811] as Point, note: 'Playwright 대표 좌표: 425 스카이존' },
  { id: 'suwon-426', point: [856, 3715] as Point, note: 'Playwright 대표 좌표: 426 스카이존' },
  { id: 'suwon-427', point: [805, 3620] as Point, note: 'Playwright 대표 좌표: 427 스카이존' },
  { id: 'suwon-428', point: [752, 3526] as Point, note: 'Playwright 대표 좌표: 428 스카이존' },
  { id: 'suwon-429', point: [701, 3426] as Point, note: 'Playwright 대표 좌표: 429 스카이존' },
  { id: 'suwon-430', point: [648, 3328] as Point, note: 'Playwright 대표 좌표: 430 스카이존' },
  { id: 'suwon-431', point: [595, 3229] as Point, note: 'Playwright 대표 좌표: 431 스카이존' },
  { id: 'suwon-432', point: [543, 3132] as Point, note: 'Playwright 대표 좌표: 432 스카이존' },
  { id: 'suwon-sb1', point: [3483, 2643] as Point, note: 'Playwright 대표 좌표: 스카이박스 01' },
  { id: 'suwon-sb2', point: [3455, 2744] as Point, note: 'Playwright 대표 좌표: 스카이박스 02' },
  { id: 'suwon-sb3', point: [3426, 2847] as Point, note: 'Playwright 대표 좌표: 스카이박스 03' },
  { id: 'suwon-sb4', point: [3397, 2954] as Point, note: 'Playwright 대표 좌표: 스카이박스 04' },
  { id: 'suwon-sb5', point: [3358, 3051] as Point, note: 'Playwright 대표 좌표: 스카이박스 05' },
  { id: 'suwon-sb6', point: [3311, 3139] as Point, note: 'Playwright 대표 좌표: 스카이박스 06' },
  { id: 'suwon-sb7', point: [3263, 3227] as Point, note: 'Playwright 대표 좌표: 스카이박스 07' },
  { id: 'suwon-sb8', point: [3216, 3316] as Point, note: 'Playwright 대표 좌표: 스카이박스 08' },
  { id: 'suwon-sb9', point: [3172, 3411] as Point, note: 'Playwright 대표 좌표: 스카이박스 09' },
  { id: 'suwon-sb10', point: [3118, 3492] as Point, note: 'Playwright 대표 좌표: 스카이박스 10' },
  { id: 'suwon-sb11', point: [3070, 3580] as Point, note: 'Playwright 대표 좌표: 스카이박스 11' },
  { id: 'suwon-sb12', point: [3022, 3668] as Point, note: 'Playwright 대표 좌표: 스카이박스 12' },
  { id: 'suwon-sb13', point: [2973, 3758] as Point, note: 'Playwright 대표 좌표: 스카이박스 13' },
  { id: 'suwon-sb14', point: [2924, 3846] as Point, note: 'Playwright 대표 좌표: 스카이박스 14' },
  { id: 'suwon-sb15', point: [2874, 3938] as Point, note: 'Playwright 대표 좌표: 스카이박스 15' },
  { id: 'suwon-sb16', point: [2824, 4028] as Point, note: 'Playwright 대표 좌표: 스카이박스 16' },
  { id: 'suwon-sb17', point: [2748, 4111] as Point, note: 'Playwright 대표 좌표: 스카이박스 17' },
  { id: 'suwon-sb18', point: [2682, 4237] as Point, note: 'Playwright 대표 좌표: 스카이박스 18' },
  { id: 'suwon-sb19', point: [2619, 4322] as Point, note: 'Playwright 대표 좌표: 스카이박스 19' },
  { id: 'suwon-sb20', point: [2523, 4392] as Point, note: 'Playwright 대표 좌표: 스카이박스 20' },
  { id: 'suwon-sb21', point: [2417, 4443] as Point, note: 'Playwright 대표 좌표: 스카이박스 21' },
  { id: 'suwon-sb22', point: [2302, 4478] as Point, note: 'Playwright 대표 좌표: 스카이박스 22' },
  { id: 'suwon-sb23', point: [1780, 4464] as Point, note: 'Playwright 대표 좌표: 스카이박스 23' },
  { id: 'suwon-sb24', point: [1650, 4409] as Point, note: 'Playwright 대표 좌표: 스카이박스 24' },
  { id: 'suwon-sb25', point: [1531, 4334] as Point, note: 'Playwright 대표 좌표: 스카이박스 25' },
  { id: 'suwon-sb26', point: [1429, 4242] as Point, note: 'Playwright 대표 좌표: 스카이박스 26' },
  { id: 'suwon-sb27', point: [1349, 4134] as Point, note: 'Playwright 대표 좌표: 스카이박스 27' },
  { id: 'suwon-sb28', point: [1293, 4029] as Point, note: 'Playwright 대표 좌표: 스카이박스 28' },
  { id: 'suwon-sb29', point: [1243, 3938] as Point, note: 'Playwright 대표 좌표: 스카이박스 29' },
  { id: 'suwon-sb30', point: [1193, 3847] as Point, note: 'Playwright 대표 좌표: 스카이박스 30' },
  { id: 'suwon-sb31', point: [1144, 3755] as Point, note: 'Playwright 대표 좌표: 스카이박스 31' },
  { id: 'suwon-sb32', point: [1094, 3664] as Point, note: 'Playwright 대표 좌표: 스카이박스 32' },
  { id: 'suwon-sb33', point: [1044, 3572] as Point, note: 'Playwright 대표 좌표: 스카이박스 33' },
  { id: 'suwon-sb34', point: [994, 3481] as Point, note: 'Playwright 대표 좌표: 스카이박스 34' },
  { id: 'suwon-sb35', point: [945, 3391] as Point, note: 'Playwright 대표 좌표: 스카이박스 35' },
  { id: 'suwon-sb4', point: [3352, 2960] as Point, note: 'Playwright off-center 좌표: 스카이박스 04' },
  { id: 'suwon-sb22', point: [2255, 4528] as Point, note: 'Playwright off-center 좌표: 스카이박스 22' },
  { id: 'suwon-sb35', point: [900, 3395] as Point, note: 'Playwright off-center 좌표: 스카이박스 35' },
  { id: 'suwon-genie', point: [2005, 3830] as Point, note: 'Playwright 대표 좌표: 지니존/BC카드존' },
  { id: 'suwon-3b-highfive', point: [1518, 3060] as Point, note: 'Playwright 대표 좌표: 3루 하이파이브존' },
  { id: 'suwon-1b-highfive', point: [2600, 3060] as Point, note: 'Playwright 대표 좌표: 1루 하이파이브존' },
  { id: 'suwon-lf-grass', point: [1458, 2083] as Point, note: 'Playwright 대표 좌표: 3루 외야 잔디 자유석' },
  { id: 'suwon-rf-grass', point: [2644, 2083] as Point, note: 'Playwright 대표 좌표: 1루 외야 잔디 자유석' },
  { id: 'suwon-501-508', point: [3091, 1770] as Point, note: 'Playwright 대표 좌표: 외야테이블석' },
  { id: 'suwon-7pub', point: [2030, 1930] as Point, note: 'Playwright 대표 좌표: 7 PUB' },
  { id: 'suwon-green', point: [2940, 2228] as Point, note: 'Playwright 대표 좌표: 그린존' },
  { id: 'suwon-k-live', point: [2827, 1871] as Point, note: 'Playwright 대표 좌표: K-라이브존' },
  { id: 'suwon-hite-pub', point: [3323, 2290] as Point, note: 'Playwright 대표 좌표: 하이트펍존' },
  { id: 'suwon-wheel-center', point: [2340, 4215] as Point, note: 'Playwright 대표 좌표: 중앙 휠체어석' },
  { id: 'suwon-wheel-1b', point: [2828, 4124] as Point, note: 'Playwright 대표 좌표: 1루 휠체어석' },
  { id: 'suwon-wheel-3b', point: [1804, 4215] as Point, note: 'Playwright 대표 좌표: 3루 휠체어석' },
  { id: 'suwon-kids-camp', point: [3476, 2280] as Point, note: 'Playwright 대표 좌표: 키즈랜드 캠핑존' },
  { id: 'suwon-wiz-garden', point: [3629, 2852] as Point, note: 'Playwright 대표 좌표: 위즈가든' },
]);

export const SUWON_HIT_TEST_PROBES = deepFreeze([...SUWON_ALIGNMENT_PROBES, ...SUWON_BROWSER_QA_PROBES]);

export const SUWON_TRACE_REVIEW_SUMMARY = {
  totalBlocks: SUWON_BLOCKS.length,
  officialImageTraced: SUWON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  draftApproximate: SUWON_BLOCKS.filter((block) => block.traceStatus === 'DRAFT_APPROXIMATE').length,
  pendingBlockIds: SUWON_BLOCKS.filter((block) => block.traceStatus === 'DRAFT_APPROXIMATE').map((block) => block.id),
  pendingByCategory: [] as Array<{ category: string; count: number; blockIds: string[] }>,
};

const SIDE_LABELS: Record<SuwonSide, string> = {
  FIRST_BASE: '1루',
  THIRD_BASE: '3루',
  CENTER: '중앙',
  OUTFIELD: '외야',
};

const FAN_ROLE_LABELS: Record<SuwonFanRole, string> = {
  HOME: '홈',
  AWAY: '원정',
  NEUTRAL: '중립',
};

const SOURCE_LABELS: Record<SuwonSourceConfidence, string> = {
  OFFICIAL: '공식 확인',
  UNVERIFIED: '운영자 검수 필요',
};

export function getSuwonSideLabel(side: SuwonSide) {
  return SIDE_LABELS[side];
}

export function getSuwonFanRoleLabel(fanRole: SuwonFanRole) {
  return FAN_ROLE_LABELS[fanRole];
}

export function getSuwonSourceLabel(sourceConfidence: SuwonSourceConfidence) {
  return SOURCE_LABELS[sourceConfidence];
}
