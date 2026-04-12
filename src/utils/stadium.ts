import { CATEGORY_CONFIGS, THEME_COLORS } from './constants';
import {
  MapPinIcon,
  ParkingCircleIcon,
  ShoppingBagIcon,
  TruckIcon,
  UtensilsIcon,
} from '../components/icons/PublicShellIcons';
import type { StadiumCategoryIconKey, StadiumIconComponent } from '../types/stadium';

const CATEGORY_ICON_COMPONENTS: Record<StadiumCategoryIconKey, StadiumIconComponent> = {
  utensils: UtensilsIcon,
  truck: TruckIcon,
  shoppingBag: ShoppingBagIcon,
  parkingCircle: ParkingCircleIcon,
};

export const getCategoryIcon = (iconKey?: StadiumCategoryIconKey): StadiumIconComponent =>
  iconKey ? CATEGORY_ICON_COMPONENTS[iconKey] : MapPinIcon;

/**
 * 카테고리 아이콘 정보 가져오기
 */
export const getCategoryIconConfig = (category: string): {
  Icon: StadiumIconComponent;
  color: string;
} => {
  const config = category in CATEGORY_CONFIGS
    ? CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS]
    : null;
  
  if (!config) {
    return {
      Icon: MapPinIcon,
      color: THEME_COLORS.primary,
    };
  }

  return {
    Icon: getCategoryIcon(config.iconKey),
    color: config.color,
  };
};
