// Incheon SSG Landers Field seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type IncheonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type IncheonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type IncheonLevel = '1F' | '2F' | '3F' | '4F' | 'OUTFIELD';
export type IncheonSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type IncheonSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';

export interface IncheonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

type IncheonImageGeometryDraft = Omit<IncheonImageGeometry, 'shortLabel'> & { shortLabel?: string };

export interface IncheonSeatMapImage {
  imagePath: string;
  optimizedImagePath: string | null;
  imageWidth: number;
  imageHeight: number;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: IncheonSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface IncheonSeatMapViewport {
  cropY: number;
  cropHeight: number;
}

export interface IncheonBlock {
  id: string;
  level: IncheonLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: IncheonSide;
  fanRole: IncheonFanRole;
  sourceConfidence: IncheonSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: IncheonImageGeometry;
  accessibilityNote?: string;
}

export interface IncheonCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface IncheonViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface IncheonCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
}

type IncheonBlockDefinition = Omit<IncheonBlock, 'imageGeometry'>;

export const INCHEON_SEATMAP_IMAGE: IncheonSeatMapImage = {
  imagePath: "src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.png",
  optimizedImagePath: "src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp",
  imageWidth: 3360,
  imageHeight: 5328,
  sourceLabel: "SSG 랜더스 공식 티켓 안내 2026 좌석도",
  sourceUrl: "https://www.ssglanders.com/game/ticket",
  assetStatus: "OFFICIAL",
  requiredAssetFileName: "incheon-ssg-seatmap-official-2026.png"
};

export const INCHEON_SEATMAP_VIEWPORT: IncheonSeatMapViewport = {
  cropY: 900,
  cropHeight: 4250
};

export const INCHEON_CATEGORIES: Record<string, IncheonCategory> = {
  SKY_VIEW: {
    label: "4층 SKY뷰석",
    light: "#9ACDCD",
    dark: "#78B9BE",
    textLight: "#164E63",
    textDark: "#D1FAFA"
  },
  INFIELD_FIELD: {
    label: "내야 필드석",
    light: "#315783",
    dark: "#4D75A4",
    textLight: "#172554",
    textDark: "#DBEAFE"
  },
  OUTFIELD_FIELD: {
    label: "외야 필드석",
    light: "#E4D373",
    dark: "#D8C766",
    textLight: "#713F12",
    textDark: "#FEF3C7"
  },
  SKY_TABLE: {
    label: "SKY탁자석",
    light: "#43A19D",
    dark: "#55B7B2",
    textLight: "#134E4A",
    textDark: "#CCFBF1"
  },
  MINI_SKYBOX: {
    label: "미니스카이박스",
    light: "#F0644E",
    dark: "#F27967",
    textLight: "#7F1D1D",
    textDark: "#FFE4E6"
  },
  FAMILY: {
    label: "외야패밀리존",
    light: "#BA987A",
    dark: "#CBA98C",
    textLight: "#5F3B22",
    textDark: "#FDEDDC"
  },
  FRIENDLY: {
    label: "이마트 프렌들리존",
    light: "#4A8CA0",
    dark: "#61A0B3",
    textLight: "#164E63",
    textDark: "#E0F2FE"
  },
  LIVE: {
    label: "랜더스 라이브존",
    light: "#DF72A9",
    dark: "#E889B7",
    textLight: "#831843",
    textDark: "#FCE7F3"
  },
  PEACOCK_TABLE: {
    label: "피코크 테이블석",
    light: "#5A4A99",
    dark: "#7868B8",
    textLight: "#312E81",
    textDark: "#E0E7FF"
  },
  NOBRAND_TABLE: {
    label: "노브랜드 테이블석",
    light: "#3F7FB3",
    dark: "#5A93C2",
    textLight: "#1E3A8A",
    textDark: "#DBEAFE"
  },
  DUGOUT: {
    label: "덕아웃 상단석",
    light: "#A44BA1",
    dark: "#B967B5",
    textLight: "#581C87",
    textDark: "#F3E8FF"
  },
  GREEN: {
    label: "몰리스 그린존",
    light: "#8FBC5B",
    dark: "#9CC96D",
    textLight: "#365314",
    textDark: "#ECFCCB"
  },
  CHEERING: {
    label: "으쓱이존",
    light: "#CE3240",
    dark: "#E24955",
    textLight: "#7F1D1D",
    textDark: "#FECACA"
  },
  AWAY: {
    label: "원정응원석",
    light: "#F07C28",
    dark: "#F69245",
    textLight: "#7C2D12",
    textDark: "#FFEDD5"
  },
  HOME_RUN: {
    label: "홈런커플존",
    light: "#D63B7C",
    dark: "#E05590",
    textLight: "#831843",
    textDark: "#FCE7F3"
  },
  SKYBOX: {
    label: "스카이박스",
    light: "#50AFE0",
    dark: "#67BDE8",
    textLight: "#075985",
    textDark: "#E0F2FE"
  },
  BBQ_DODRAM: {
    label: "도드람한돈 바비큐존",
    light: "#5D361B",
    dark: "#805334",
    textLight: "#3F1F0D",
    textDark: "#FED7AA"
  },
  BBQ_EMART: {
    label: "이마트바비큐존",
    light: "#955A33",
    dark: "#B06E45",
    textLight: "#4A2412",
    textDark: "#FED7AA"
  },
  FAMILY_TABLE: {
    label: "요기요 내야패밀리존",
    light: "#F6B84F",
    dark: "#F7C36B",
    textLight: "#7C2D12",
    textDark: "#FEF3C7"
  },
  PARTY_DECK: {
    label: "로케트배터리 외야파티덱",
    light: "#2F6338",
    dark: "#4C8756",
    textLight: "#14532D",
    textDark: "#DCFCE7"
  },
  CHOGA: {
    label: "초가정자",
    light: "#56A97D",
    dark: "#68BD90",
    textLight: "#14532D",
    textDark: "#DCFCE7"
  },
  ACCESSIBLE: {
    label: "휠체어석",
    light: "#FACC15",
    dark: "#FDE047",
    textLight: "#713F12",
    textDark: "#FEF3C7"
  }
};

export const INCHEON_CATEGORY_GROUPS: IncheonCategoryGroup[] = [
  {
    id: "all",
    label: "전체",
    cats: null
  },
  {
    id: "cheer",
    label: "응원석",
    cats: [
      "CHEERING",
      "AWAY"
    ]
  },
  {
    id: "field",
    label: "필드석",
    cats: [
      "INFIELD_FIELD",
      "OUTFIELD_FIELD",
      "SKY_VIEW"
    ]
  },
  {
    id: "table",
    label: "테이블/패밀리",
    cats: [
      "PEACOCK_TABLE",
      "NOBRAND_TABLE",
      "SKY_TABLE",
      "FAMILY_TABLE",
      "FAMILY"
    ]
  },
  {
    id: "special",
    label: "특수석",
    cats: [
      "LIVE",
      "DUGOUT",
      "HOME_RUN",
      "GREEN",
      "FRIENDLY",
      "MINI_SKYBOX",
      "BBQ_DODRAM",
      "BBQ_EMART",
      "PARTY_DECK",
      "CHOGA",
      "SKYBOX"
    ]
  },
  {
    id: "accessible",
    label: "휠체어석",
    cats: [
      "ACCESSIBLE"
    ]
  }
];

export const INCHEON_VIEW_INFO: Record<string, IncheonViewInfo> = {
  default: {
    photos: 0,
    rating: null
  }
};

export const INCHEON_IMAGE_GEOMETRY_DRAFTS: Record<string, IncheonImageGeometryDraft> = {
  "incheon-206b": {
    d: "M 1758 1278 L 1759 1256 L 1760 1243 L 1775 1243 L 1789 1244 L 1800 1245 L 1819 1247 L 1856 1252 L 1874 1255 L 1869 1305 L 1868 1312 L 1864 1313 L 1861 1313 L 1760 1303 Z",
    labelX: 1814.5,
    labelY: 1277.1,
    shortLabel: "206B"
  },
  "incheon-205b": {
    d: "M 1876 1313 L 1881 1263 L 1882 1259 L 1884 1257 L 1887 1257 L 1905 1260 L 1930 1265 L 1947 1269 L 1971 1275 L 2006 1285 L 2006 1288 L 1991 1339 L 1988 1342 L 1876 1316 Z",
    labelX: 1938.8,
    labelY: 1298,
    shortLabel: "205B"
  },
  "incheon-204b": {
    d: "M 1998 1341 L 2000 1333 L 2010 1299 L 2013 1290 L 2015 1288 L 2038 1295 L 2056 1301 L 2078 1309 L 2108 1321 L 2127 1329 L 2134 1334 L 2114 1384 L 2113 1385 L 2000 1345 Z",
    labelX: 2065.3,
    labelY: 1335.9,
    shortLabel: "204B"
  },
  "incheon-107b": {
    d: "M 1486 1316 L 1488 1314 L 1492 1313 L 1516 1310 L 1536 1308 L 1549 1307 L 1568 1306 L 1601 1306 L 1603 1307 L 1607 1375 L 1606 1376 L 1497 1383 L 1495 1382 L 1488 1335 Z",
    labelX: 1546.6,
    labelY: 1342.6,
    shortLabel: "107B"
  },
  "incheon-106b": {
    d: "M 1756 1343 L 1757 1312 L 1758 1311 L 1761 1311 L 1775 1312 L 1816 1316 L 1864 1322 L 1866 1323 L 1867 1325 L 1867 1331 L 1861 1388 L 1857 1389 L 1851 1389 L 1758 1380 Z",
    labelX: 1809.8,
    labelY: 1349.8,
    shortLabel: "106B"
  },
  "incheon-108b": {
    d: "M 1363 1346 L 1365 1341 L 1370 1339 L 1430 1324 L 1445 1321 L 1474 1316 L 1477 1316 L 1479 1317 L 1480 1322 L 1486 1364 L 1488 1383 L 1486 1385 L 1384 1409 L 1382 1405 Z",
    labelX: 1426.6,
    labelY: 1360.9,
    shortLabel: "108B"
  },
  "incheon-105b": {
    d: "M 1868 1390 L 1871 1357 L 1874 1327 L 1877 1324 L 1895 1327 L 1910 1330 L 1932 1335 L 1975 1346 L 1982 1348 L 1988 1351 L 1979 1390 L 1974 1410 L 1969 1412 L 1964 1411 Z",
    labelX: 1924.7,
    labelY: 1368.1,
    shortLabel: "105B"
  },
  "incheon-109b": {
    d: "M 1242 1389 L 1246 1385 L 1252 1382 L 1307 1360 L 1321 1355 L 1348 1346 L 1352 1345 L 1355 1345 L 1367 1381 L 1375 1406 L 1376 1411 L 1373 1414 L 1272 1452 L 1256 1420 Z",
    labelX: 1310.4,
    labelY: 1398,
    shortLabel: "109B"
  },
  "incheon-104b": {
    d: "M 1979 1414 L 1994 1354 L 1995 1353 L 1998 1353 L 2026 1361 L 2062 1373 L 2073 1377 L 2088 1383 L 2105 1390 L 2109 1392 L 2109 1395 L 2087 1450 L 1981 1415 Z",
    labelX: 2042.8,
    labelY: 1400.6,
    shortLabel: "104B"
  },
  "incheon-110b": {
    d: "M 1129 1442 L 1134 1437 L 1147 1430 L 1166 1420 L 1189 1409 L 1216 1397 L 1231 1391 L 1235 1390 L 1236 1392 L 1251 1425 L 1264 1457 L 1173 1506 L 1169 1507 L 1165 1502 Z",
    labelX: 1196.9,
    labelY: 1447.6,
    shortLabel: "110B"
  },
  "incheon-111b": {
    d: "M 1025 1519 L 1034 1507 L 1040 1501 L 1056 1488 L 1089 1464 L 1107 1452 L 1115 1447 L 1158 1503 L 1161 1509 L 1161 1512 L 1158 1515 L 1077 1575 L 1068 1566 L 1052 1549 Z",
    labelX: 1093.4,
    labelY: 1511.1,
    shortLabel: "111B"
  },
  "incheon-112b": {
    d: "M 934 1610 L 945 1596 L 975 1563 L 1013 1525 L 1019 1522 L 1025 1528 L 1064 1570 L 1074 1581 L 1054 1604 L 1010 1654 L 1005 1659 L 997 1661 L 957 1629 Z",
    labelX: 1004.8,
    labelY: 1593.5,
    shortLabel: "112B"
  },
  "incheon-113b": {
    d: "M 867 1704 L 870 1698 L 880 1682 L 886 1673 L 900 1653 L 919 1628 L 931 1616 L 946 1628 L 969 1647 L 987 1662 L 985 1682 L 936 1743 L 935 1744 L 925 1739 Z",
    labelX: 929.8,
    labelY: 1682.2,
    shortLabel: "113B"
  },
  "incheon-114b": {
    d: "M 806 1813 L 827 1771 L 834 1758 L 850 1730 L 859 1715 L 863 1711 L 899 1732 L 916 1742 L 929 1750 L 929 1753 L 878 1831 L 875 1834 L 814 1817 L 807 1815 Z",
    labelX: 866.8,
    labelY: 1775.1,
    shortLabel: "114B"
  },
  "incheon-203b": {
    d: "M 2496 1713 L 2501 1708 L 2510 1702 L 2553 1674 L 2560 1670 L 2568 1677 L 2578 1691 L 2597 1720 L 2606 1735 L 2622 1767 L 2619 1776 L 2583 1794 L 2552 1807 L 2548 1802 Z",
    labelX: 2560.6,
    labelY: 1739.3,
    shortLabel: "203B"
  },
  "incheon-103b": {
    d: "M 2432 1753 L 2437 1748 L 2462 1732 L 2486 1717 L 2493 1725 L 2513 1756 L 2523 1773 L 2537 1798 L 2542 1808 L 2542 1814 L 2487 1842 L 2481 1836 L 2475 1827 L 2433 1758 Z",
    labelX: 2486.3,
    labelY: 1778.9,
    shortLabel: "103B"
  },
  "incheon-202b": {
    d: "M 2558 1819 L 2561 1816 L 2604 1794 L 2627 1783 L 2631 1782 L 2660 1843 L 2668 1862 L 2673 1875 L 2681 1897 L 2687 1915 L 2686 1925 L 2677 1928 L 2611 1946 L 2609 1945 Z",
    labelX: 2624.5,
    labelY: 1866.1,
    shortLabel: "202B"
  },
  "incheon-207b": {
    d: "M 767 1942 L 769 1931 L 772 1916 L 782 1876 L 792 1845 L 801 1824 L 803 1822 L 865 1874 L 870 1914 L 870 1917 L 861 1959 L 854 1960 L 836 1957 L 772 1946 Z",
    labelX: 819.7,
    labelY: 1897,
    shortLabel: "207B"
  },
  "incheon-102b": {
    d: "M 2492 1918 L 2495 1864 L 2504 1843 L 2546 1822 L 2548 1823 L 2558 1840 L 2571 1869 L 2583 1899 L 2591 1921 L 2597 1942 L 2597 1948 L 2588 1951 L 2502 1971 L 2500 1967 Z",
    labelX: 2539.5,
    labelY: 1904.1,
    shortLabel: "102B"
  },
  "incheon-115b": {
    d: "M 655 2069 L 657 2043 L 660 2016 L 665 1984 L 670 1958 L 683 1903 L 694 1865 L 711 1815 L 720 1800 L 775 1814 L 790 1820 L 738 2067 L 732 2070 L 657 2079 Z",
    labelX: 716.8,
    labelY: 1942.6,
    shortLabel: "115B"
  },
  "incheon-116b": {
    d: "M 750 2037 L 753 2007 L 756 1986 L 758 1975 L 763 1958 L 766 1955 L 792 1959 L 854 1969 L 856 1970 L 858 1974 L 853 2057 L 758 2068 L 752 2068 L 751 2066 Z",
    labelX: 801.9,
    labelY: 2013.5,
    shortLabel: "116B"
  },
  "incheon-101b": {
    d: "M 2501 1987 L 2502 1980 L 2504 1978 L 2597 1957 L 2599 1958 L 2602 1967 L 2605 1994 L 2606 2008 L 2606 2050 L 2604 2064 L 2602 2069 L 2601 2070 L 2503 2051 L 2502 2049 Z",
    labelX: 2557,
    labelY: 2014.2,
    shortLabel: "101B"
  },
  "incheon-201b": {
    d: "M 2611 1958 L 2616 1953 L 2637 1947 L 2692 1934 L 2693 1936 L 2700 1962 L 2704 1979 L 2711 2017 L 2714 2041 L 2716 2063 L 2717 2092 L 2714 2092 L 2616 2073 L 2614 2069 Z",
    labelX: 2663.6,
    labelY: 2015.3,
    shortLabel: "201B"
  },
  "incheon-117b": {
    d: "M 750 2082 L 751 2081 L 756 2079 L 794 2074 L 849 2067 L 854 2068 L 869 2179 L 868 2180 L 847 2186 L 767 2206 L 765 2199 L 759 2169 L 753 2124 L 751 2102 Z",
    labelX: 807.1,
    labelY: 2134.5,
    shortLabel: "117B"
  },
  "incheon-208b": {
    d: "M 653 2110 L 654 2091 L 705 2085 L 732 2082 L 739 2084 L 756 2208 L 756 2211 L 745 2216 L 707 2227 L 665 2239 L 661 2240 L 658 2219 L 656 2200 L 654 2175 Z",
    labelX: 698.6,
    labelY: 2159.1,
    shortLabel: "208B"
  },
  "incheon-118b": {
    d: "M 772 2222 L 775 2219 L 784 2216 L 870 2190 L 874 2192 L 905 2272 L 907 2294 L 835 2330 L 818 2338 L 811 2336 L 808 2330 L 801 2313 L 786 2271 L 781 2255 Z",
    labelX: 840.5,
    labelY: 2261.7,
    shortLabel: "118B"
  },
  "incheon-209b": {
    d: "M 664 2255 L 665 2251 L 674 2248 L 742 2228 L 754 2225 L 760 2225 L 803 2347 L 725 2383 L 714 2388 L 707 2386 L 691 2354 L 686 2341 L 674 2302 L 671 2290 Z",
    labelX: 729.3,
    labelY: 2304.9,
    shortLabel: "209B"
  },
  "incheon-n3": {
    d: "M 2488 2165 L 2499 2070 L 2501 2062 L 2504 2059 L 2599 2078 L 2600 2080 L 2601 2085 L 2599 2105 L 2593 2147 L 2590 2162 L 2583 2190 L 2579 2197 L 2570 2194 L 2550 2187 Z",
    labelX: 2544.6,
    labelY: 2125.4,
    shortLabel: "N3"
  },
  "incheon-n4": {
    d: "M 2593 2198 L 2611 2087 L 2613 2082 L 2616 2082 L 2718 2103 L 2718 2106 L 2715 2148 L 2712 2178 L 2705 2233 L 2703 2241 L 2696 2242 L 2670 2232 L 2601 2205 L 2599 2204 Z",
    labelX: 2657.7,
    labelY: 2159.8,
    shortLabel: "N4"
  },
  "incheon-n1": {
    d: "M 2452 2279 L 2485 2177 L 2496 2178 L 2542 2195 L 2566 2204 L 2574 2208 L 2575 2210 L 2569 2237 L 2565 2250 L 2559 2268 L 2545 2303 L 2540 2314 L 2534 2326 L 2529 2331 Z",
    labelX: 2515,
    labelY: 2249.7,
    shortLabel: "N1"
  },
  "incheon-n2": {
    d: "M 2544 2337 L 2589 2217 L 2593 2213 L 2698 2255 L 2698 2258 L 2691 2280 L 2686 2294 L 2662 2351 L 2657 2362 L 2649 2379 L 2638 2399 L 2633 2398 L 2587 2369 L 2545 2342 Z",
    labelX: 2621.3,
    labelY: 2303.6,
    shortLabel: "N2"
  },
  "incheon-1b": {
    d: "M 2387 2404 L 2388 2400 L 2435 2302 L 2447 2302 L 2477 2320 L 2520 2349 L 2519 2353 L 2506 2381 L 2497 2399 L 2487 2418 L 2469 2451 L 2464 2456 L 2449 2447 L 2406 2418 Z",
    labelX: 2451.6,
    labelY: 2378.2,
    shortLabel: "1B"
  },
  "incheon-2b": {
    d: "M 2479 2462 L 2532 2361 L 2535 2358 L 2542 2360 L 2610 2403 L 2621 2410 L 2629 2420 L 2625 2427 L 2589 2487 L 2570 2518 L 2567 2521 L 2562 2520 L 2513 2488 L 2486 2470 Z",
    labelX: 2553,
    labelY: 2440.4,
    shortLabel: "2B"
  },
  "incheon-3b": {
    d: "M 2317 2519 L 2377 2420 L 2380 2420 L 2411 2440 L 2451 2466 L 2454 2469 L 2455 2471 L 2452 2477 L 2390 2569 L 2386 2567 L 2368 2555 L 2343 2538 L 2327 2527 L 2320 2522 Z",
    labelX: 2384.7,
    labelY: 2493.5,
    shortLabel: "3B"
  },
  "incheon-4b": {
    d: "M 2403 2574 L 2422 2546 L 2461 2489 L 2468 2479 L 2473 2477 L 2559 2532 L 2559 2535 L 2529 2583 L 2503 2624 L 2497 2633 L 2486 2635 L 2438 2602 L 2415 2586 L 2408 2581 Z",
    labelX: 2481,
    labelY: 2557.1,
    shortLabel: "4B"
  },
  "incheon-5b": {
    d: "M 2224 2648 L 2306 2536 L 2308 2534 L 2313 2535 L 2324 2542 L 2373 2574 L 2382 2580 L 2379 2586 L 2367 2604 L 2354 2623 L 2304 2694 L 2303 2695 L 2297 2695 L 2245 2663 Z",
    labelX: 2303.6,
    labelY: 2615.3,
    shortLabel: "5B"
  },
  "incheon-6b": {
    d: "M 2314 2702 L 2391 2592 L 2394 2589 L 2414 2602 L 2470 2639 L 2482 2648 L 2484 2652 L 2482 2657 L 2477 2665 L 2461 2690 L 2410 2765 L 2404 2762 L 2391 2754 L 2321 2710 Z",
    labelX: 2400.7,
    labelY: 2678.2,
    shortLabel: "6B"
  },
  "incheon-32b": {
    d: "M 822 2352 L 823 2351 L 830 2347 L 917 2302 L 923 2302 L 940 2333 L 975 2400 L 974 2404 L 973 2405 L 880 2456 L 874 2447 L 860 2425 L 843 2397 L 831 2376 Z",
    labelX: 898.5,
    labelY: 2377.5,
    shortLabel: "32B"
  },
  "incheon-31b": {
    d: "M 718 2402 L 720 2400 L 738 2391 L 801 2361 L 806 2359 L 814 2366 L 873 2463 L 875 2470 L 874 2471 L 794 2521 L 784 2513 L 777 2502 L 744 2448 L 735 2433 Z",
    labelX: 795.6,
    labelY: 2436.6,
    shortLabel: "31B"
  },
  "incheon-30b": {
    d: "M 894 2472 L 895 2471 L 971 2419 L 980 2413 L 986 2416 L 1054 2525 L 1049 2530 L 1023 2547 L 989 2569 L 965 2584 L 955 2570 L 925 2525 L 912 2505 L 898 2483 Z",
    labelX: 971.6,
    labelY: 2497.7,
    shortLabel: "30B"
  },
  "incheon-29b": {
    d: "M 798 2535 L 802 2531 L 811 2525 L 861 2493 L 877 2483 L 891 2490 L 957 2589 L 953 2593 L 923 2614 L 884 2641 L 871 2648 L 869 2647 L 857 2629 L 815 2563 Z",
    labelX: 875.9,
    labelY: 2563.9,
    shortLabel: "29B"
  },
  "incheon-28b": {
    d: "M 975 2592 L 979 2588 L 996 2577 L 1038 2550 L 1054 2540 L 1133 2641 L 1135 2645 L 1125 2652 L 1069 2690 L 1051 2702 L 1046 2698 L 1025 2668 L 1009 2645 L 998 2629 Z",
    labelX: 1053.7,
    labelY: 2618.4,
    shortLabel: "28B"
  },
  "incheon-27b": {
    d: "M 877 2657 L 882 2652 L 900 2640 L 962 2599 L 965 2599 L 1031 2695 L 1037 2704 L 1039 2708 L 951 2763 L 944 2761 L 942 2760 L 902 2698 L 881 2665 Z",
    labelX: 956,
    labelY: 2682.4,
    shortLabel: "27B"
  },
  "incheon-25b": {
    d: "M 1059 2712 L 1124 2668 L 1142 2656 L 1145 2656 L 1154 2665 L 1248 2760 L 1249 2762 L 1248 2763 L 1225 2780 L 1157 2830 L 1152 2829 L 1150 2828 L 1087 2750 L 1062 2718 Z",
    labelX: 1154,
    labelY: 2739.4,
    shortLabel: "25B"
  },
  "incheon-7b": {
    d: "M 2111 2758 L 2117 2752 L 2213 2659 L 2221 2663 L 2236 2672 L 2289 2715 L 2283 2724 L 2276 2734 L 2267 2746 L 2225 2800 L 2200 2828 L 2198 2827 L 2184 2817 L 2144 2788 Z",
    labelX: 2200.8,
    labelY: 2741,
    shortLabel: "7B"
  },
  "incheon-23b": {
    d: "M 2012 2839 L 2015 2836 L 2096 2770 L 2102 2773 L 2109 2778 L 2175 2826 L 2187 2835 L 2190 2841 L 2181 2853 L 2160 2874 L 2098 2933 L 2088 2940 L 2086 2939 L 2077 2927 Z",
    labelX: 2095.9,
    labelY: 2847.7,
    shortLabel: "23B"
  },
  "incheon-9b": {
    d: "M 1162 2843 L 1168 2837 L 1213 2804 L 1261 2771 L 1266 2775 L 1339 2834 L 1337 2851 L 1303 2897 L 1277 2932 L 1266 2943 L 1259 2938 L 1244 2926 L 1193 2878 L 1184 2869 Z",
    labelX: 1259,
    labelY: 2848.5,
    shortLabel: "9B"
  },
  "incheon-21b": {
    d: "M 1279 2951 L 1312 2906 L 1337 2872 L 1356 2847 L 1361 2848 L 1449 2898 L 1449 2904 L 1417 2966 L 1394 3010 L 1390 3017 L 1362 3006 L 1335 2991 L 1307 2974 L 1280 2956 Z",
    labelX: 1366.1,
    labelY: 2932,
    shortLabel: "21B"
  },
  "incheon-11b": {
    d: "M 1905 2898 L 1906 2897 L 2000 2845 L 2008 2855 L 2044 2903 L 2076 2946 L 2077 2948 L 2055 2967 L 2035 2981 L 2018 2992 L 2003 3001 L 1989 3009 L 1971 3018 L 1968 3018 Z",
    labelX: 1988.1,
    labelY: 2932.9,
    shortLabel: "11B"
  },
  "incheon-19b": {
    d: "M 1402 3026 L 1404 3018 L 1410 3006 L 1464 2904 L 1469 2905 L 1557 2934 L 1559 2935 L 1530 3069 L 1526 3070 L 1520 3070 L 1494 3063 L 1476 3057 L 1452 3048 L 1435 3041 Z",
    labelX: 1485.4,
    labelY: 2989.4,
    shortLabel: "19B"
  },
  "incheon-13b": {
    d: "M 1799 2938 L 1800 2934 L 1892 2902 L 1937 2986 L 1955 3022 L 1954 3026 L 1947 3030 L 1925 3040 L 1890 3054 L 1867 3062 L 1850 3067 L 1830 3072 L 1827 3069 L 1822 3047 Z",
    labelX: 1869.5,
    labelY: 2990.6,
    shortLabel: "13B"
  },
  "incheon-17b": {
    d: "M 1544 3073 L 1547 3058 L 1571 2944 L 1572 2940 L 1577 2938 L 1667 2950 L 1671 2952 L 1668 3093 L 1662 3093 L 1648 3092 L 1637 3091 L 1605 3087 L 1592 3085 L 1574 3082 Z",
    labelX: 1612.3,
    labelY: 3019.5,
    shortLabel: "17B"
  },
  "incheon-15b": {
    d: "M 1686 2952 L 1691 2950 L 1785 2937 L 1807 3041 L 1814 3076 L 1810 3077 L 1777 3083 L 1759 3086 L 1738 3089 L 1711 3092 L 1695 3093 L 1686 3093 Z",
    labelX: 1741.1,
    labelY: 3020.3,
    shortLabel: "15B"
  },
  "incheon-22b": {
      "d": "M 1186 3074 L 1190 3067 L 1268 2965 L 1269 2964 L 1381 3032 L 1379 3037 L 1313 3160 L 1308 3159 L 1267 3137 L 1256 3130 L 1231 3113 L 1224 3108 L 1193 3085 L 1188 3081 Z",
      "labelX": 1282.8,
      "labelY": 3063,
      "shortLabel": "22B"
  },
  "incheon-12b": {
      "d": "M 1977 3033 L 1978 3029 L 2084 2962 L 2089 2963 L 2129 3016 L 2170 3071 L 2166 3078 L 2142 3099 L 2129 3109 L 2107 3125 L 2059 3155 L 2053 3158 L 2040 3150 L 2032 3137 Z",
      "labelX": 2071.4,
      "labelY": 3062.2,
      "shortLabel": "12B"
  },
  "incheon-20b": {
      "d": "M 1325 3166 L 1328 3160 L 1388 3046 L 1396 3038 L 1526 3085 L 1516 3140 L 1505 3193 L 1499 3220 L 1496 3229 L 1486 3227 L 1439 3214 L 1423 3209 L 1381 3194 L 1362 3186 Z",
      "labelX": 1432.5,
      "labelY": 3136.6,
      "shortLabel": "20B"
  },
  "incheon-14b": {
      "d": "M 1831 3089 L 1832 3085 L 1958 3040 L 1968 3045 L 1979 3064 L 2010 3123 L 2030 3169 L 2023 3173 L 2011 3179 L 1974 3195 L 1955 3202 L 1919 3214 L 1874 3226 L 1860 3228 Z",
      "labelX": 1924,
      "labelY": 3136.5,
      "shortLabel": "14B"
  },
  "incheon-18b": {
      "d": "M 1510 3230 L 1533 3120 L 1537 3101 L 1539 3093 L 1543 3089 L 1669 3107 L 1670 3109 L 1670 3247 L 1668 3249 L 1644 3249 L 1613 3247 L 1591 3245 L 1567 3242 L 1541 3238 Z",
      "labelX": 1595.6,
      "labelY": 3173.9,
      "shortLabel": "18B"
  },
  "incheon-16b": {
      "d": "M 1688 3109 L 1690 3107 L 1698 3105 L 1808 3091 L 1818 3090 L 1841 3199 L 1847 3229 L 1843 3233 L 1828 3236 L 1817 3238 L 1745 3247 L 1732 3248 L 1713 3249 L 1689 3249 Z",
      "labelX": 1760,
      "labelY": 3173.8,
      "shortLabel": "16B"
  },
  "incheon-10b": {
    d: "M 2212 2837 L 2298 2724 L 2306 2716 L 2312 2719 L 2400 2775 L 2400 2784 L 2396 2791 L 2381 2815 L 2365 2840 L 2343 2874 L 2326 2900 L 2320 2909 L 2316 2913 L 2309 2908 Z",
    labelX: 2312.7,
    labelY: 2814.3,
    shortLabel: "10B"
  },
  "incheon-26b": {
    d: "M 955 2777 L 956 2776 L 1005 2745 L 1051 2723 L 1079 2758 L 1142 2839 L 1134 2847 L 1102 2870 L 1050 2907 L 1042 2912 L 1019 2881 L 1006 2861 L 972 2808 L 956 2782 Z",
    labelX: 1043.5,
    labelY: 2815.2,
    shortLabel: "26B"
  },
  "incheon-8b": {
    d: "M 2098 2954 L 2101 2948 L 2107 2942 L 2206 2849 L 2210 2851 L 2295 2913 L 2307 2922 L 2287 2954 L 2276 2968 L 2264 2983 L 2196 3054 L 2182 3065 L 2176 3059 L 2158 3035 Z",
    labelX: 2201.4,
    labelY: 2954.2,
    shortLabel: "8B"
  },
  "incheon-24b": {
    d: "M 1049 2923 L 1148 2851 L 1151 2851 L 1259 2956 L 1255 2963 L 1246 2975 L 1177 3065 L 1175 3067 L 1172 3067 L 1147 3044 L 1132 3029 L 1116 3012 L 1074 2961 L 1059 2940 Z",
    labelX: 1153.1,
    labelY: 2955.8,
    shortLabel: "24B"
  },
  "incheon-v6": {
    d: "M 1367 2836 L 1369 2831 L 1391 2800 L 1407 2778 L 1409 2779 L 1489 2828 L 1487 2833 L 1460 2887 L 1457 2887 L 1425 2871 L 1406 2860 L 1376 2842 Z",
    labelX: 1428.8,
    labelY: 2834.8,
    shortLabel: "V6"
  },
  "incheon-v1": {
    d: "M 1868 2830 L 1950 2781 L 1956 2784 L 1987 2825 L 1992 2832 L 1993 2834 L 1991 2839 L 1971 2853 L 1955 2863 L 1923 2880 L 1912 2885 L 1907 2887 L 1901 2887 L 1894 2876 Z",
    labelX: 1930.5,
    labelY: 2836.4,
    shortLabel: "V1"
  },
  "incheon-v5": {
    d: "M 1475 2887 L 1480 2876 L 1493 2848 L 1499 2836 L 1506 2835 L 1570 2858 L 1574 2860 L 1573 2870 L 1561 2921 L 1559 2923 L 1547 2920 L 1524 2913 L 1515 2910 L 1489 2900 Z",
    labelX: 1525.2,
    labelY: 2880.3,
    shortLabel: "V5"
  },
  "incheon-v2": {
    d: "M 1781 2863 L 1783 2861 L 1852 2837 L 1856 2836 L 1872 2865 L 1883 2893 L 1882 2894 L 1852 2906 L 1825 2915 L 1797 2922 L 1794 2919 L 1792 2912 L 1786 2888 L 1782 2871 Z",
    labelX: 1829.3,
    labelY: 2881.1,
    shortLabel: "V2"
  },
  "incheon-v4": {
    d: "M 1577 2920 L 1578 2913 L 1584 2880 L 1588 2864 L 1591 2864 L 1669 2873 L 1671 2874 L 1671 2886 L 1670 2938 L 1667 2938 L 1639 2936 L 1628 2935 L 1604 2932 L 1579 2927 Z",
    labelX: 1625.2,
    labelY: 2901.8,
    shortLabel: "V4"
  },
  "incheon-v3": {
    d: "M 1686 2874 L 1693 2873 L 1767 2865 L 1769 2866 L 1771 2873 L 1777 2900 L 1782 2925 L 1768 2930 L 1753 2933 L 1739 2935 L 1719 2937 L 1703 2938 L 1688 2938 L 1687 2936 Z",
    labelX: 1731.2,
    labelY: 2902.5,
    shortLabel: "V3"
  },
  "incheon-36b": {
    d: "M 2431 2945 L 2506 2822 L 2511 2814 L 2517 2808 L 2519 2809 L 2532 2817 L 2543 2824 L 2543 2830 L 2534 2845 L 2463 2961 L 2462 2962 L 2454 2961 L 2452 2960 L 2437 2951 Z",
    labelX: 2488,
    labelY: 2885.4,
    shortLabel: "36B"
  },
  "incheon-37b": {
    d: "M 2338 3077 L 2339 3073 L 2420 2962 L 2424 2958 L 2430 2961 L 2450 2974 L 2453 2977 L 2437 3002 L 2422 3023 L 2405 3046 L 2385 3072 L 2373 3087 L 2363 3097 L 2356 3092 Z",
    labelX: 2395.9,
    labelY: 3027.8,
    shortLabel: "37B"
  },
  "incheon-38b": {
    d: "M 2234 3181 L 2245 3170 L 2331 3087 L 2335 3089 L 2351 3103 L 2355 3108 L 2341 3125 L 2266 3200 L 2258 3205 L 2256 3204 L 2251 3200 L 2241 3189 Z",
    labelX: 2295,
    labelY: 3147.8,
    shortLabel: "38B"
  },
  "incheon-39b": {
    d: "M 2104 3269 L 2109 3264 L 2216 3193 L 2224 3188 L 2226 3189 L 2231 3193 L 2247 3213 L 2248 3215 L 2227 3230 L 2189 3256 L 2180 3262 L 2146 3284 L 2123 3298 L 2120 3298 Z",
    labelX: 2173.6,
    labelY: 3243.9,
    shortLabel: "39B"
  },
  "incheon-40b": {
    d: "M 1246 3305 L 1248 3300 L 1254 3288 L 1261 3275 L 1266 3273 L 1465 3344 L 1469 3346 L 1460 3385 L 1445 3382 L 1421 3376 L 1379 3364 L 1330 3347 L 1315 3341 L 1294 3332 Z",
    labelX: 1358.6,
    labelY: 3332.5,
    shortLabel: "40B"
  },
  "incheon-41b": {
    d: "M 1685 3376 L 1686 3369 L 1687 3368 L 1872 3348 L 1873 3350 L 1881 3387 L 1878 3390 L 1870 3392 L 1837 3398 L 1802 3403 L 1749 3408 L 1733 3409 L 1711 3410 L 1699 3410 Z",
    labelX: 1780.6,
    labelY: 3382.3,
    shortLabel: "41B"
  },
  "incheon-42b": {
    d: "M 1475 3382 L 1479 3363 L 1482 3351 L 1657 3368 L 1667 3370 L 1670 3385 L 1670 3409 L 1633 3410 L 1616 3409 L 1588 3407 L 1550 3403 L 1542 3402 L 1493 3394 L 1488 3393 Z",
    labelX: 1573.6,
    labelY: 3382.6,
    shortLabel: "42B"
  },
  "incheon-43b": {
    d: "M 1886 3346 L 1888 3344 L 2092 3272 L 2097 3279 L 2109 3306 L 2107 3308 L 2093 3316 L 2047 3338 L 2022 3348 L 1994 3358 L 1985 3361 L 1955 3370 L 1899 3384 L 1895 3382 Z",
    labelX: 1996.4,
    labelY: 3332.1,
    shortLabel: "43B"
  },
  "incheon-44b": {
    d: "M 1105 3206 L 1118 3190 L 1127 3181 L 1253 3265 L 1253 3268 L 1237 3296 L 1235 3298 L 1232 3298 L 1224 3294 L 1207 3284 L 1180 3266 L 1159 3251 L 1142 3238 L 1112 3214 Z",
    labelX: 1180.2,
    labelY: 3241.3,
    shortLabel: "44B"
  },
  "incheon-45b": {
    d: "M 983 3082 L 984 3081 L 1003 3065 L 1008 3063 L 1115 3172 L 1113 3180 L 1103 3193 L 1093 3197 L 1089 3195 L 1081 3188 L 1067 3175 L 1024 3131 L 1004 3109 L 997 3101 Z",
    labelX: 1050,
    labelY: 3132,
    shortLabel: "45B"
  },
  "incheon-301b": {
    d: "M 2707 2510 L 2747 2443 L 2748 2442 L 2762 2449 L 2779 2459 L 2780 2467 L 2776 2474 L 2762 2497 L 2743 2528 L 2739 2532 L 2715 2517 L 2708 2512 Z",
    labelX: 2745.1,
    labelY: 2486.8,
    shortLabel: "301B"
  },
  "incheon-302b": {
    d: "M 2615 2656 L 2619 2649 L 2624 2641 L 2645 2608 L 2682 2550 L 2698 2525 L 2702 2521 L 2706 2523 L 2726 2536 L 2733 2541 L 2731 2546 L 2726 2554 L 2653 2666 L 2647 2675 Z",
    labelX: 2674.2,
    labelY: 2597.6,
    shortLabel: "302B"
  },
  "incheon-303b": {
    d: "M 2522 2797 L 2527 2789 L 2538 2772 L 2589 2694 L 2607 2667 L 2609 2665 L 2611 2666 L 2640 2685 L 2629 2702 L 2573 2788 L 2556 2814 L 2554 2816 L 2548 2816 L 2544 2814 Z",
    labelX: 2579.7,
    labelY: 2742.8,
    shortLabel: "303B"
  },
  "incheon-304b": {
    d: "M 892 2954 L 900 2946 L 919 2933 L 1001 3052 L 991 3062 L 978 3072 L 974 3073 L 960 3054 L 940 3026 L 918 2994 L 906 2976 Z",
    labelX: 946.7,
    labelY: 3003.9,
    shortLabel: "304B"
  },
  "incheon-305b": {
    d: "M 804 2814 L 810 2808 L 826 2798 L 831 2796 L 836 2803 L 872 2860 L 894 2895 L 909 2919 L 912 2925 L 910 2927 L 902 2932 L 887 2941 L 881 2938 L 874 2927 Z",
    labelX: 858.6,
    labelY: 2869.3,
    shortLabel: "305B"
  },
  "incheon-306b": {
    d: "M 714 2673 L 719 2668 L 734 2659 L 741 2655 L 745 2657 L 752 2668 L 767 2692 L 815 2770 L 824 2785 L 825 2787 L 822 2790 L 798 2805 L 795 2802 L 715 2675 Z",
    labelX: 770,
    labelY: 2729.4,
    shortLabel: "306B"
  },
  "incheon-307b": {
    d: "M 628 2537 L 636 2532 L 651 2523 L 659 2524 L 673 2546 L 731 2638 L 735 2646 L 713 2659 L 708 2661 L 703 2654 L 690 2634 L 643 2561 L 629 2539 Z",
    labelX: 681.7,
    labelY: 2590.6,
    shortLabel: "307B"
  },
  "incheon-308b": {
    d: "M 583 2459 L 588 2454 L 595 2450 L 608 2443 L 611 2443 L 618 2454 L 647 2503 L 651 2511 L 650 2512 L 628 2525 L 623 2527 L 615 2514 Z",
    labelX: 615.5,
    labelY: 2482,
    shortLabel: "308B"
  },
  "incheon-401b": {
    d: "M 2752 2540 L 2753 2533 L 2761 2519 L 2788 2474 L 2793 2469 L 2799 2472 L 2812 2480 L 2884 2525 L 2883 2529 L 2879 2536 L 2843 2596 L 2835 2592 L 2787 2562 Z",
    labelX: 2818.2,
    labelY: 2532.8,
    shortLabel: "401B"
  },
  "incheon-402b": {
    d: "M 2657 2680 L 2741 2548 L 2749 2552 L 2825 2599 L 2836 2606 L 2755 2732 L 2750 2737 L 2748 2736 L 2733 2727 L 2677 2693 L 2664 2685 Z",
    labelX: 2746.5,
    labelY: 2642.9,
    shortLabel: "402B"
  },
  "incheon-403b": {
    d: "M 2560 2822 L 2584 2786 L 2640 2703 L 2647 2693 L 2650 2690 L 2705 2725 L 2736 2745 L 2743 2750 L 2743 2753 L 2663 2875 L 2657 2884 L 2651 2881 L 2583 2838 L 2561 2824 Z",
    labelX: 2652.7,
    labelY: 2787.3,
    shortLabel: "403B"
  },
  "incheon-404b": {
    d: "M 2470 2966 L 2479 2951 L 2530 2867 L 2544 2844 L 2549 2836 L 2550 2835 L 2555 2833 L 2643 2889 L 2648 2893 L 2647 2897 L 2573 3013 L 2562 3030 L 2559 3033 L 2550 3027 Z",
    labelX: 2557.9,
    labelY: 2931.8,
    shortLabel: "404B"
  },
  "incheon-405b": {
    d: "M 2369 3103 L 2461 2981 L 2463 2979 L 2465 2980 L 2532 3024 L 2550 3036 L 2555 3040 L 2551 3047 L 2545 3056 L 2461 3176 L 2460 3177 L 2458 3176 L 2423 3148 L 2385 3117 Z",
    labelX: 2462.8,
    labelY: 3076.2,
    shortLabel: "405B"
  },
  "incheon-406b": {
    d: "M 2262 3216 L 2362 3113 L 2364 3114 L 2374 3122 L 2417 3157 L 2450 3184 L 2453 3187 L 2435 3211 L 2410 3239 L 2362 3287 L 2341 3302 L 2335 3296 L 2322 3282 L 2299 3257 Z",
    labelX: 2357.4,
    labelY: 3207.7,
    shortLabel: "406B"
  },
  "incheon-407b": {
    d: "M 2128 3311 L 2131 3308 L 2255 3223 L 2263 3230 L 2311 3284 L 2317 3326 L 2311 3332 L 2281 3356 L 2259 3372 L 2249 3379 L 2215 3401 L 2194 3413 L 2177 3394 L 2139 3330 Z",
    labelX: 2229.1,
    labelY: 3318.8,
    shortLabel: "407B"
  },
  "incheon-408b": {
    d: "M 1899 3396 L 2117 3316 L 2138 3352 L 2173 3413 L 2172 3426 L 2139 3444 L 2127 3450 L 2099 3463 L 2063 3478 L 2039 3487 L 1990 3503 L 1929 3519 L 1927 3515 L 1903 3416 Z",
    labelX: 2032.2,
    labelY: 3420.9,
    shortLabel: "408B"
  },
  "incheon-409b": {
    d: "M 1686 3426 L 1690 3422 L 1886 3400 L 1916 3520 L 1915 3521 L 1902 3525 L 1875 3531 L 1818 3540 L 1798 3542 L 1785 3543 L 1769 3544 L 1700 3544 L 1689 3543 L 1687 3542 Z",
    labelX: 1794.7,
    labelY: 3478.2,
    shortLabel: "409B"
  },
  "incheon-410b": {
    d: "M 1444 3518 L 1448 3499 L 1461 3441 L 1470 3402 L 1474 3401 L 1671 3423 L 1671 3444 L 1668 3543 L 1655 3544 L 1637 3544 L 1591 3542 L 1558 3539 L 1500 3531 L 1455 3522 Z",
    labelX: 1562.9,
    labelY: 3477,
    shortLabel: "410B"
  },
  "incheon-411b": {
    d: "M 1182 3414 L 1186 3407 L 1237 3320 L 1238 3319 L 1458 3396 L 1431 3516 L 1430 3517 L 1422 3516 L 1375 3503 L 1359 3498 L 1312 3482 L 1269 3465 L 1238 3451 L 1195 3428 Z",
    labelX: 1324.9,
    labelY: 3419.8,
    shortLabel: "411B"
  },
  "incheon-412b": {
    d: "M 1022 3310 L 1088 3226 L 1091 3223 L 1099 3218 L 1229 3310 L 1226 3316 L 1170 3414 L 1148 3403 L 1133 3394 L 1111 3380 L 1095 3369 L 1062 3345 L 1037 3325 L 1029 3318 Z",
    labelX: 1126.5,
    labelY: 3316,
    shortLabel: "412B"
  },
  "incheon-413b": {
    d: "M 881 3163 L 887 3157 L 961 3101 L 977 3091 L 1088 3208 L 1087 3212 L 1016 3301 L 1015 3302 L 1011 3300 L 993 3285 L 977 3271 L 941 3235 L 917 3208 L 902 3190 Z",
    labelX: 986.4,
    labelY: 3194.7,
    shortLabel: "413B"
  },
  "incheon-414b": {
    d: "M 785 3022 L 788 3019 L 831 2991 L 882 2958 L 886 2963 L 965 3076 L 966 3078 L 961 3086 L 958 3089 L 883 3146 L 874 3152 L 864 3138 Z",
    labelX: 876.7,
    labelY: 3054.2,
    shortLabel: "414B"
  },
  "incheon-415b": {
    d: "M 697 2876 L 780 2826 L 787 2822 L 793 2819 L 798 2826 L 826 2870 L 862 2927 L 870 2940 L 872 2944 L 870 2952 L 869 2953 L 781 3008 L 777 3003 L 763 2981 Z",
    labelX: 786.4,
    labelY: 2913.3,
    shortLabel: "415B"
  },
  "incheon-416b": {
    d: "M 607 2738 L 613 2732 L 661 2702 L 700 2678 L 706 2681 L 786 2808 L 787 2810 L 762 2826 L 704 2860 L 697 2864 L 691 2867 L 688 2864 L 675 2844 L 616 2753 Z",
    labelX: 696.6,
    labelY: 2772.9,
    shortLabel: "416B"
  },
  "incheon-417b": {
    d: "M 526 2606 L 528 2598 L 530 2596 L 584 2563 L 607 2549 L 614 2545 L 620 2542 L 696 2664 L 698 2668 L 696 2670 L 688 2675 L 613 2720 L 599 2728 L 593 2719 Z",
    labelX: 610.1,
    labelY: 2635.1,
    shortLabel: "417B"
  },
  "incheon-418b": {
    d: "M 473 2512 L 474 2511 L 545 2476 L 574 2462 L 577 2465 L 611 2524 L 615 2532 L 523 2588 L 517 2591 L 507 2574 L 475 2516 Z",
    labelX: 543.2,
    labelY: 2524.6,
    shortLabel: "418B"
  },
  "incheon-l18": {
    d: "M 619 2435 L 621 2433 L 629 2428 L 652 2414 L 659 2410 L 667 2423 L 685 2453 L 687 2457 L 687 2460 L 671 2470 L 656 2479 L 649 2483 L 642 2472 Z",
    labelX: 653.4,
    labelY: 2446.4,
    shortLabel: "L18"
  },
  "incheon-l17": {
    d: "M 657 2493 L 681 2478 L 688 2474 L 697 2474 L 721 2513 L 722 2515 L 722 2518 L 704 2530 L 687 2541 L 685 2540 L 680 2533 L 673 2522 L 658 2498 L 657 2496 Z",
    labelX: 689.5,
    labelY: 2506.1,
    shortLabel: "L17"
  },
  "incheon-l16": {
    d: "M 691 2552 L 692 2551 L 700 2546 L 723 2532 L 729 2529 L 731 2530 L 737 2539 L 751 2561 L 754 2567 L 755 2572 L 728 2590 L 720 2595 L 718 2594 L 705 2574 Z",
    labelX: 724.5,
    labelY: 2561.1,
    shortLabel: "L16"
  },
  "incheon-l15": {
    d: "M 727 2606 L 729 2604 L 756 2586 L 767 2587 L 788 2620 L 791 2626 L 791 2629 L 764 2647 L 756 2652 L 754 2651 L 742 2633 L 728 2611 L 727 2609 Z",
    labelX: 759.1,
    labelY: 2616.9,
    shortLabel: "L15"
  },
  "incheon-l14": {
    d: "M 762 2664 L 766 2660 L 775 2654 L 792 2643 L 801 2640 L 816 2664 L 824 2677 L 827 2683 L 828 2688 L 827 2689 L 809 2701 L 793 2711 L 791 2710 L 763 2666 Z",
    labelX: 795.5,
    labelY: 2674.8,
    shortLabel: "L14"
  },
  "incheon-l13": {
    d: "M 800 2722 L 801 2721 L 828 2703 L 836 2698 L 838 2699 L 843 2706 L 857 2728 L 860 2734 L 859 2741 L 857 2743 L 830 2761 L 826 2762 L 824 2761 L 811 2741 Z",
    labelX: 831.3,
    labelY: 2730,
    shortLabel: "L13"
  },
  "incheon-l12": {
    d: "M 836 2779 L 839 2770 L 840 2769 L 867 2751 L 871 2750 L 877 2759 L 891 2781 L 891 2796 L 890 2797 L 881 2803 L 865 2813 L 860 2815 L 858 2814 L 852 2805 Z",
    labelX: 864.3,
    labelY: 2782.4,
    shortLabel: "L12"
  },
  "incheon-l11": {
    d: "M 869 2830 L 872 2824 L 873 2823 L 882 2817 L 898 2807 L 905 2803 L 911 2812 L 925 2834 L 929 2842 L 911 2854 L 894 2865 L 887 2860 L 880 2849 L 872 2836 Z",
    labelX: 897.8,
    labelY: 2834.8,
    shortLabel: "L11"
  },
  "incheon-l10": {
    d: "M 899 2878 L 903 2874 L 930 2856 L 939 2856 L 952 2876 L 959 2887 L 961 2891 L 955 2897 L 928 2915 L 924 2916 L 919 2909 L 906 2889 Z",
    labelX: 930.1,
    labelY: 2883.8,
    shortLabel: "L10"
  },
  "incheon-l9": {
    d: "M 932 2929 L 937 2924 L 956 2911 L 965 2905 L 969 2904 L 973 2909 L 991 2936 L 995 2944 L 989 2950 L 967 2966 L 959 2971 L 941 2944 L 934 2933 Z",
    labelX: 963.6,
    labelY: 2936.5,
    shortLabel: "L9"
  },
  "incheon-l8": {
    d: "M 968 2983 L 977 2974 L 997 2960 L 1004 2956 L 1028 2989 L 1030 2993 L 1005 3012 L 994 3020 L 990 3015 L 981 3003 L 971 2989 Z",
    labelX: 998.4,
    labelY: 2987.2,
    shortLabel: "L8"
  },
  "incheon-l7": {
    d: "M 1003 3032 L 1013 3022 L 1026 3012 L 1038 3003 L 1040 3004 L 1070 3040 L 1074 3045 L 1062 3057 L 1046 3070 L 1038 3075 L 1035 3072 L 1028 3064 L 1008 3039 Z",
    labelX: 1038.5,
    labelY: 3039.1,
    shortLabel: "L7"
  },
  "incheon-l6": {
    d: "M 1048 3086 L 1058 3076 L 1075 3062 L 1087 3059 L 1117 3089 L 1091 3118 L 1085 3124 L 1049 3088 Z",
    labelX: 1082.4,
    labelY: 3088.5,
    shortLabel: "L6"
  },
  "incheon-l5": {
    d: "M 1094 3133 L 1126 3098 L 1131 3102 L 1166 3133 L 1167 3138 L 1150 3161 L 1141 3173 L 1137 3171 L 1132 3167 L 1108 3146 Z",
    labelX: 1131.8,
    labelY: 3135.2,
    shortLabel: "L5"
  },
  "incheon-l4": {
    d: "M 751 2537 L 767 2527 L 772 2525 L 776 2527 L 780 2532 L 788 2545 L 789 2547 L 789 2550 L 786 2559 L 777 2565 L 762 2556 L 759 2553 L 751 2540 Z",
    labelX: 771,
    labelY: 2542.6,
    shortLabel: "L4"
  },
  "incheon-l3": {
    d: "M 766 2564 L 768 2562 L 795 2556 L 803 2569 L 797 2575 L 781 2585 L 773 2575 Z",
    labelX: 786.6,
    labelY: 2571.2,
    shortLabel: "L3"
  },
  "incheon-l2": {
    d: "M 787 2597 L 790 2594 L 806 2584 L 810 2583 L 812 2584 L 836 2623 L 831 2628 L 823 2633 L 816 2637 L 810 2634 L 806 2629 L 799 2618 L 791 2605 Z",
    labelX: 810.6,
    labelY: 2612,
    shortLabel: "L2"
  },
  "incheon-l1": {
    d: "M 820 2651 L 824 2647 L 840 2637 L 845 2638 L 848 2641 L 869 2674 L 867 2679 L 863 2683 L 855 2688 L 848 2692 L 846 2691 L 840 2682 Z",
    labelX: 846.1,
    labelY: 2663.6,
    shortLabel: "L1"
  },
  "incheon-r1": {
    d: "M 1959 3264 L 1960 3263 L 2010 3243 L 2012 3244 L 2027 3274 L 2031 3285 L 2025 3288 L 2005 3296 L 1986 3303 L 1977 3306 L 1972 3305 L 1971 3303 L 1961 3271 Z",
    labelX: 1994.6,
    labelY: 3275.2,
    shortLabel: "R1"
  },
  "incheon-r2": {
    d: "M 2024 3238 L 2026 3236 L 2067 3216 L 2080 3224 L 2096 3253 L 2094 3255 L 2087 3259 L 2063 3271 L 2047 3278 L 2043 3279 L 2039 3271 Z",
    labelX: 2060.2,
    labelY: 3246.1,
    shortLabel: "R2"
  },
  "incheon-r3": {
    d: "M 2085 3207 L 2088 3204 L 2119 3185 L 2126 3181 L 2130 3183 L 2146 3209 L 2152 3221 L 2143 3227 L 2128 3236 L 2114 3244 L 2108 3247 L 2106 3246 L 2088 3213 Z",
    labelX: 2118.6,
    labelY: 3213.7,
    shortLabel: "R3"
  },
  "incheon-r4": {
    d: "M 2139 3174 L 2146 3167 L 2168 3151 L 2180 3145 L 2194 3164 L 2204 3178 L 2206 3182 L 2193 3192 L 2181 3201 L 2170 3209 L 2163 3213 Z",
    labelX: 2172.2,
    labelY: 3177.8,
    shortLabel: "R4"
  },
  "incheon-r5": {
    d: "M 2189 3136 L 2197 3128 L 2223 3105 L 2232 3099 L 2261 3130 L 2247 3147 L 2238 3156 L 2219 3172 L 2216 3172 L 2213 3169 L 2190 3138 Z",
    labelX: 2225.2,
    labelY: 3135.7,
    shortLabel: "R5"
  },
  "incheon-r6": {
    d: "M 2241 3090 L 2278 3059 L 2298 3075 L 2306 3082 L 2296 3101 L 2286 3111 L 2271 3123 L 2268 3120 L 2255 3106 L 2245 3095 Z",
    labelX: 2274.5,
    labelY: 3089,
    shortLabel: "R6"
  },
  "incheon-r7": {
    d: "M 2283 3045 L 2312 3010 L 2319 3003 L 2321 3004 L 2348 3025 L 2353 3029 L 2349 3039 L 2339 3052 L 2323 3071 L 2319 3075 L 2315 3073 L 2305 3065 L 2287 3050 L 2284 3047 Z",
    labelX: 2319.3,
    labelY: 3038.7,
    shortLabel: "R7"
  },
  "incheon-r8": {
    d: "M 2327 2992 L 2342 2971 L 2350 2960 L 2352 2958 L 2356 2957 L 2384 2977 L 2389 2981 L 2384 2992 L 2368 3014 L 2365 3017 L 2361 3018 L 2359 3017 L 2352 3012 L 2335 2999 Z",
    labelX: 2359,
    labelY: 2987.2,
    shortLabel: "R8"
  },
  "incheon-r9": {
    d: "M 2362 2942 L 2380 2915 L 2387 2905 L 2389 2903 L 2407 2915 L 2423 2926 L 2424 2928 L 2424 2931 L 2414 2947 L 2402 2965 L 2400 2967 L 2395 2969 L 2393 2968 L 2372 2953 Z",
    labelX: 2393.2,
    labelY: 2936.5,
    shortLabel: "R9"
  },
  "incheon-r10": {
    d: "M 2396 2893 L 2397 2889 L 2402 2881 L 2413 2864 L 2419 2855 L 2420 2854 L 2423 2854 L 2427 2856 L 2456 2875 L 2457 2877 L 2456 2881 L 2446 2897 L 2435 2914 L 2432 2917 Z",
    labelX: 2426.4,
    labelY: 2884.7,
    shortLabel: "R10"
  },
  "incheon-r11": {
    d: "M 2429 2839 L 2439 2823 L 2450 2806 L 2453 2803 L 2486 2824 L 2489 2827 L 2489 2830 L 2469 2862 L 2465 2866 L 2463 2865 L 2434 2846 L 2429 2842 Z",
    labelX: 2459.8,
    labelY: 2833.8,
    shortLabel: "R11"
  },
  "incheon-r12": {
    d: "M 2461 2789 L 2466 2781 L 2482 2756 L 2488 2750 L 2490 2751 L 2510 2764 L 2519 2770 L 2521 2780 L 2516 2788 L 2505 2805 L 2499 2814 L 2498 2815 L 2495 2815 L 2462 2794 Z",
    labelX: 2492.6,
    labelY: 2782.2,
    shortLabel: "R12"
  },
  "incheon-r13": {
    d: "M 2494 2738 L 2514 2706 L 2516 2704 L 2525 2701 L 2529 2703 L 2556 2721 L 2557 2723 L 2553 2730 L 2548 2738 L 2537 2755 L 2530 2762 L 2524 2759 L 2497 2741 Z",
    labelX: 2526.1,
    labelY: 2729.9,
    shortLabel: "R13"
  },
  "incheon-r14": {
    d: "M 2528 2686 L 2532 2679 L 2557 2639 L 2565 2643 L 2576 2650 L 2594 2662 L 2595 2664 L 2591 2671 L 2570 2704 L 2568 2706 L 2560 2708 L 2556 2706 L 2545 2699 L 2536 2693 Z",
    labelX: 2561.4,
    labelY: 2674.7,
    shortLabel: "R14"
  },
  "incheon-r15": {
    d: "M 2567 2629 L 2568 2622 L 2588 2590 L 2590 2588 L 2597 2584 L 2601 2586 L 2630 2605 L 2628 2613 L 2606 2647 L 2601 2652 L 2581 2639 L 2572 2633 Z",
    labelX: 2598.3,
    labelY: 2617,
    shortLabel: "R15"
  },
  "incheon-r16": {
    d: "M 2603 2566 L 2608 2558 L 2624 2533 L 2628 2529 L 2634 2532 L 2649 2541 L 2662 2549 L 2663 2557 L 2641 2591 L 2637 2595 L 2617 2582 L 2608 2576 L 2603 2572 Z",
    labelX: 2632.6,
    labelY: 2561,
    shortLabel: "R16"
  },
  "incheon-r17": {
    d: "M 2636 2518 L 2638 2510 L 2652 2487 L 2662 2471 L 2676 2478 L 2689 2486 L 2700 2493 L 2701 2495 L 2676 2535 L 2670 2541 L 2650 2528 L 2641 2522 Z",
    labelX: 2667.8,
    labelY: 2505.7,
    shortLabel: "R17"
  },
  "incheon-r18": {
    d: "M 2670 2457 L 2674 2450 L 2692 2420 L 2697 2412 L 2698 2411 L 2710 2417 L 2738 2434 L 2730 2448 L 2710 2480 L 2709 2481 L 2702 2479 L 2696 2476 L 2670 2460 Z",
    labelX: 2703.3,
    labelY: 2446.5,
    shortLabel: "R18"
  },
  "incheon-c2": {
    d: "M 1398 3306 L 1408 3275 L 1416 3270 L 1783 3305 L 1785 3324 L 1783 3347 L 1750 3350 L 1712 3352 L 1611 3351 L 1580 3349 L 1542 3345 L 1508 3340 L 1444 3326 L 1414 3317 Z",
    labelX: 1590.3,
    labelY: 3320.7,
    shortLabel: "C2"
  },
  "incheon-c1": {
    d: "M 1796 3304 L 1798 3302 L 1802 3301 L 1947 3267 L 1958 3301 L 1960 3308 L 1959 3312 L 1937 3319 L 1912 3326 L 1877 3334 L 1844 3340 L 1806 3345 L 1800 3345 L 1799 3343 Z",
    labelX: 1877.6,
    labelY: 3309,
    shortLabel: "C1"
  },
  "incheon-party-deck": {
    d: "M 1160 1351 L 1165 1346 L 1257 1308 L 1322 1285 L 1365 1272 L 1409 1261 L 1450 1253 L 1502 1246 L 1564 1241 L 1598 1240 L 1599 1248 L 1602 1290 L 1600 1298 L 1187 1402 Z",
    labelX: 1385.5,
    labelY: 1306.7,
    shortLabel: "외야파티덱"
  },
  "incheon-choga": {
    d: "M 1007 1435 L 1027 1421 L 1054 1403 L 1062 1398 L 1090 1382 L 1109 1372 L 1126 1364 L 1151 1354 L 1153 1355 L 1176 1401 L 1175 1408 L 1050 1482 L 1046 1480 L 1012 1442 Z",
    labelX: 1092.5,
    labelY: 1416.7,
    shortLabel: "초가정자"
  },
  "incheon-home-run-third": {
    d: "M 1025 1654 L 1030 1643 L 1099 1574 L 1128 1551 L 1169 1522 L 1223 1489 L 1273 1463 L 1346 1432 L 1400 1414 L 1475 1396 L 1538 1387 L 1604 1384 L 1608 1395 L 1609 1445 Z",
    labelX: 1321.8,
    labelY: 1499.3,
    shortLabel: "홈런커플존"
  },
  "incheon-home-run-first": {
    d: "M 1754 1414 L 1756 1391 L 1770 1389 L 1852 1397 L 1928 1411 L 1983 1425 L 2055 1449 L 2120 1477 L 2184 1512 L 2236 1547 L 2271 1575 L 2323 1625 L 2323 1649 L 1758 1446 Z",
    labelX: 2051.1,
    labelY: 1505.1,
    shortLabel: "홈런커플존"
  },
  "incheon-outfield-family-zone": {
    d: "M 2096 1450 L 2099 1441 L 2176 1424 L 2232 1455 L 2263 1475 L 2303 1504 L 2366 1561 L 2396 1594 L 2425 1628 L 2439 1647 L 2474 1699 L 2475 1713 L 2464 1721 L 2423 1741 Z",
    labelX: 2295.9,
    labelY: 1560.4,
    shortLabel: "외야패밀리존"
  },
  "incheon-bbq-dodram": {
    d: "M 2121 1386 L 2141 1336 L 2153 1339 L 2188 1355 L 2230 1376 L 2253 1389 L 2253 1392 L 2229 1440 L 2228 1441 L 2223 1440 L 2217 1437 L 2122 1388 Z",
    labelX: 2184.2,
    labelY: 1387.4,
    shortLabel: "도드람BBQ"
  },
  "incheon-bbq-emart": {
    d: "M 2232 1443 L 2256 1395 L 2265 1395 L 2291 1411 L 2322 1431 L 2338 1442 L 2357 1456 L 2408 1498 L 2419 1508 L 2460 1548 L 2461 1550 L 2414 1594 L 2410 1595 L 2241 1452 Z",
    labelX: 2346,
    labelY: 1493.1,
    shortLabel: "이마트BBQ"
  },
  "incheon-friendly-zone": {
    d: "M 2223 2526 L 2404 2225 L 2410 2225 L 2455 2249 L 2456 2251 L 2438 2293 L 2420 2332 L 2388 2397 L 2374 2423 L 2349 2466 L 2297 2548 L 2284 2567 L 2268 2589 L 2253 2577 Z",
    labelX: 2338.1,
    labelY: 2415.5,
    shortLabel: "프렌들리존"
  },
  "incheon-mollys-green-zone": {
    d: "M 719 1792 L 722 1783 L 738 1749 L 757 1715 L 783 1674 L 808 1637 L 835 1601 L 861 1569 L 927 1500 L 973 1460 L 999 1440 L 1007 1447 L 1038 1482 L 797 1807 Z",
    labelX: 872.4,
    labelY: 1627.5,
    shortLabel: "그린존"
  },
  "incheon-accessible-25b": {
    d: "M 1141 2816 L 1204 2816 L 1210 2822 L 1210 2884 L 1204 2890 L 1141 2890 L 1135 2884 L 1135 2822 Z",
    labelX: 1172,
    labelY: 2853,
    shortLabel: "휠체어"
  },
  "incheon-accessible-23b": {
    d: "M 1231 2922 L 1294 2922 L 1300 2928 L 1300 2992 L 1294 2998 L 1231 2998 L 1225 2992 L 1225 2928 Z",
    labelX: 1262,
    labelY: 2960,
    shortLabel: "휠체어"
  },
  "incheon-accessible-9b": {
    d: "M 2134 2918 L 2197 2918 L 2203 2924 L 2203 2989 L 2197 2995 L 2134 2995 L 2128 2989 L 2128 2924 Z",
    labelX: 2165,
    labelY: 2956,
    shortLabel: "휠체어"
  }
};

const INCHEON_IMAGE_GEOMETRY: Record<string, IncheonImageGeometry> = Object.fromEntries(
  Object.entries(INCHEON_IMAGE_GEOMETRY_DRAFTS).map(([id, geometry]) => [
    id,
    {
      ...geometry,
      labelFontSize: geometry.labelFontSize ?? 18,
      shortLabel: geometry.shortLabel ?? id.replace('incheon-', '').toUpperCase(),
    },
  ]),
) as Record<string, IncheonImageGeometry>;

const INCHEON_BLOCK_DEFINITIONS: IncheonBlockDefinition[] = [
  {
    id: "incheon-114b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "114B 외야 필드석",
    block: "114B",
    officialBlocks: [
      "114B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "114B",
      "114B블록",
      "인천 114B",
      "SSG 114B",
      "114B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-113b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "113B 외야 필드석",
    block: "113B",
    officialBlocks: [
      "113B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "113B",
      "113B블록",
      "인천 113B",
      "SSG 113B",
      "113B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-112b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "112B 외야 필드석",
    block: "112B",
    officialBlocks: [
      "112B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "112B",
      "112B블록",
      "인천 112B",
      "SSG 112B",
      "112B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-111b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "111B 외야 필드석",
    block: "111B",
    officialBlocks: [
      "111B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "111B",
      "111B블록",
      "인천 111B",
      "SSG 111B",
      "111B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-110b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "110B 외야 필드석",
    block: "110B",
    officialBlocks: [
      "110B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "110B",
      "110B블록",
      "인천 110B",
      "SSG 110B",
      "110B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-109b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "109B 외야 필드석",
    block: "109B",
    officialBlocks: [
      "109B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "109B",
      "109B블록",
      "인천 109B",
      "SSG 109B",
      "109B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-108b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "108B 외야 필드석",
    block: "108B",
    officialBlocks: [
      "108B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "108B",
      "108B블록",
      "인천 108B",
      "SSG 108B",
      "108B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-107b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "107B 외야 필드석",
    block: "107B",
    officialBlocks: [
      "107B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "107B",
      "107B블록",
      "인천 107B",
      "SSG 107B",
      "107B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-106b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "106B 외야 필드석",
    block: "106B",
    officialBlocks: [
      "106B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "106B",
      "106B블록",
      "인천 106B",
      "SSG 106B",
      "106B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-105b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "105B 외야 필드석",
    block: "105B",
    officialBlocks: [
      "105B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "105B",
      "105B블록",
      "인천 105B",
      "SSG 105B",
      "105B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-104b",
    level: "1F",
    category: "OUTFIELD_FIELD",
    name: "104B 외야 필드석",
    block: "104B",
    officialBlocks: [
      "104B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "104B",
      "104B블록",
      "인천 104B",
      "SSG 104B",
      "104B 외야 필드석",
      "외야 필드석"
    ]
  },
  {
    id: "incheon-209b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "209B 내야 필드석",
    block: "209B",
    officialBlocks: [
      "209B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "209B",
      "209B블록",
      "인천 209B",
      "SSG 209B",
      "209B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-208b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "208B 내야 필드석",
    block: "208B",
    officialBlocks: [
      "208B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "208B",
      "208B블록",
      "인천 208B",
      "SSG 208B",
      "208B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-207b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "207B 내야 필드석",
    block: "207B",
    officialBlocks: [
      "207B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "207B",
      "207B블록",
      "인천 207B",
      "SSG 207B",
      "207B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-206b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "206B 내야 필드석",
    block: "206B",
    officialBlocks: [
      "206B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "206B",
      "206B블록",
      "인천 206B",
      "SSG 206B",
      "206B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-205b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "205B 내야 필드석",
    block: "205B",
    officialBlocks: [
      "205B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "205B",
      "205B블록",
      "인천 205B",
      "SSG 205B",
      "205B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-204b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "204B 내야 필드석",
    block: "204B",
    officialBlocks: [
      "204B"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "204B",
      "204B블록",
      "인천 204B",
      "SSG 204B",
      "204B 내야 필드석",
      "내야 필드석",
      "2층 필드석"
    ]
  },
  {
    id: "incheon-103b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "103B 내야 필드석",
    block: "103B",
    officialBlocks: [
      "103B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "103B",
      "103B블록",
      "인천 103B",
      "SSG 103B",
      "103B 내야 필드석",
      "내야 필드석",
      "1루 내야 필드석",
      "홈팀 1루"
    ]
  },
  {
    id: "incheon-102b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "102B 내야 필드석",
    block: "102B",
    officialBlocks: [
      "102B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "102B",
      "102B블록",
      "인천 102B",
      "SSG 102B",
      "102B 내야 필드석",
      "내야 필드석",
      "1루 내야 필드석",
      "홈팀 1루"
    ]
  },
  {
    id: "incheon-101b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "101B 내야 필드석",
    block: "101B",
    officialBlocks: [
      "101B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "101B",
      "101B블록",
      "인천 101B",
      "SSG 101B",
      "101B 내야 필드석",
      "내야 필드석",
      "1루 내야 필드석",
      "홈팀 1루"
    ]
  },
  {
    id: "incheon-203b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "203B 내야 필드석",
    block: "203B",
    officialBlocks: [
      "203B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "203B",
      "203B블록",
      "인천 203B",
      "SSG 203B",
      "203B 내야 필드석",
      "내야 필드석",
      "1루 2층 내야 필드석"
    ]
  },
  {
    id: "incheon-202b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "202B 내야 필드석",
    block: "202B",
    officialBlocks: [
      "202B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "202B",
      "202B블록",
      "인천 202B",
      "SSG 202B",
      "202B 내야 필드석",
      "내야 필드석",
      "1루 2층 내야 필드석"
    ]
  },
  {
    id: "incheon-201b",
    level: "2F",
    category: "INFIELD_FIELD",
    name: "201B 내야 필드석",
    block: "201B",
    officialBlocks: [
      "201B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "201B",
      "201B블록",
      "인천 201B",
      "SSG 201B",
      "201B 내야 필드석",
      "내야 필드석",
      "1루 2층 내야 필드석"
    ]
  },
  {
    id: "incheon-115b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "115B 내야 필드석",
    block: "115B",
    officialBlocks: [
      "115B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "115B",
      "115B블록",
      "인천 115B",
      "SSG 115B",
      "115B 내야 필드석",
      "내야 필드석",
      "3루 내야 필드석",
      "원정팀 3루"
    ]
  },
  {
    id: "incheon-116b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "116B 내야 필드석",
    block: "116B",
    officialBlocks: [
      "116B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "116B",
      "116B블록",
      "인천 116B",
      "SSG 116B",
      "116B 내야 필드석",
      "내야 필드석",
      "3루 내야 필드석",
      "원정팀 3루"
    ]
  },
  {
    id: "incheon-117b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "117B 내야 필드석",
    block: "117B",
    officialBlocks: [
      "117B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "117B",
      "117B블록",
      "인천 117B",
      "SSG 117B",
      "117B 내야 필드석",
      "내야 필드석",
      "3루 내야 필드석",
      "원정팀 3루"
    ]
  },
  {
    id: "incheon-118b",
    level: "1F",
    category: "INFIELD_FIELD",
    name: "118B 내야 필드석",
    block: "118B",
    officialBlocks: [
      "118B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "118B",
      "118B블록",
      "인천 118B",
      "SSG 118B",
      "118B 내야 필드석",
      "내야 필드석",
      "3루 내야 필드석",
      "원정팀 3루"
    ]
  },
  {
    id: "incheon-n4",
    level: "1F",
    category: "CHEERING",
    name: "N4 으쓱이존",
    block: "N4",
    officialBlocks: [
      "N4"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "N4",
      "N4블록",
      "인천 N4",
      "SSG N4",
      "N4 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-n3",
    level: "1F",
    category: "CHEERING",
    name: "N3 으쓱이존",
    block: "N3",
    officialBlocks: [
      "N3"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "N3",
      "N3블록",
      "인천 N3",
      "SSG N3",
      "N3 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-n2",
    level: "1F",
    category: "CHEERING",
    name: "N2 으쓱이존",
    block: "N2",
    officialBlocks: [
      "N2"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "N2",
      "N2블록",
      "인천 N2",
      "SSG N2",
      "N2 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-n1",
    level: "1F",
    category: "CHEERING",
    name: "N1 으쓱이존",
    block: "N1",
    officialBlocks: [
      "N1"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "N1",
      "N1블록",
      "인천 N1",
      "SSG N1",
      "N1 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-1b",
    level: "1F",
    category: "CHEERING",
    name: "1B 으쓱이존",
    block: "1B",
    officialBlocks: [
      "1B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "1B",
      "1B블록",
      "인천 1B",
      "SSG 1B",
      "1B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-2b",
    level: "1F",
    category: "CHEERING",
    name: "2B 으쓱이존",
    block: "2B",
    officialBlocks: [
      "2B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "2B",
      "2B블록",
      "인천 2B",
      "SSG 2B",
      "2B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-3b",
    level: "1F",
    category: "CHEERING",
    name: "3B 으쓱이존",
    block: "3B",
    officialBlocks: [
      "3B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "3B",
      "3B블록",
      "인천 3B",
      "SSG 3B",
      "3B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-4b",
    level: "1F",
    category: "CHEERING",
    name: "4B 으쓱이존",
    block: "4B",
    officialBlocks: [
      "4B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "4B",
      "4B블록",
      "인천 4B",
      "SSG 4B",
      "4B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-5b",
    level: "1F",
    category: "CHEERING",
    name: "5B 으쓱이존",
    block: "5B",
    officialBlocks: [
      "5B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "5B",
      "5B블록",
      "인천 5B",
      "SSG 5B",
      "5B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-6b",
    level: "1F",
    category: "CHEERING",
    name: "6B 으쓱이존",
    block: "6B",
    officialBlocks: [
      "6B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "6B",
      "6B블록",
      "인천 6B",
      "SSG 6B",
      "6B 으쓱이존",
      "으쓱이존",
      "1루 응원석",
      "홈 응원석"
    ]
  },
  {
    id: "incheon-27b",
    level: "1F",
    category: "AWAY",
    name: "27B 원정응원석",
    block: "27B",
    officialBlocks: [
      "27B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "27B",
      "27B블록",
      "인천 27B",
      "SSG 27B",
      "27B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-28b",
    level: "1F",
    category: "AWAY",
    name: "28B 원정응원석",
    block: "28B",
    officialBlocks: [
      "28B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "28B",
      "28B블록",
      "인천 28B",
      "SSG 28B",
      "28B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-29b",
    level: "1F",
    category: "AWAY",
    name: "29B 원정응원석",
    block: "29B",
    officialBlocks: [
      "29B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "29B",
      "29B블록",
      "인천 29B",
      "SSG 29B",
      "29B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-30b",
    level: "1F",
    category: "AWAY",
    name: "30B 원정응원석",
    block: "30B",
    officialBlocks: [
      "30B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "30B",
      "30B블록",
      "인천 30B",
      "SSG 30B",
      "30B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-31b",
    level: "1F",
    category: "AWAY",
    name: "31B 원정응원석",
    block: "31B",
    officialBlocks: [
      "31B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "31B",
      "31B블록",
      "인천 31B",
      "SSG 31B",
      "31B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-32b",
    level: "1F",
    category: "AWAY",
    name: "32B 원정응원석",
    block: "32B",
    officialBlocks: [
      "32B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "32B",
      "32B블록",
      "인천 32B",
      "SSG 32B",
      "32B 원정응원석",
      "원정응원석",
      "3루 원정",
      "원정 응원석"
    ]
  },
  {
    id: "incheon-25b",
    level: "1F",
    category: "DUGOUT",
    name: "25B 덕아웃 상단석",
    block: "25B",
    officialBlocks: [
      "25B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "25B",
      "25B블록",
      "인천 25B",
      "SSG 25B",
      "25B 덕아웃 상단석",
      "덕아웃 상단석"
    ]
  },
  {
    id: "incheon-23b",
    level: "1F",
    category: "DUGOUT",
    name: "23B 덕아웃 상단석",
    block: "23B",
    officialBlocks: [
      "23B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "23B",
      "23B블록",
      "인천 23B",
      "SSG 23B",
      "23B 덕아웃 상단석",
      "덕아웃 상단석"
    ]
  },
  {
    id: "incheon-21b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "21B 피코크 테이블석",
    block: "21B",
    officialBlocks: [
      "21B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "21B",
      "21B블록",
      "인천 21B",
      "SSG 21B",
      "21B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-19b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "19B 피코크 테이블석",
    block: "19B",
    officialBlocks: [
      "19B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "19B",
      "19B블록",
      "인천 19B",
      "SSG 19B",
      "19B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-17b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "17B 피코크 테이블석",
    block: "17B",
    officialBlocks: [
      "17B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "17B",
      "17B블록",
      "인천 17B",
      "SSG 17B",
      "17B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-15b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "15B 피코크 테이블석",
    block: "15B",
    officialBlocks: [
      "15B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "15B",
      "15B블록",
      "인천 15B",
      "SSG 15B",
      "15B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-13b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "13B 피코크 테이블석",
    block: "13B",
    officialBlocks: [
      "13B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "13B",
      "13B블록",
      "인천 13B",
      "SSG 13B",
      "13B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-11b",
    level: "1F",
    category: "PEACOCK_TABLE",
    name: "11B 피코크 테이블석",
    block: "11B",
    officialBlocks: [
      "11B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "11B",
      "11B블록",
      "인천 11B",
      "SSG 11B",
      "11B 피코크 테이블석",
      "피코크 테이블석",
      "1층 테이블석"
    ]
  },
  {
    id: "incheon-9b",
    level: "1F",
    category: "DUGOUT",
    name: "9B 덕아웃 상단석",
    block: "9B",
    officialBlocks: [
      "9B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "9B",
      "9B블록",
      "인천 9B",
      "SSG 9B",
      "9B 덕아웃 상단석",
      "덕아웃 상단석"
    ]
  },
  {
    id: "incheon-7b",
    level: "1F",
    category: "DUGOUT",
    name: "7B 덕아웃 상단석",
    block: "7B",
    officialBlocks: [
      "7B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "7B",
      "7B블록",
      "인천 7B",
      "SSG 7B",
      "7B 덕아웃 상단석",
      "덕아웃 상단석"
    ]
  },
  {
    id: "incheon-22b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "22B 노브랜드 테이블석",
    block: "22B",
    officialBlocks: [
      "22B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "22B",
      "22B블록",
      "인천 22B",
      "SSG 22B",
      "22B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-20b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "20B 노브랜드 테이블석",
    block: "20B",
    officialBlocks: [
      "20B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "20B",
      "20B블록",
      "인천 20B",
      "SSG 20B",
      "20B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-18b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "18B 노브랜드 테이블석",
    block: "18B",
    officialBlocks: [
      "18B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "18B",
      "18B블록",
      "인천 18B",
      "SSG 18B",
      "18B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-16b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "16B 노브랜드 테이블석",
    block: "16B",
    officialBlocks: [
      "16B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "16B",
      "16B블록",
      "인천 16B",
      "SSG 16B",
      "16B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-14b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "14B 노브랜드 테이블석",
    block: "14B",
    officialBlocks: [
      "14B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "14B",
      "14B블록",
      "인천 14B",
      "SSG 14B",
      "14B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-12b",
    level: "2F",
    category: "NOBRAND_TABLE",
    name: "12B 노브랜드 테이블석",
    block: "12B",
    officialBlocks: [
      "12B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "12B",
      "12B블록",
      "인천 12B",
      "SSG 12B",
      "12B 노브랜드 테이블석",
      "노브랜드 테이블석",
      "2층 테이블석"
    ]
  },
  {
    id: "incheon-26b",
    level: "1F",
    category: "FAMILY_TABLE",
    name: "26B 요기요 내야패밀리존",
    block: "26B",
    officialBlocks: [
      "26B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "26B",
      "26B블록",
      "인천 26B",
      "SSG 26B",
      "26B 요기요 내야패밀리존",
      "요기요 내야패밀리존",
      "3루 내야패밀리존"
    ]
  },
  {
    id: "incheon-24b",
    level: "1F",
    category: "FAMILY_TABLE",
    name: "24B 요기요 내야패밀리존",
    block: "24B",
    officialBlocks: [
      "24B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "24B",
      "24B블록",
      "인천 24B",
      "SSG 24B",
      "24B 요기요 내야패밀리존",
      "요기요 내야패밀리존",
      "3루 내야패밀리존"
    ]
  },
  {
    id: "incheon-10b",
    level: "1F",
    category: "FAMILY_TABLE",
    name: "10B 요기요 내야패밀리존",
    block: "10B",
    officialBlocks: [
      "10B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "10B",
      "10B블록",
      "인천 10B",
      "SSG 10B",
      "10B 요기요 내야패밀리존",
      "요기요 내야패밀리존",
      "1루 내야패밀리존"
    ]
  },
  {
    id: "incheon-8b",
    level: "1F",
    category: "FAMILY_TABLE",
    name: "8B 요기요 내야패밀리존",
    block: "8B",
    officialBlocks: [
      "8B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "8B",
      "8B블록",
      "인천 8B",
      "SSG 8B",
      "8B 요기요 내야패밀리존",
      "요기요 내야패밀리존",
      "1루 내야패밀리존"
    ]
  },
  {
    id: "incheon-v6",
    level: "1F",
    category: "LIVE",
    name: "V6 랜더스 라이브존",
    block: "V6",
    officialBlocks: [
      "V6"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V6",
      "V6블록",
      "인천 V6",
      "SSG V6",
      "V6 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-v5",
    level: "1F",
    category: "LIVE",
    name: "V5 랜더스 라이브존",
    block: "V5",
    officialBlocks: [
      "V5"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V5",
      "V5블록",
      "인천 V5",
      "SSG V5",
      "V5 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-v4",
    level: "1F",
    category: "LIVE",
    name: "V4 랜더스 라이브존",
    block: "V4",
    officialBlocks: [
      "V4"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V4",
      "V4블록",
      "인천 V4",
      "SSG V4",
      "V4 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-v3",
    level: "1F",
    category: "LIVE",
    name: "V3 랜더스 라이브존",
    block: "V3",
    officialBlocks: [
      "V3"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V3",
      "V3블록",
      "인천 V3",
      "SSG V3",
      "V3 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-v2",
    level: "1F",
    category: "LIVE",
    name: "V2 랜더스 라이브존",
    block: "V2",
    officialBlocks: [
      "V2"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V2",
      "V2블록",
      "인천 V2",
      "SSG V2",
      "V2 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-v1",
    level: "1F",
    category: "LIVE",
    name: "V1 랜더스 라이브존",
    block: "V1",
    officialBlocks: [
      "V1"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "V1",
      "V1블록",
      "인천 V1",
      "SSG V1",
      "V1 랜더스 라이브존",
      "랜더스 라이브존"
    ]
  },
  {
    id: "incheon-l18",
    level: "3F",
    category: "SKYBOX",
    name: "L18 스카이박스",
    block: "L18",
    officialBlocks: [
      "L18"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L18",
      "L18블록",
      "인천 L18",
      "SSG L18",
      "L18 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l17",
    level: "3F",
    category: "SKYBOX",
    name: "L17 스카이박스",
    block: "L17",
    officialBlocks: [
      "L17"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L17",
      "L17블록",
      "인천 L17",
      "SSG L17",
      "L17 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l16",
    level: "3F",
    category: "SKYBOX",
    name: "L16 스카이박스",
    block: "L16",
    officialBlocks: [
      "L16"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L16",
      "L16블록",
      "인천 L16",
      "SSG L16",
      "L16 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l15",
    level: "3F",
    category: "SKYBOX",
    name: "L15 스카이박스",
    block: "L15",
    officialBlocks: [
      "L15"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L15",
      "L15블록",
      "인천 L15",
      "SSG L15",
      "L15 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l14",
    level: "3F",
    category: "SKYBOX",
    name: "L14 스카이박스",
    block: "L14",
    officialBlocks: [
      "L14"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L14",
      "L14블록",
      "인천 L14",
      "SSG L14",
      "L14 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l13",
    level: "3F",
    category: "SKYBOX",
    name: "L13 스카이박스",
    block: "L13",
    officialBlocks: [
      "L13"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L13",
      "L13블록",
      "인천 L13",
      "SSG L13",
      "L13 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l12",
    level: "3F",
    category: "SKYBOX",
    name: "L12 스카이박스",
    block: "L12",
    officialBlocks: [
      "L12"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L12",
      "L12블록",
      "인천 L12",
      "SSG L12",
      "L12 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l11",
    level: "3F",
    category: "SKYBOX",
    name: "L11 스카이박스",
    block: "L11",
    officialBlocks: [
      "L11"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L11",
      "L11블록",
      "인천 L11",
      "SSG L11",
      "L11 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l10",
    level: "3F",
    category: "SKYBOX",
    name: "L10 스카이박스",
    block: "L10",
    officialBlocks: [
      "L10"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L10",
      "L10블록",
      "인천 L10",
      "SSG L10",
      "L10 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l9",
    level: "3F",
    category: "SKYBOX",
    name: "L9 스카이박스",
    block: "L9",
    officialBlocks: [
      "L9"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L9",
      "L9블록",
      "인천 L9",
      "SSG L9",
      "L9 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l8",
    level: "3F",
    category: "SKYBOX",
    name: "L8 스카이박스",
    block: "L8",
    officialBlocks: [
      "L8"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L8",
      "L8블록",
      "인천 L8",
      "SSG L8",
      "L8 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l7",
    level: "3F",
    category: "SKYBOX",
    name: "L7 스카이박스",
    block: "L7",
    officialBlocks: [
      "L7"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L7",
      "L7블록",
      "인천 L7",
      "SSG L7",
      "L7 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l6",
    level: "3F",
    category: "SKYBOX",
    name: "L6 스카이박스",
    block: "L6",
    officialBlocks: [
      "L6"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L6",
      "L6블록",
      "인천 L6",
      "SSG L6",
      "L6 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l5",
    level: "3F",
    category: "SKYBOX",
    name: "L5 스카이박스",
    block: "L5",
    officialBlocks: [
      "L5"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L5",
      "L5블록",
      "인천 L5",
      "SSG L5",
      "L5 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-l4",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "L4 미니스카이박스",
    block: "L4",
    officialBlocks: [
      "L4"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L4",
      "L4블록",
      "인천 L4",
      "SSG L4",
      "L4 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-l3",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "L3 미니스카이박스",
    block: "L3",
    officialBlocks: [
      "L3"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L3",
      "L3블록",
      "인천 L3",
      "SSG L3",
      "L3 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-l2",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "L2 미니스카이박스",
    block: "L2",
    officialBlocks: [
      "L2"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L2",
      "L2블록",
      "인천 L2",
      "SSG L2",
      "L2 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-l1",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "L1 미니스카이박스",
    block: "L1",
    officialBlocks: [
      "L1"
    ],
    side: "THIRD_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "L1",
      "L1블록",
      "인천 L1",
      "SSG L1",
      "L1 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r1",
    level: "3F",
    category: "SKYBOX",
    name: "R1 스카이박스",
    block: "R1",
    officialBlocks: [
      "R1"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R1",
      "R1블록",
      "인천 R1",
      "SSG R1",
      "R1 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r2",
    level: "3F",
    category: "SKYBOX",
    name: "R2 스카이박스",
    block: "R2",
    officialBlocks: [
      "R2"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R2",
      "R2블록",
      "인천 R2",
      "SSG R2",
      "R2 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r3",
    level: "3F",
    category: "SKYBOX",
    name: "R3 스카이박스",
    block: "R3",
    officialBlocks: [
      "R3"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R3",
      "R3블록",
      "인천 R3",
      "SSG R3",
      "R3 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r4",
    level: "3F",
    category: "SKYBOX",
    name: "R4 스카이박스",
    block: "R4",
    officialBlocks: [
      "R4"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R4",
      "R4블록",
      "인천 R4",
      "SSG R4",
      "R4 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r5",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R5 미니스카이박스",
    block: "R5",
    officialBlocks: [
      "R5"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R5",
      "R5블록",
      "인천 R5",
      "SSG R5",
      "R5 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r6",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R6 미니스카이박스",
    block: "R6",
    officialBlocks: [
      "R6"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R6",
      "R6블록",
      "인천 R6",
      "SSG R6",
      "R6 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r7",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R7 미니스카이박스",
    block: "R7",
    officialBlocks: [
      "R7"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R7",
      "R7블록",
      "인천 R7",
      "SSG R7",
      "R7 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r8",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R8 미니스카이박스",
    block: "R8",
    officialBlocks: [
      "R8"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R8",
      "R8블록",
      "인천 R8",
      "SSG R8",
      "R8 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r9",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R9 미니스카이박스",
    block: "R9",
    officialBlocks: [
      "R9"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R9",
      "R9블록",
      "인천 R9",
      "SSG R9",
      "R9 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r10",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R10 미니스카이박스",
    block: "R10",
    officialBlocks: [
      "R10"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R10",
      "R10블록",
      "인천 R10",
      "SSG R10",
      "R10 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r11",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R11 미니스카이박스",
    block: "R11",
    officialBlocks: [
      "R11"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R11",
      "R11블록",
      "인천 R11",
      "SSG R11",
      "R11 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r12",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R12 미니스카이박스",
    block: "R12",
    officialBlocks: [
      "R12"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R12",
      "R12블록",
      "인천 R12",
      "SSG R12",
      "R12 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r13",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R13 미니스카이박스",
    block: "R13",
    officialBlocks: [
      "R13"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R13",
      "R13블록",
      "인천 R13",
      "SSG R13",
      "R13 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r14",
    level: "3F",
    category: "MINI_SKYBOX",
    name: "R14 미니스카이박스",
    block: "R14",
    officialBlocks: [
      "R14"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R14",
      "R14블록",
      "인천 R14",
      "SSG R14",
      "R14 미니스카이박스",
      "미니스카이박스"
    ]
  },
  {
    id: "incheon-r15",
    level: "3F",
    category: "SKYBOX",
    name: "R15 스카이박스",
    block: "R15",
    officialBlocks: [
      "R15"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R15",
      "R15블록",
      "인천 R15",
      "SSG R15",
      "R15 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r16",
    level: "3F",
    category: "SKYBOX",
    name: "R16 스카이박스",
    block: "R16",
    officialBlocks: [
      "R16"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R16",
      "R16블록",
      "인천 R16",
      "SSG R16",
      "R16 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r17",
    level: "3F",
    category: "SKYBOX",
    name: "R17 스카이박스",
    block: "R17",
    officialBlocks: [
      "R17"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R17",
      "R17블록",
      "인천 R17",
      "SSG R17",
      "R17 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-r18",
    level: "3F",
    category: "SKYBOX",
    name: "R18 스카이박스",
    block: "R18",
    officialBlocks: [
      "R18"
    ],
    side: "FIRST_BASE",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "R18",
      "R18블록",
      "인천 R18",
      "SSG R18",
      "R18 스카이박스",
      "스카이박스"
    ]
  },
  {
    id: "incheon-c2",
    level: "3F",
    category: "SKYBOX",
    name: "C2 스카이박스",
    block: "C2",
    officialBlocks: [
      "C2"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "C2",
      "C2블록",
      "인천 C2",
      "SSG C2",
      "C2 스카이박스",
      "스카이박스",
      "중앙 스카이박스"
    ]
  },
  {
    id: "incheon-c1",
    level: "3F",
    category: "SKYBOX",
    name: "C1 스카이박스",
    block: "C1",
    officialBlocks: [
      "C1"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "C1",
      "C1블록",
      "인천 C1",
      "SSG C1",
      "C1 스카이박스",
      "스카이박스",
      "중앙 스카이박스"
    ]
  },
  {
    id: "incheon-36b",
    level: "4F",
    category: "SKY_TABLE",
    name: "36B SKY탁자석",
    block: "36B",
    officialBlocks: [
      "36B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "36B",
      "36B블록",
      "인천 36B",
      "SSG 36B",
      "36B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-37b",
    level: "4F",
    category: "SKY_TABLE",
    name: "37B SKY탁자석",
    block: "37B",
    officialBlocks: [
      "37B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "37B",
      "37B블록",
      "인천 37B",
      "SSG 37B",
      "37B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-38b",
    level: "4F",
    category: "SKY_TABLE",
    name: "38B SKY탁자석",
    block: "38B",
    officialBlocks: [
      "38B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "38B",
      "38B블록",
      "인천 38B",
      "SSG 38B",
      "38B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-39b",
    level: "4F",
    category: "SKY_TABLE",
    name: "39B SKY탁자석",
    block: "39B",
    officialBlocks: [
      "39B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "39B",
      "39B블록",
      "인천 39B",
      "SSG 39B",
      "39B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-40b",
    level: "4F",
    category: "SKY_TABLE",
    name: "40B SKY탁자석",
    block: "40B",
    officialBlocks: [
      "40B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "40B",
      "40B블록",
      "인천 40B",
      "SSG 40B",
      "40B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-41b",
    level: "4F",
    category: "SKY_TABLE",
    name: "41B SKY탁자석",
    block: "41B",
    officialBlocks: [
      "41B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "41B",
      "41B블록",
      "인천 41B",
      "SSG 41B",
      "41B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-42b",
    level: "4F",
    category: "SKY_TABLE",
    name: "42B SKY탁자석",
    block: "42B",
    officialBlocks: [
      "42B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "42B",
      "42B블록",
      "인천 42B",
      "SSG 42B",
      "42B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-43b",
    level: "4F",
    category: "SKY_TABLE",
    name: "43B SKY탁자석",
    block: "43B",
    officialBlocks: [
      "43B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "43B",
      "43B블록",
      "인천 43B",
      "SSG 43B",
      "43B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-44b",
    level: "4F",
    category: "SKY_TABLE",
    name: "44B SKY탁자석",
    block: "44B",
    officialBlocks: [
      "44B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "44B",
      "44B블록",
      "인천 44B",
      "SSG 44B",
      "44B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-45b",
    level: "4F",
    category: "SKY_TABLE",
    name: "45B SKY탁자석",
    block: "45B",
    officialBlocks: [
      "45B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "45B",
      "45B블록",
      "인천 45B",
      "SSG 45B",
      "45B SKY탁자석",
      "SKY탁자석",
      "스카이 탁자석"
    ]
  },
  {
    id: "incheon-301b",
    level: "4F",
    category: "SKY_VIEW",
    name: "301B 4층 SKY뷰석",
    block: "301B",
    officialBlocks: [
      "301B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "301B",
      "301B블록",
      "인천 301B",
      "SSG 301B",
      "301B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-302b",
    level: "4F",
    category: "SKY_VIEW",
    name: "302B 4층 SKY뷰석",
    block: "302B",
    officialBlocks: [
      "302B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "302B",
      "302B블록",
      "인천 302B",
      "SSG 302B",
      "302B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-303b",
    level: "4F",
    category: "SKY_VIEW",
    name: "303B 4층 SKY뷰석",
    block: "303B",
    officialBlocks: [
      "303B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "303B",
      "303B블록",
      "인천 303B",
      "SSG 303B",
      "303B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-304b",
    level: "4F",
    category: "SKY_VIEW",
    name: "304B 4층 SKY뷰석",
    block: "304B",
    officialBlocks: [
      "304B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "304B",
      "304B블록",
      "인천 304B",
      "SSG 304B",
      "304B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-305b",
    level: "4F",
    category: "SKY_VIEW",
    name: "305B 4층 SKY뷰석",
    block: "305B",
    officialBlocks: [
      "305B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "305B",
      "305B블록",
      "인천 305B",
      "SSG 305B",
      "305B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-306b",
    level: "4F",
    category: "SKY_VIEW",
    name: "306B 4층 SKY뷰석",
    block: "306B",
    officialBlocks: [
      "306B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "306B",
      "306B블록",
      "인천 306B",
      "SSG 306B",
      "306B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-307b",
    level: "4F",
    category: "SKY_VIEW",
    name: "307B 4층 SKY뷰석",
    block: "307B",
    officialBlocks: [
      "307B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "307B",
      "307B블록",
      "인천 307B",
      "SSG 307B",
      "307B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-308b",
    level: "4F",
    category: "SKY_VIEW",
    name: "308B 4층 SKY뷰석",
    block: "308B",
    officialBlocks: [
      "308B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "308B",
      "308B블록",
      "인천 308B",
      "SSG 308B",
      "308B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-401b",
    level: "4F",
    category: "SKY_VIEW",
    name: "401B 4층 SKY뷰석",
    block: "401B",
    officialBlocks: [
      "401B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "401B",
      "401B블록",
      "인천 401B",
      "SSG 401B",
      "401B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-402b",
    level: "4F",
    category: "SKY_VIEW",
    name: "402B 4층 SKY뷰석",
    block: "402B",
    officialBlocks: [
      "402B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "402B",
      "402B블록",
      "인천 402B",
      "SSG 402B",
      "402B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-403b",
    level: "4F",
    category: "SKY_VIEW",
    name: "403B 4층 SKY뷰석",
    block: "403B",
    officialBlocks: [
      "403B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "403B",
      "403B블록",
      "인천 403B",
      "SSG 403B",
      "403B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-404b",
    level: "4F",
    category: "SKY_VIEW",
    name: "404B 4층 SKY뷰석",
    block: "404B",
    officialBlocks: [
      "404B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "404B",
      "404B블록",
      "인천 404B",
      "SSG 404B",
      "404B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-405b",
    level: "4F",
    category: "SKY_VIEW",
    name: "405B 4층 SKY뷰석",
    block: "405B",
    officialBlocks: [
      "405B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "405B",
      "405B블록",
      "인천 405B",
      "SSG 405B",
      "405B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-406b",
    level: "4F",
    category: "SKY_VIEW",
    name: "406B 4층 SKY뷰석",
    block: "406B",
    officialBlocks: [
      "406B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "406B",
      "406B블록",
      "인천 406B",
      "SSG 406B",
      "406B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-407b",
    level: "4F",
    category: "SKY_VIEW",
    name: "407B 4층 SKY뷰석",
    block: "407B",
    officialBlocks: [
      "407B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "407B",
      "407B블록",
      "인천 407B",
      "SSG 407B",
      "407B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-408b",
    level: "4F",
    category: "SKY_VIEW",
    name: "408B 4층 SKY뷰석",
    block: "408B",
    officialBlocks: [
      "408B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "408B",
      "408B블록",
      "인천 408B",
      "SSG 408B",
      "408B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-409b",
    level: "4F",
    category: "SKY_VIEW",
    name: "409B 4층 SKY뷰석",
    block: "409B",
    officialBlocks: [
      "409B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "409B",
      "409B블록",
      "인천 409B",
      "SSG 409B",
      "409B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-410b",
    level: "4F",
    category: "SKY_VIEW",
    name: "410B 4층 SKY뷰석",
    block: "410B",
    officialBlocks: [
      "410B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "410B",
      "410B블록",
      "인천 410B",
      "SSG 410B",
      "410B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-411b",
    level: "4F",
    category: "SKY_VIEW",
    name: "411B 4층 SKY뷰석",
    block: "411B",
    officialBlocks: [
      "411B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "411B",
      "411B블록",
      "인천 411B",
      "SSG 411B",
      "411B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-412b",
    level: "4F",
    category: "SKY_VIEW",
    name: "412B 4층 SKY뷰석",
    block: "412B",
    officialBlocks: [
      "412B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "412B",
      "412B블록",
      "인천 412B",
      "SSG 412B",
      "412B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-413b",
    level: "4F",
    category: "SKY_VIEW",
    name: "413B 4층 SKY뷰석",
    block: "413B",
    officialBlocks: [
      "413B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "413B",
      "413B블록",
      "인천 413B",
      "SSG 413B",
      "413B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-414b",
    level: "4F",
    category: "SKY_VIEW",
    name: "414B 4층 SKY뷰석",
    block: "414B",
    officialBlocks: [
      "414B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "414B",
      "414B블록",
      "인천 414B",
      "SSG 414B",
      "414B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-415b",
    level: "4F",
    category: "SKY_VIEW",
    name: "415B 4층 SKY뷰석",
    block: "415B",
    officialBlocks: [
      "415B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "415B",
      "415B블록",
      "인천 415B",
      "SSG 415B",
      "415B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-416b",
    level: "4F",
    category: "SKY_VIEW",
    name: "416B 4층 SKY뷰석",
    block: "416B",
    officialBlocks: [
      "416B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "416B",
      "416B블록",
      "인천 416B",
      "SSG 416B",
      "416B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-417b",
    level: "4F",
    category: "SKY_VIEW",
    name: "417B 4층 SKY뷰석",
    block: "417B",
    officialBlocks: [
      "417B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "417B",
      "417B블록",
      "인천 417B",
      "SSG 417B",
      "417B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-418b",
    level: "4F",
    category: "SKY_VIEW",
    name: "418B 4층 SKY뷰석",
    block: "418B",
    officialBlocks: [
      "418B"
    ],
    side: "CENTER",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "418B",
      "418B블록",
      "인천 418B",
      "SSG 418B",
      "418B 4층 SKY뷰석",
      "4층 SKY뷰석",
      "4층 스카이뷰석"
    ]
  },
  {
    id: "incheon-mollys-green-zone",
    level: "OUTFIELD",
    category: "GREEN",
    name: "몰리스 그린존",
    block: "몰리스 그린존",
    officialBlocks: [
      "몰리스 그린존"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "몰리스 그린존",
      "그린존",
      "인천 그린존"
    ]
  },
  {
    id: "incheon-choga",
    level: "OUTFIELD",
    category: "CHOGA",
    name: "초가정자",
    block: "초가정자",
    officialBlocks: [
      "초가정자"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "초가정자",
      "인천 초가정자"
    ]
  },
  {
    id: "incheon-party-deck",
    level: "OUTFIELD",
    category: "PARTY_DECK",
    name: "로케트배터리 외야파티덱",
    block: "로케트배터리 외야파티덱",
    officialBlocks: [
      "로케트배터리 외야파티덱"
    ],
    side: "OUTFIELD",
    fanRole: "NEUTRAL",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "로케트배터리 외야파티덱",
      "외야파티덱",
      "인천 외야파티덱"
    ]
  },
  {
    id: "incheon-home-run-third",
    level: "OUTFIELD",
    category: "HOME_RUN",
    name: "홈런커플존 3루",
    block: "홈런커플존 3루",
    officialBlocks: [
      "홈런커플존 3루"
    ],
    side: "OUTFIELD",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "홈런커플존",
      "3루 홈런커플존",
      "좌측 홈런커플존"
    ]
  },
  {
    id: "incheon-home-run-first",
    level: "OUTFIELD",
    category: "HOME_RUN",
    name: "홈런커플존 1루",
    block: "홈런커플존 1루",
    officialBlocks: [
      "홈런커플존 1루"
    ],
    side: "OUTFIELD",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "홈런커플존",
      "1루 홈런커플존",
      "우측 홈런커플존"
    ]
  },
  {
    id: "incheon-outfield-family-zone",
    level: "OUTFIELD",
    category: "FAMILY",
    name: "외야패밀리존",
    block: "외야패밀리존",
    officialBlocks: [
      "외야패밀리존"
    ],
    side: "OUTFIELD",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "외야패밀리존",
      "인천 외야패밀리존"
    ]
  },
  {
    id: "incheon-bbq-dodram",
    level: "OUTFIELD",
    category: "BBQ_DODRAM",
    name: "도드람한돈 바비큐존",
    block: "도드람한돈 바비큐존",
    officialBlocks: [
      "도드람한돈 바비큐존"
    ],
    side: "OUTFIELD",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "도드람한돈 바비큐존",
      "도드람 바비큐존",
      "인천 바비큐존"
    ]
  },
  {
    id: "incheon-bbq-emart",
    level: "OUTFIELD",
    category: "BBQ_EMART",
    name: "이마트바비큐존",
    block: "이마트바비큐존",
    officialBlocks: [
      "이마트바비큐존"
    ],
    side: "OUTFIELD",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "이마트바비큐존",
      "이마트 바비큐존",
      "인천 바비큐존"
    ]
  },
  {
    id: "incheon-friendly-zone",
    level: "OUTFIELD",
    category: "FRIENDLY",
    name: "이마트 프렌들리존",
    block: "이마트 프렌들리존",
    officialBlocks: [
      "이마트 프렌들리존"
    ],
    side: "OUTFIELD",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "이마트 프렌들리존",
      "프렌들리존",
      "인천 프렌들리존"
    ]
  },
  {
    id: "incheon-accessible-9b",
    level: "1F",
    category: "ACCESSIBLE",
    name: "휠체어석 9B",
    block: "휠체어석 9B",
    officialBlocks: [
      "휠체어석 9B"
    ],
    side: "FIRST_BASE",
    fanRole: "HOME",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "휠체어석 9B",
      "1루 휠체어석",
      "인천 휠체어석"
    ],
    accessibilityNote: "공식 좌석도에 휠체어 아이콘으로 표시된 구역입니다."
  },
  {
    id: "incheon-accessible-23b",
    level: "1F",
    category: "ACCESSIBLE",
    name: "휠체어석 23B",
    block: "휠체어석 23B",
    officialBlocks: [
      "휠체어석 23B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "휠체어석 23B",
      "3루 휠체어석",
      "인천 휠체어석"
    ],
    accessibilityNote: "공식 좌석도에 휠체어 아이콘으로 표시된 구역입니다."
  },
  {
    id: "incheon-accessible-25b",
    level: "1F",
    category: "ACCESSIBLE",
    name: "휠체어석 25B",
    block: "휠체어석 25B",
    officialBlocks: [
      "휠체어석 25B"
    ],
    side: "THIRD_BASE",
    fanRole: "AWAY",
    sourceConfidence: "OFFICIAL",
    sourceNote: "SSG 랜더스 공식 티켓 안내 2026 좌석도 이미지에서 확인한 블록/구역입니다.",
    seatViewSections: [
      "휠체어석 25B",
      "3루 휠체어석",
      "인천 휠체어석"
    ],
    accessibilityNote: "공식 좌석도에 휠체어 아이콘으로 표시된 구역입니다."
  }
];

function createIncheonBlock(definition: IncheonBlockDefinition): IncheonBlock {
  const imageGeometry = INCHEON_IMAGE_GEOMETRY[definition.id];
  if (!imageGeometry) {
    throw new Error('Missing Incheon image geometry for ' + definition.id);
  }

  return {
    ...definition,
    imageGeometry,
  };
}

export const INCHEON_BLOCKS: IncheonBlock[] = INCHEON_BLOCK_DEFINITIONS.map(createIncheonBlock);

export function getIncheonSideLabel(side: IncheonSide): string {
  if (side === 'FIRST_BASE') return '1루';
  if (side === 'THIRD_BASE') return '3루';
  if (side === 'OUTFIELD') return '외야';
  return '중앙';
}

export function getIncheonFanRoleLabel(role: IncheonFanRole): string {
  if (role === 'HOME') return '홈 응원';
  if (role === 'AWAY') return '원정 응원';
  return '중립';
}

export function getIncheonSourceLabel(confidence: IncheonSourceConfidence): string {
  return confidence === 'OFFICIAL' ? '공식 확인' : '공식 확인 필요';
}
