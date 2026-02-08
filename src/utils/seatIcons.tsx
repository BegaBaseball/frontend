import { Megaphone, Utensils, Diamond, Zap, Tent, ScanEye } from 'lucide-react';
import { SeatCategory } from './stadiumData';

export const SEAT_ICONS: Record<SeatCategory, React.ReactNode> = {
    CHEERING: <Megaphone className="w-5 h-5 text-orange-500" />,
    TABLE: <Utensils className="w-5 h-5 text-purple-500" />,
    PREMIUM: <Diamond className="w-5 h-5 text-blue-500" />,
    EXCITING: <Zap className="w-5 h-5 text-yellow-500" />,
    COMFORT: <ScanEye className="w-5 h-5 text-green-600" />, // "View" / General
    SPECIAL: <Tent className="w-5 h-5 text-indigo-500" />,
    OUTFIELD: <span className="text-lg leading-none select-none" role="img" aria-label="baseball">⚾</span>
};
