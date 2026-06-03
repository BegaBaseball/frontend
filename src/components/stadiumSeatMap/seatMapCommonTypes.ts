import type { ReactNode } from 'react';

export type SeatMapThemeMode = 'light' | 'dark';

export interface SeatMapPan {
  x: number;
  y: number;
}

export interface SeatMapSvgBaseProps<TBlock> {
  mode: 'light' | 'dark';
  selected: TBlock | null;
  setSelected: (block: TBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: readonly string[] | null;
  filterSides?: readonly string[] | null;
  filterLevels?: readonly string[] | null;
  zoom: number;
  pan: SeatMapPan;
  onPanChange: (pan: SeatMapPan) => void;
  onZoom: (z: number) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  enableAutoCenter?: boolean;
  onFullscreen?: () => void;
}

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
  sides?: readonly string[] | null;
  levels?: readonly string[] | null;
  filterDimension?: 'grade' | 'position' | 'level';
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

export interface SeatMapSearchAction {
  label?: ReactNode;
  ariaLabel?: string;
  onClick: () => void;
  testId?: string;
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
