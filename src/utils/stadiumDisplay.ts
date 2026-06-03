import type { Stadium } from '../types/stadium';

export interface StadiumDisplayConfig {
  stadiumId: string;
  region: string;
  shortName: string;
  displayName: string;
  aliases: readonly string[];
}

export type StadiumDisplayInput = Pick<Stadium, 'stadiumId' | 'stadiumName'>;

export const STADIUM_DISPLAY_CONFIGS: Record<string, StadiumDisplayConfig> = {
  JAMSIL: {
    stadiumId: 'JAMSIL',
    region: '서울',
    shortName: '잠실야구장',
    displayName: '서울 · 잠실야구장',
    aliases: ['잠실', '잠실야구장', '서울잠실야구장', '잠실 야구장'],
  },
  GOCHEOK: {
    stadiumId: 'GOCHEOK',
    region: '서울',
    shortName: '고척스카이돔',
    displayName: '서울 · 고척스카이돔',
    aliases: ['고척', '고척스카이돔', '고척 스카이돔'],
  },
  INCHEON: {
    stadiumId: 'INCHEON',
    region: '인천',
    shortName: 'SSG랜더스필드',
    displayName: '인천 · SSG랜더스필드',
    aliases: ['인천', '문학', '인천SSG랜더스필드', '인천 SSG 랜더스필드', '문학야구장', '인천문학야구장'],
  },
  SUWON: {
    stadiumId: 'SUWON',
    region: '수원',
    shortName: 'KT위즈파크',
    displayName: '수원 · KT위즈파크',
    aliases: ['수원', '수원KT위즈파크', '수원 KT위즈파크', '수원 KT 위즈파크', '수원 kt wiz 파크'],
  },
  DAEJEON: {
    stadiumId: 'DAEJEON',
    region: '대전',
    shortName: '한화생명볼파크',
    displayName: '대전 · 한화생명볼파크',
    aliases: ['대전', '대전 한화생명볼파크', '대전한화생명볼파크', '한화생명볼파크', '대전 한화생명 이글스파크', '한화생명 이글스파크'],
  },
  GWANGJU: {
    stadiumId: 'GWANGJU',
    region: '광주',
    shortName: 'KIA 챔피언스필드',
    displayName: '광주 · KIA 챔피언스필드',
    aliases: ['광주', '광주-KIA 챔피언스필드', '광주-기아 챔피언스 필드', '광주기아챔피언스필드', '광주 KIA 챔피언스필드', '광주 기아 챔피언스 필드'],
  },
  DAEGU: {
    stadiumId: 'DAEGU',
    region: '대구',
    shortName: '삼성 라이온즈파크',
    displayName: '대구 · 삼성 라이온즈파크',
    aliases: ['대구', '대구 삼성 라이온즈파크', '대구 삼성 라이온즈 파크', '대구삼성라이온즈파크', '삼성라이온즈파크', '라팍'],
  },
  CHANGWON: {
    stadiumId: 'CHANGWON',
    region: '창원',
    shortName: 'NC파크',
    displayName: '창원 · NC파크',
    aliases: ['창원', '창원NC파크', '창원 NC파크', '창원 NC 파크', 'NC파크'],
  },
  SAJIK: {
    stadiumId: 'SAJIK',
    region: '부산',
    shortName: '사직야구장',
    displayName: '부산 · 사직야구장',
    aliases: ['부산', '사직', '사직야구장', '부산 사직야구장', '사직 야구장'],
  },
};

const normalizeStadiumDisplayKey = (value: string): string =>
  value.toLowerCase().replace(/[\s\-_/()·.]/g, '');

const STADIUM_DISPLAY_ALIAS_MAP = Object.values(STADIUM_DISPLAY_CONFIGS).reduce<Map<string, StadiumDisplayConfig>>(
  (acc, config) => {
    [
      config.stadiumId,
      config.shortName,
      config.displayName,
      ...config.aliases,
    ].forEach((alias) => {
      acc.set(normalizeStadiumDisplayKey(alias), config);
    });
    return acc;
  },
  new Map(),
);

export function getStadiumDisplayConfig(stadiumId?: string | null): StadiumDisplayConfig | null {
  if (!stadiumId) {
    return null;
  }

  return STADIUM_DISPLAY_CONFIGS[stadiumId.trim().toUpperCase()] ?? null;
}

export function resolveStadiumDisplayConfig(value?: string | null): StadiumDisplayConfig | null {
  if (!value) {
    return null;
  }

  return STADIUM_DISPLAY_ALIAS_MAP.get(normalizeStadiumDisplayKey(value)) ?? null;
}

export function getStadiumDisplayName(stadium?: StadiumDisplayInput | null): string {
  if (!stadium) {
    return '';
  }

  const configById = getStadiumDisplayConfig(stadium.stadiumId);
  if (configById) {
    return configById.displayName;
  }

  const configByName = resolveStadiumDisplayConfig(stadium.stadiumName);
  return configByName?.displayName ?? stadium.stadiumName;
}

export function formatStadiumDisplayName(value?: string | null): string {
  if (!value) {
    return '';
  }

  const trimmedValue = value.trim();
  return resolveStadiumDisplayConfig(trimmedValue)?.displayName ?? trimmedValue;
}
