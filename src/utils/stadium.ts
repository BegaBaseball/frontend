import { CATEGORY_CONFIGS, THEME_COLORS } from './constants';
import { MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 카테고리 아이콘 정보 가져오기
 */
export const getCategoryIconConfig = (category: string): {
  Icon: LucideIcon;
  color: string;
} => {
  const config = category in CATEGORY_CONFIGS
    ? CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS]
    : null;
  
  if (!config) {
    return {
      Icon: MapPin,
      color: THEME_COLORS.primary,
    };
  }

  return {
    Icon: config.icon,
    color: config.color,
  };
};
