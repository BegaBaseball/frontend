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
  const config = CATEGORY_CONFIGS[category];
  
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