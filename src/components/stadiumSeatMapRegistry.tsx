import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type StadiumSeatMapPresetId =
  | 'jamsil'
  | 'incheon'
  | 'daegu'
  | 'daejeon'
  | 'gocheok'
  | 'gwangju'
  | 'changwon'
  | 'sajik'
  | 'suwon';

export type StadiumSeatMapShellTemplate = 'standard';

export interface StadiumSeatMapEntry {
  id: StadiumSeatMapPresetId;
  label: string;
  badgeLabel: string;
  matchers: readonly string[];
  folder: string;
  componentName: string;
  Component: LazyExoticComponent<ComponentType>;
  usesCoordinateGeometry: boolean;
  shellTemplate: StadiumSeatMapShellTemplate;
  isNonCoordinateMap: boolean;
}

const lazySeatMap = (loader: () => Promise<{ default: ComponentType }>) => lazy(loader);

export const STADIUM_SEAT_MAP_ENTRIES: readonly StadiumSeatMapEntry[] = [
  {
    id: 'jamsil',
    label: '잠실 블록 단위 안내도',
    badgeLabel: '잠실 블록 단위 안내도',
    matchers: ['JAMSIL', '잠실', '서울잠실'],
    folder: 'jamsil',
    componentName: 'JamsilSeatMap',
    Component: lazySeatMap(() => import('./jamsil/JamsilSeatMap')),
    usesCoordinateGeometry: false,
    shellTemplate: 'standard',
    isNonCoordinateMap: true,
  },
  {
    id: 'incheon',
    label: '인천 SSG 공식 좌석도',
    badgeLabel: '인천 SSG 공식 좌석도',
    matchers: ['INCHEON', 'SSG', '문학', '인천', '랜더스'],
    folder: 'incheon',
    componentName: 'IncheonSeatMap',
    Component: lazySeatMap(() => import('./incheon/IncheonSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'daegu',
    label: '대구 삼성 공식 좌석도',
    badgeLabel: '대구 삼성 공식 좌석도',
    matchers: ['DAEGU', 'SAMSUNG', '대구', '삼성', '라이온즈'],
    folder: 'daegu',
    componentName: 'DaeguSeatMap',
    Component: lazySeatMap(() => import('./daegu/DaeguSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'daejeon',
    label: '대전 한화 공식 좌석도',
    badgeLabel: '대전 한화 공식 좌석도',
    matchers: ['DAEJEON', 'HANWHA', '대전', '한화', '이글스'],
    folder: 'daejeon',
    componentName: 'DaejeonSeatMap',
    Component: lazySeatMap(() => import('./daejeon/DaejeonSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'gocheok',
    label: '고척 키움 공식 좌석도',
    badgeLabel: '고척 키움 공식 좌석도',
    matchers: ['GOCHEOK', 'KIWOOM', '고척', '키움', '스카이돔'],
    folder: 'gocheok',
    componentName: 'GocheokSeatMap',
    Component: lazySeatMap(() => import('./gocheok/GocheokSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'gwangju',
    label: '광주 KIA 공식 좌석도',
    badgeLabel: '광주 KIA 공식 좌석도',
    matchers: ['GWANGJU', 'KIA', '광주', '기아', '챔피언스'],
    folder: 'gwangju',
    componentName: 'GwangjuSeatMap',
    Component: lazySeatMap(() => import('./gwangju/GwangjuSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'changwon',
    label: '창원 NC 공식 좌석도',
    badgeLabel: '창원 NC 공식 좌석도',
    matchers: ['CHANGWON', 'NCPARK', 'NC', 'NC파크', '창원', '창원NC파크', '다이노스'],
    folder: 'changwon',
    componentName: 'ChangwonSeatMap',
    Component: lazySeatMap(() => import('./changwon/ChangwonSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'sajik',
    label: '사직 롯데 공식 좌석도',
    badgeLabel: '사직 롯데 공식 좌석도',
    matchers: ['SAJIK', 'BUSAN', 'LOTTE', '사직', '부산', '롯데'],
    folder: 'sajik',
    componentName: 'SajikSeatMap',
    Component: lazySeatMap(() => import('./sajik/SajikSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'suwon',
    label: '수원 kt 위즈 파크 공식 좌석도',
    badgeLabel: '수원 kt 위즈 파크 공식 좌석도',
    matchers: ['SUWON', 'KTWIZ', 'KT', 'kt wiz', '수원', '수원KT위즈파크', '수원 kt wiz 파크', '위즈', '위즈파크'],
    folder: 'suwon',
    componentName: 'SuwonSeatMap',
    Component: lazySeatMap(() => import('./suwon/SuwonSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
];

function normalizeStadiumSeatMapKey(value: string) {
  return value.toLowerCase().replace(/[\s\-_/()·.]/g, '');
}

export function resolveStadiumSeatMapEntry(stadiumId?: string | null, stadiumName?: string | null) {
  const key = normalizeStadiumSeatMapKey([stadiumId, stadiumName].filter(Boolean).join(' '));

  if (!key) {
    return null;
  }

  return STADIUM_SEAT_MAP_ENTRIES.find((entry) =>
    entry.matchers.some((matcher) => key.includes(normalizeStadiumSeatMapKey(matcher))),
  ) ?? null;
}
