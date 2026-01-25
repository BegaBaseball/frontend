import { TEAM_DATA } from '../constants/teams';

// 기본 브랜드 색상 (팀 없을 때 사용)
export const DEFAULT_BRAND_COLOR = '#2d5f4f';

/**
 * HEX 색상을 정규화합니다.
 * 유효하지 않은 값은 fallback 색상을 반환합니다.
 */
export const normalizeHexColor = (color?: string, fallback = DEFAULT_BRAND_COLOR): string => {
    if (!color) return fallback;
    const trimmed = color.trim();
    if (!trimmed.startsWith('#')) return fallback;
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
        return `#${hex
            .split('')
            .map((char) => char + char)
            .join('')}`.toUpperCase();
    }
    if (hex.length === 6) {
        return `#${hex.toUpperCase()}`;
    }
    return fallback;
};

/**
 * HEX 색상을 RGB 객체로 변환합니다.
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const normalized = normalizeHexColor(hex);
    const value = normalized.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return { r, g, b };
};

/**
 * HEX 색상을 RGBA 문자열로 변환합니다.
 */
export const toRgba = (hex: string, alpha: number): string => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 색상의 상대 휘도(luminance)를 계산합니다.
 * WCAG 2.0 공식 사용
 */
export const getLuminance = (hex: string): number => {
    const { r, g, b } = hexToRgb(hex);
    const [sr, sg, sb] = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
};

/**
 * 색상을 어둡게 만듭니다.
 */
export const darkenColor = (hex: string, amount: number): string => {
    const { r, g, b } = hexToRgb(hex);
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    return `#${[clamp(r * (1 - amount)), clamp(g * (1 - amount)), clamp(b * (1 - amount))]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
};

/**
 * 색상을 밝게 만듭니다.
 */
export const lightenColor = (hex: string, amount: number): string => {
    const { r, g, b } = hexToRgb(hex);
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    return `#${[
        clamp(r + (255 - r) * amount),
        clamp(g + (255 - g) * amount),
        clamp(b + (255 - b) * amount),
    ]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
};

/**
 * 읽기 좋은 강조색을 반환합니다.
 * 너무 밝은 색상은 어둡게 조정합니다.
 */
export const getReadableAccent = (hex: string): string => {
    const luminance = getLuminance(hex);
    return luminance > 0.7 ? darkenColor(hex, 0.35) : hex;
};

/**
 * 배경색에 대한 대비 텍스트 색상을 반환합니다.
 * 밝은 배경 → 어두운 텍스트, 어두운 배경 → 밝은 텍스트
 */
export const getContrastText = (hex: string): string => {
    const luminance = getLuminance(hex);
    return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
};

/**
 * 팀 ID로 팀 색상을 조회합니다.
 * 팀이 없거나 '없음'인 경우 기본 브랜드 색상(녹색)을 반환합니다.
 */
export const getTeamColor = (teamId: string | null | undefined): string => {
    if (!teamId || teamId === '없음') {
        return DEFAULT_BRAND_COLOR;
    }
    const team = TEAM_DATA[teamId];
    return team?.color || DEFAULT_BRAND_COLOR;
};

/**
 * 팀 테마 색상 객체를 생성합니다.
 * 프로필 페이지 등에서 일관된 테마 적용에 사용
 */
export const getTeamTheme = (teamId: string | null | undefined) => {
    const primary = getTeamColor(teamId);
    const accent = getReadableAccent(primary);
    const contrastText = getContrastText(primary);
    const softBg = toRgba(primary, 0.1);
    const gradient = `linear-gradient(135deg, ${primary} 0%, ${darkenColor(primary, 0.3)} 100%)`;

    return {
        primary,
        accent,
        contrastText,
        softBg,
        gradient,
    };
};
