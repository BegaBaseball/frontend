import type { ReactNode } from 'react';

import {
  SeatDiamondIcon,
  SeatEyeIcon,
  SeatMegaphoneIcon,
  SeatTentIcon,
  SeatUtensilsIcon,
  SeatZapIcon,
} from '../components/icons/SeatCategoryIcons';
import type { SeatCategory } from './stadiumData';

export const SEAT_ICONS: Record<SeatCategory, ReactNode> = {
    CHEERING: <SeatMegaphoneIcon className="w-5 h-5 text-orange-500" />,
    TABLE: <SeatUtensilsIcon className="w-5 h-5 text-purple-500" />,
    PREMIUM: <SeatDiamondIcon className="w-5 h-5 text-blue-500" />,
    EXCITING: <SeatZapIcon className="w-5 h-5 text-yellow-500" />,
    COMFORT: <SeatEyeIcon className="w-5 h-5 text-green-600" />,
    SPECIAL: <SeatTentIcon className="w-5 h-5 text-indigo-500" />,
    OUTFIELD: <span className="text-lg leading-none select-none" role="img" aria-label="baseball">⚾</span>
};
