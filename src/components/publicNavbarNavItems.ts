export type PublicNavbarNavItemId = 'cheer' | 'stadium' | 'prediction' | 'mate';

export interface PublicNavbarNavItem {
  id: PublicNavbarNavItemId;
  label: string;
}

export const publicNavbarNavItems: PublicNavbarNavItem[] = [
  { id: 'cheer', label: '응원석' },
  { id: 'stadium', label: '구장가이드' },
  { id: 'prediction', label: '전력분석실' },
  { id: 'mate', label: '같이가요' },
];
