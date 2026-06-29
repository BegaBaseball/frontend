import { formatDateForAPI } from './home';

export type NavbarNavItemId = 'cheer' | 'stadium' | 'prediction' | 'mate';

export const buildNavbarNavPath = (id: NavbarNavItemId, today: Date = new Date()): string => {
  if (id === 'prediction') {
    return `/prediction?date=${encodeURIComponent(formatDateForAPI(today))}`;
  }

  return `/${id}`;
};

const NAVBAR_ACTIVE_PATHS: Record<NavbarNavItemId, string[]> = {
  cheer: ['/cheer'],
  stadium: ['/stadium'],
  prediction: ['/prediction', '/predictions'],
  mate: ['/mate'],
};

export const isNavbarNavItemActive = (id: NavbarNavItemId, pathname: string): boolean => {
  const activePaths = NAVBAR_ACTIVE_PATHS[id];

  return activePaths.some((path) => (
    pathname === path || pathname.startsWith(`${path}/`)
  ));
};
