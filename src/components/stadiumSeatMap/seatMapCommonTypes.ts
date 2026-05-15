import type { ReactNode } from 'react';

export type SeatMapThemeMode = 'light' | 'dark';

export interface SeatMapCategoryMeta {
  label: string;
  light: string;
  dark: string;
  textLight?: string;
  textDark?: string;
}

export interface SeatMapFilterGroup {
  id: string;
  label: string;
  cats: readonly string[] | null;
}

export interface SeatMapSourceInfo {
  sourceLabel: string;
  sourceUrl?: string | null;
  assetStatus?: string;
  prefixLabel?: string;
}

export interface SeatMapCommonCopy {
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  blockLabel?: string;
  galleryTitle?: string;
  uploadLabel?: string;
  officialBlocksTitle?: string;
}

export interface SeatMapSectionAdapter<TSection> {
  getId: (section: TSection) => string;
  getName: (section: TSection) => string;
  getBlock: (section: TSection) => string;
  getCategoryId: (section: TSection) => string;
  getLevel: (section: TSection) => string;
  getOfficialBlocks: (section: TSection) => readonly string[];
  getSideLabel: (section: TSection) => string;
  getFanRoleLabel: (section: TSection) => string;
  getSourceLabel: (section: TSection) => string;
  getSourceNote: (section: TSection) => ReactNode;
  getSeatViewSections: (section: TSection) => readonly string[];
  getAccessibilityNote?: (section: TSection) => ReactNode;
  getDistance?: (section: TSection) => string | null | undefined;
  getNotes?: (section: TSection) => ReactNode;
  getTags?: (section: TSection) => readonly string[];
}
