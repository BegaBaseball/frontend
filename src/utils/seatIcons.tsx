import {
  DiamondIcon,
  MegaphoneIcon,
  ScanEyeIcon,
  TentIcon,
  UtensilsIcon,
  ZapIcon,
} from '../components/icons/PublicShellIcons';
import { SeatCategory } from './stadiumData';

export const SEAT_ICONS: Record<SeatCategory, React.ReactNode> = {
    CHEERING: <MegaphoneIcon className="w-5 h-5 text-orange-500" />,
    TABLE: <UtensilsIcon className="w-5 h-5 text-purple-500" />,
    PREMIUM: <DiamondIcon className="w-5 h-5 text-blue-500" />,
    EXCITING: <ZapIcon className="w-5 h-5 text-yellow-500" />,
    COMFORT: <ScanEyeIcon className="w-5 h-5 text-green-600" />,
    SPECIAL: <TentIcon className="w-5 h-5 text-indigo-500" />,
    OUTFIELD: <span className="text-lg leading-none select-none" role="img" aria-label="baseball">⚾</span>
};
