import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { getStadiumDisplayConfig, resolveStadiumDisplayConfig } from '../utils/stadiumDisplay';

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
    label: '대구 삼성 라이온즈파크 공식 좌석도',
    badgeLabel: '대구 삼성 라이온즈파크 공식 좌석도',
    matchers: ['DAEGU', 'SAMSUNG', '대구', '삼성', '라이온즈', '라팍', '라이온즈파크', '삼성라이온즈파크', '대구삼성라이온즈파크', '대구 삼성 라이온즈파크', '대구 삼성 라이온즈 파크'],
    folder: 'daegu',
    componentName: 'DaeguSeatMap',
    Component: lazySeatMap(() => import('./daegu/DaeguSeatMap')),
    usesCoordinateGeometry: true,
    shellTemplate: 'standard',
    isNonCoordinateMap: false,
  },
  {
    id: 'daejeon',
    label: '대전 한화생명볼파크 공식 좌석도',
    badgeLabel: '대전 한화생명볼파크 공식 좌석도',
    matchers: ['DAEJEON', 'HANWHA', '대전', '한화', '이글스', '볼파크', '한화생명볼파크', '대전 한화생명볼파크', '한화생명 이글스파크', '대전 한화생명 이글스파크', '이글스파크'],
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
  return value.toLowerCase().replace(/[\s\-_/()·.,:]/g, '');
}

function extractSeatMapTokens(value: string) {
  return normalizeStadiumSeatMapKey(value).match(/[0-9a-z가-힣]+/giu) ?? [];
}

const STADIUM_SEAT_MAP_MATCHER_TOKENS = STADIUM_SEAT_MAP_ENTRIES.flatMap((entry) => (
  Array.from(new Set(extractSeatMapTokens(entry.matchers.join(' '))))
    .filter((token) => token.length >= 2)
    .map((token) => ({ presetId: entry.id, token }))
));

const STADIUM_SEAT_MAP_TEAM_FALLBACKS: readonly { token: string; presetId: StadiumSeatMapPresetId }[] = [
  // 잠실(양구단 표기)
  { token: 'lg트윈스', presetId: 'jamsil' },
  { token: 'lg', presetId: 'jamsil' },
  { token: '두산', presetId: 'jamsil' },
  { token: '두산베어스', presetId: 'jamsil' },
  { token: 'doosan', presetId: 'jamsil' },
  // 인천
  { token: 'ssg', presetId: 'incheon' },
  { token: 'ssg랜더스', presetId: 'incheon' },
  // 대구
  { token: 'samsung', presetId: 'daegu' },
  { token: '삼성라이온즈', presetId: 'daegu' },
  // 대전
  { token: 'hanwha', presetId: 'daejeon' },
  { token: '이글스', presetId: 'daejeon' },
  // 고척
  { token: 'kiwoom', presetId: 'gocheok' },
  { token: '히어로즈', presetId: 'gocheok' },
  // 광주
  { token: 'kia', presetId: 'gwangju' },
  { token: '타이거즈', presetId: 'gwangju' },
  // 창원
  { token: 'nc', presetId: 'changwon' },
  { token: '다이노스', presetId: 'changwon' },
  { token: '엔씨', presetId: 'changwon' },
  // 사직
  { token: 'lotte', presetId: 'sajik' },
  { token: '자이언츠', presetId: 'sajik' },
  // 수원
  { token: 'kt', presetId: 'suwon' },
  { token: '위즈', presetId: 'suwon' },
  { token: 'wizards', presetId: 'suwon' },
];

function resolvePresetIdFromTeam(stadiumTeam?: string | null) {
  if (!stadiumTeam) {
    return null;
  }

  const normalizedTeam = normalizeStadiumSeatMapKey(stadiumTeam);
  if (!normalizedTeam) {
    return null;
  }

  const teamTokens = extractSeatMapTokens(normalizedTeam);

  const matched = STADIUM_SEAT_MAP_TEAM_FALLBACKS.find((rule) => {
    const normalizedRuleToken = normalizeStadiumSeatMapKey(rule.token);
    if (!normalizedRuleToken) {
      return false;
    }

    return (
      normalizedTeam.includes(normalizedRuleToken)
      || normalizedRuleToken.includes(normalizedTeam)
      || teamTokens.some((teamToken) => (
        teamToken.includes(normalizedRuleToken) || normalizedRuleToken.includes(teamToken)
      ))
    );
  });

  return matched ? matched.presetId : null;
}

const STADIUM_DISPLAY_ID_TO_PRESET_ID: Record<string, StadiumSeatMapPresetId> = {
  JAMSIL: 'jamsil',
  GOCHEOK: 'gocheok',
  INCHEON: 'incheon',
  SUWON: 'suwon',
  DAEJEON: 'daejeon',
  GWANGJU: 'gwangju',
  DAEGU: 'daegu',
  CHANGWON: 'changwon',
  SAJIK: 'sajik',
};

function resolvePresetIdFromDisplayConfig(stadiumId?: string | null, stadiumName?: string | null): StadiumSeatMapPresetId | null {
  const configById = stadiumId ? getStadiumDisplayConfig(stadiumId) : null;
  const configByIdAlias = configById ?? (stadiumId ? resolveStadiumDisplayConfig(stadiumId) : null);
  const configByName = configByIdAlias ? null : resolveStadiumDisplayConfig(stadiumName);

  return STADIUM_DISPLAY_ID_TO_PRESET_ID[
    (configByIdAlias ?? configByName)?.stadiumId ?? ''
  ] ?? null;
}

export function resolveStadiumSeatMapEntry(
  stadiumId?: string | null,
  stadiumName?: string | null,
  stadiumTeam?: string | null,
) {
  const key = normalizeStadiumSeatMapKey([stadiumId, stadiumName, stadiumTeam].filter(Boolean).join(' '));

  if (!key) {
    return null;
  }

  const directMatch = STADIUM_SEAT_MAP_ENTRIES.find((entry) =>
    entry.matchers.some((matcher) => key.includes(normalizeStadiumSeatMapKey(matcher))),
  );

  if (directMatch) {
    return directMatch;
  }

  const presetId = resolvePresetIdFromDisplayConfig(stadiumId, stadiumName);
  if (!presetId) {
    const teamFallbackPresetId = resolvePresetIdFromTeam(stadiumTeam);
    if (teamFallbackPresetId) {
      return STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === teamFallbackPresetId) ?? null;
    }

    const tokens = extractSeatMapTokens(key);
    if (tokens.length > 0) {
      const tokenMatch = STADIUM_SEAT_MAP_MATCHER_TOKENS.find((candidate) => {
        const matcherToken = candidate.token;
        return tokens.some((token) => (
          token.includes(matcherToken)
          || matcherToken.includes(token)
        ));
      });
      if (tokenMatch) {
        return STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === tokenMatch.presetId) ?? null;
      }
    }

    return null;
  }

  return STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === presetId) ?? null;
}
