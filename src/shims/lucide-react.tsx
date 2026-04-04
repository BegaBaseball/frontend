import * as React from 'react';

type AppLucideProps = React.SVGProps<SVGSVGElement> & {
  size?: string | number;
  absoluteStrokeWidth?: boolean;
};

type AppLucideIcon = React.ForwardRefExoticComponent<AppLucideProps & React.RefAttributes<SVGSVGElement>>;
type IconNode = ReadonlyArray<readonly [string, Record<string, string>]>;

export type LucideProps = AppLucideProps;
export type LucideIcon = AppLucideIcon;

const resolveStrokeWidth = (
  strokeWidth: string | number | undefined,
  size: string | number,
  absoluteStrokeWidth: boolean | undefined,
) => {
  const baseStrokeWidth = strokeWidth ?? 2;
  if (!absoluteStrokeWidth) {
    return baseStrokeWidth;
  }

  const numericSize = typeof size === 'number' ? size : Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return baseStrokeWidth;
  }

  return (Number(baseStrokeWidth) * 24) / numericSize;
};

const createIcon = (displayName: string, children: React.ReactNode): AppLucideIcon => {
  const Icon = React.forwardRef<SVGSVGElement, AppLucideProps>((
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      children: extraChildren,
      ...props
    },
    ref,
  ) => (
    <svg
      ref={ref}
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={resolveStrokeWidth(strokeWidth, size, absoluteStrokeWidth)}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
      {extraChildren}
    </svg>
  ));

  Icon.displayName = displayName;

  return Icon;
};

const createNodeIcon = (displayName: string, iconNode: IconNode): AppLucideIcon =>
  createIcon(
    displayName,
    iconNode.map(([tag, attrs], index) =>
      React.createElement(tag, {
        ...attrs,
        key: attrs.key ?? `${displayName}-${index}`,
      }),
    ),
  );

export const Loader2 = createIcon(
  'Loader2',
  <path d="M21 12a9 9 0 1 1-6.2-8.56" />,
);

export const X = createIcon(
  'X',
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

export const ChevronLeft = createIcon(
  'ChevronLeft',
  <path d="m15 18-6-6 6-6" />,
);

export const ChevronRight = createIcon(
  'ChevronRight',
  <path d="m9 18 6-6-6-6" />,
);

export const ChevronDown = createIcon(
  'ChevronDown',
  <path d="m6 9 6 6 6-6" />,
);

export const ArrowLeft = createIcon(
  'ArrowLeft',
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>,
);

export const Users = createIcon(
  'Users',
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);

export const Trash2 = createIcon(
  'Trash2',
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6v14H5V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>,
);

export const MapPin = createIcon(
  'MapPin',
  <>
    <path d="M12 22s-7-4.35-7-11a7 7 0 1 1 14 0c0 6.65-7 11-7 11Z" />
    <circle cx="12" cy="11" r="2.5" />
  </>,
);

export const AlertTriangle = createIcon(
  'AlertTriangle',
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);

export const AlertCircle = createIcon(
  'AlertCircle',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>,
);

export const MessageSquare = createIcon(
  'MessageSquare',
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
);

export const RefreshCw = createIcon(
  'RefreshCw',
  <>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
  </>,
);

export const Search = createIcon(
  'Search',
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </>,
);

export const TrendingUp = createIcon(
  'TrendingUp',
  <>
    <path d="M22 7h-6" />
    <path d="M22 7v6" />
    <path d="m22 7-8.5 8.5-5-5L2 17" />
  </>,
);

export const Megaphone = createIcon(
  'Megaphone',
  <>
    <path d="m3 11 12-5v12L3 13z" />
    <path d="M15 8c3 0 5-2 6-4v16c-1-2-3-4-6-4" />
    <path d="M7 13v5a2 2 0 0 0 2 2h1" />
  </>,
);

export const Home = createIcon(
  'Home',
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </>,
);

export const Eye = createIcon(
  'Eye',
  <>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOff = createIcon(
  'EyeOff',
  <>
    <path d="m2 2 20 20" />
    <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
    <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.52 18.52 0 0 1-3.23 4.36" />
    <path d="M6.53 6.53A18.7 18.7 0 0 0 2 12s3.5 7 10 7a10.82 10.82 0 0 0 5.47-1.53" />
  </>,
);

export const Lock = createIcon(
  'Lock',
  <>
    <rect height="11" rx="2" width="18" x="3" y="11" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);

export const Ticket = createIcon(
  'Ticket',
  <>
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4z" />
    <path d="M13 5v12" />
  </>,
);

export const Calendar = createIcon(
  'Calendar',
  <>
    <rect height="18" rx="2" width="18" x="3" y="4" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </>,
);

export const CheckCircle = createIcon(
  'CheckCircle',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const CheckCircle2 = createIcon(
  'CheckCircle2',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m8.5 12.5 2 2 5-5" />
  </>,
);

export const Star = createIcon(
  'Star',
  <path d="m12 2.5 2.93 5.94 6.55.95-4.74 4.62 1.12 6.53L12 17.47l-5.86 3.07 1.12-6.53-4.74-4.62 6.55-.95z" />,
);

export const LineChart = createIcon(
  'LineChart',
  <>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-5 5" />
  </>,
);

export const Flame = createIcon(
  'Flame',
  <path d="M8 14c0-2.5 1.5-4 3-5.5 1 1 3 2.5 3 5a4 4 0 1 1-8 0c0-3.5 2.5-6 5-8 2.5 2.5 7 6 7 11a7 7 0 1 1-14 0c0-2 1-4 2.5-5.5" />,
);

export const Shield = createIcon(
  'Shield',
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
);

export const ShieldAlert = createIcon(
  'ShieldAlert',
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>,
);

export const Heart = createIcon(
  'Heart',
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
);

export const Bookmark = createIcon(
  'Bookmark',
  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
);

export const MessageCircle = createIcon(
  'MessageCircle',
  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
);

export const Bell = createIcon(
  'Bell',
  <>
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </>,
);

export const Quote = createIcon(
  'Quote',
  <>
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
  </>,
);

export const Clock3 = createIcon(
  'Clock3',
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16.5 12" />
  </>,
);

export const Clock = createIcon(
  'Clock',
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>,
);

export const Info = createIcon(
  'Info',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>,
);

export const Sparkles = createIcon(
  'Sparkles',
  <>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </>,
);

export const Zap = createIcon(
  'Zap',
  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
);

export const Plus = createIcon(
  'Plus',
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>,
);

export const Camera = createIcon(
  'Camera',
  <>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </>,
);

export const Coins = createIcon(
  'Coins',
  <>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </>,
);

export const Gamepad2 = createIcon(
  'Gamepad2',
  <>
    <line x1="6" x2="10" y1="11" y2="11" />
    <line x1="8" x2="8" y1="9" y2="13" />
    <line x1="15" x2="15.01" y1="12" y2="12" />
    <line x1="18" x2="18.01" y1="10" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </>,
);

export const CalendarDays = createIcon(
  'CalendarDays',
  <>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect height="18" rx="2" width="18" x="3" y="4" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </>,
);

export const LogOut = createIcon(
  'LogOut',
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </>,
);

export const ArrowUpRight = createIcon(
  'ArrowUpRight',
  <>
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </>,
);

export const ArrowDownRight = createIcon(
  'ArrowDownRight',
  <>
    <path d="m7 7 10 10" />
    <path d="M17 7v10H7" />
  </>,
);

export const Save = createIcon(
  'Save',
  <>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </>,
);

export const Mail = createIcon(
  'Mail',
  <>
    <rect height="16" rx="2" width="20" x="2" y="4" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>,
);

export const User = createIcon(
  'User',
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
);

export const Crown = createIcon(
  'Crown',
  <>
    <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
    <path d="M5 21h14" />
  </>,
);

export const Award = createIcon(
  'Award',
  <>
    <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
    <circle cx="12" cy="8" r="6" />
  </>,
);

export const Trophy = createIcon(
  'Trophy',
  <>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </>,
);

export const Medal = createIcon(
  'Medal',
  <>
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
    <path d="M11 12 5.12 2.2" />
    <path d="m13 12 5.88-9.8" />
    <path d="M8 7h8" />
    <circle cx="12" cy="17" r="5" />
    <path d="M12 18v-2h-.5" />
  </>,
);

export const Calculator = createIcon(
  'Calculator',
  <>
    <rect height="20" rx="2" width="16" x="4" y="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M16 10h.01" />
    <path d="M12 10h.01" />
    <path d="M8 10h.01" />
    <path d="M12 14h.01" />
    <path d="M8 14h.01" />
    <path d="M12 18h.01" />
    <path d="M8 18h.01" />
  </>,
);

export const RotateCw = createIcon(
  'RotateCw',
  <>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </>,
);

export const Bot = createIcon(
  'Bot',
  <>
    <path d="M12 8V4H8" />
    <rect height="12" rx="2" width="16" x="4" y="8" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </>,
);

export const Check = createIcon(
  'Check',
  <path d="M20 6 9 17l-5-5" />,
);

export const Repeat2 = createIcon(
  'Repeat2',
  <>
    <path d="m2 9 3-3 3 3" />
    <path d="M13 18H7a2 2 0 0 1-2-2V6" />
    <path d="m22 15-3 3-3-3" />
    <path d="M11 6h6a2 2 0 0 1 2 2v10" />
  </>,
);

export const UserPlus = createIcon(
  'UserPlus',
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </>,
);

export const ArrowRightCircle = createIcon(
  'ArrowRightCircle',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8l4 4-4 4" />
    <path d="M14 12H8" />
  </>,
);

export const Ban = createIcon(
  'Ban',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </>,
);

export const BarChart3 = createIcon(
  'BarChart3',
  <>
    <path d="M3 3v18h18" />
    <rect height="8" rx="1" width="3" x="7" y="10" />
    <rect height="12" rx="1" width="3" x="12" y="6" />
    <rect height="5" rx="1" width="3" x="17" y="13" />
  </>,
);

export const Map = createIcon(
  'Map',
  <>
    <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </>,
);

export const Newspaper = createIcon(
  'Newspaper',
  <>
    <path d="M5 18h14a2 2 0 0 0 2-2V6H7a2 2 0 0 0-2 2z" />
    <path d="M5 18a2 2 0 0 1-2-2V8" />
    <path d="M9 10h8" />
    <path d="M9 14h5" />
    <path d="M16 14h.01" />
  </>,
);

export const Send = createIcon(
  'Send',
  <>
    <path d="M22 2 11 13" />
    <path d="m22 2-7 20-4-9-9-4Z" />
  </>,
);

export const Smile = createIcon(
  'Smile',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15a6 6 0 0 0 8 0" />
    <path d="M9 9h.01" />
    <path d="M15 9h.01" />
  </>,
);

export const Undo2 = createIcon(
  'Undo2',
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h9a7 7 0 1 1 0 14h-1" />
  </>,
);

export const Upload = createIcon(
  'Upload',
  <>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
  </>,
);

export const UserRound = createIcon(
  'UserRound',
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>,
);

export const ArrowUpDown = createIcon(
  'ArrowUpDown',
  <>
    <path d="m7 3 4 4H8v10" />
    <path d="M16 21l-4-4h3V7" />
  </>,
);

export const BookOpen = createIcon(
  'BookOpen',
  <>
    <path d="M2 7a2 2 0 0 1 2-2h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4a2 2 0 0 1-2-2z" />
    <path d="M22 7a2 2 0 0 0-2-2h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6a2 2 0 0 0 2-2z" />
  </>,
);

export const Bug = createIcon(
  'Bug',
  <>
    <path d="M8 9h8" />
    <path d="M9 4 8 2" />
    <path d="M15 4l1-2" />
    <rect height="11" rx="5" width="10" x="7" y="7" />
    <path d="M3 13h4" />
    <path d="M17 13h4" />
    <path d="M5 7l3 2" />
    <path d="M19 7l-3 2" />
    <path d="M5 19l3-2" />
    <path d="M19 19l-3-2" />
  </>,
);

export const Download = createIcon(
  'Download',
  <>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M20 20H4" />
  </>,
);

export const Edit2 = createIcon(
  'Edit2',
  <>
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7 21l-4 1 1-4Z" />
    <path d="m15 5 4 4" />
  </>,
);

export const FileText = createIcon(
  'FileText',
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
    <path d="M8 9h2" />
  </>,
);

export const Filter = createIcon(
  'Filter',
  <>
    <path d="M22 3H2l8 9v7l4 2v-9z" />
  </>,
);

export const ImagePlus = createIcon(
  'ImagePlus',
  <>
    <rect height="18" rx="2" width="18" x="3" y="3" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="m21 15-5-5L5 21" />
    <path d="M19 6v6" />
    <path d="M16 9h6" />
  </>,
);

export const Link2 = createIcon(
  'Link2',
  <>
    <path d="M9 17H7a5 5 0 0 1 0-10h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <path d="M8 12h8" />
  </>,
);

export const Menu = createIcon(
  'Menu',
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>,
);

export const Pencil = createIcon(
  'Pencil',
  <>
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7 21l-4 1 1-4Z" />
    <path d="m15 5 4 4" />
  </>,
);

export const PenSquare = createIcon(
  'PenSquare',
  <>
    <rect height="18" rx="2" width="18" x="3" y="3" />
    <path d="M12 17H7" />
    <path d="M16.5 6.5a1.41 1.41 0 1 1 2 2L11 16l-3 1 1-3Z" />
  </>,
);

export const QrCode = createIcon(
  'QrCode',
  <>
    <rect height="5" rx="1" width="5" x="3" y="3" />
    <rect height="5" rx="1" width="5" x="16" y="3" />
    <rect height="5" rx="1" width="5" x="3" y="16" />
    <path d="M10 5h1" />
    <path d="M10 10h4" />
    <path d="M16 10h1" />
    <path d="M10 16h1" />
    <path d="M12 18h1" />
    <path d="M16 16h5" />
    <path d="M19 13v1" />
    <path d="M16 19h1" />
    <path d="M19 19h2" />
  </>,
);

export const Sun = createIcon(
  'Sun',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </>,
);

export const UserCog = createIcon(
  'UserCog',
  <>
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21a7 7 0 0 1 11.5-5.4" />
    <circle cx="18" cy="17" r="2" />
    <path d="M18 12v1" />
    <path d="M18 21v1" />
    <path d="M13 17h1" />
    <path d="M22 17h-1" />
  </>,
);

export const Utensils = createIcon(
  'Utensils',
  <>
    <path d="M4 3v7a2 2 0 0 0 4 0V3" />
    <path d="M6 3v19" />
    <path d="M13 3v7" />
    <path d="M13 10h5" />
    <path d="M18 3v19" />
  </>,
);

export const XCircle = createIcon(
  'XCircle',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </>,
);

export const Moon = createIcon(
  'Moon',
  <path d="M12 3a7.5 7.5 0 1 0 9 9A9 9 0 1 1 12 3z" />,
);

export const MoreHorizontal = createIcon(
  'MoreHorizontal',
  <>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </>,
);

export const CreditCard = createIcon(
  'CreditCard',
  <>
    <rect height="14" rx="2" width="20" x="2" y="5" />
    <path d="M2 10h20" />
    <path d="M6 15h2" />
    <path d="M10 15h4" />
  </>,
);

export const GripVertical = createIcon(
  'GripVertical',
  <>
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </>,
);

export const ImageOff = createIcon(
  'ImageOff',
  <>
    <path d="m2 2 20 20" />
    <rect height="18" rx="2" width="18" x="3" y="3" />
    <path d="m10 10 2 2" />
    <path d="M9 9h.01" />
    <path d="m21 15-5-5-3 3" />
  </>,
);

export const MessageSquareText = createIcon(
  'MessageSquareText',
  <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </>,
);

export const CheckCheck = createIcon(
  'CheckCheck',
  <>
    <path d="m7 12 3 3 7-7" />
    <path d="m3 12 3 3" />
    <path d="m13 9 4-4" />
  </>,
);

export const ShieldCheck = createIcon(
  'ShieldCheck',
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const Building2 = createIcon(
  'Building2',
  <>
    <path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18" />
    <path d="M2 22h20" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </>,
);

export const Activity = createNodeIcon(
  'Activity',
  [
    ['path', { d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2', key: '169zse' }],
  ],
);

export const ArrowRight = createNodeIcon(
  'ArrowRight',
  [
    ['path', { d: 'M5 12h14', key: '1ays0h' }],
    ['path', { d: 'm12 5 7 7-7 7', key: 'xquz4c' }],
  ],
);

export const ArrowUp = createNodeIcon(
  'ArrowUp',
  [
    ['path', { d: 'm5 12 7-7 7 7', key: 'hav0vg' }],
    ['path', { d: 'M12 19V5', key: 'x0mq9r' }],
  ],
);

export const BarChart2 = createNodeIcon(
  'BarChart2',
  [
    ['line', { x1: '18', x2: '18', y1: '20', y2: '10', key: '1xfpm4' }],
    ['line', { x1: '12', x2: '12', y1: '20', y2: '4', key: 'be30l9' }],
    ['line', { x1: '6', x2: '6', y1: '20', y2: '14', key: '1r4le6' }],
  ],
);

export const BellOff = createNodeIcon(
  'BellOff',
  [
    ['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0', key: 'vwvbt9' }],
    ['path', { d: 'M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742', key: '178tsu' }],
    ['path', { d: 'm2 2 20 20', key: '1ooewy' }],
    ['path', { d: 'M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05', key: '1hqiys' }],
  ],
);

export const BotMessageSquare = createNodeIcon(
  'BotMessageSquare',
  [
    ['path', { d: 'M12 6V2H8', key: '1155em' }],
    ['path', { d: 'm8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z', key: 'w2lp3e' }],
    ['path', { d: 'M2 12h2', key: '1t8f8n' }],
    ['path', { d: 'M9 11v2', key: '1ueba0' }],
    ['path', { d: 'M15 11v2', key: 'i11awn' }],
    ['path', { d: 'M20 12h2', key: '1q8mjw' }],
  ],
);

export const BrainCircuit = createNodeIcon(
  'BrainCircuit',
  [
    ['path', { d: 'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z', key: 'l5xja' }],
    ['path', { d: 'M9 13a4.5 4.5 0 0 0 3-4', key: '10igwf' }],
    ['path', { d: 'M6.003 5.125A3 3 0 0 0 6.401 6.5', key: '105sqy' }],
    ['path', { d: 'M3.477 10.896a4 4 0 0 1 .585-.396', key: 'ql3yin' }],
    ['path', { d: 'M6 18a4 4 0 0 1-1.967-.516', key: '2e4loj' }],
    ['path', { d: 'M12 13h4', key: '1ku699' }],
    ['path', { d: 'M12 18h6a2 2 0 0 1 2 2v1', key: '105ag5' }],
    ['path', { d: 'M12 8h8', key: '1lhi5i' }],
    ['path', { d: 'M16 8V5a2 2 0 0 1 2-2', key: 'u6izg6' }],
    ['circle', { cx: '16', cy: '13', r: '.5', key: 'ry7gng' }],
    ['circle', { cx: '18', cy: '3', r: '.5', key: '1aiba7' }],
    ['circle', { cx: '20', cy: '21', r: '.5', key: 'yhc1fs' }],
    ['circle', { cx: '20', cy: '8', r: '.5', key: '1e43v0' }],
  ],
);

export const ClipboardCopy = createNodeIcon(
  'ClipboardCopy',
  [
    ['rect', { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1', key: 'tgr4d6' }],
    ['path', { d: 'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2', key: '4jdomd' }],
    ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v4', key: '3hqy98' }],
    ['path', { d: 'M21 14H11', key: '1bme5i' }],
    ['path', { d: 'm15 10-4 4 4 4', key: '5dvupr' }],
  ],
);

export const Cloud = createNodeIcon(
  'Cloud',
  [
    ['path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z', key: 'p7xjir' }],
  ],
);

export const CloudRain = createNodeIcon(
  'CloudRain',
  [
    ['path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', key: '1pljnt' }],
    ['path', { d: 'M16 14v6', key: '1j4efv' }],
    ['path', { d: 'M8 14v6', key: '17c4r9' }],
    ['path', { d: 'M12 16v6', key: 'c8a4gj' }],
  ],
);

export const Copy = createNodeIcon(
  'Copy',
  [
    ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2', key: '17jyea' }],
    ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2', key: 'zix9uf' }],
  ],
);

export const CornerDownRight = createNodeIcon(
  'CornerDownRight',
  [
    ['polyline', { points: '15 10 20 15 15 20', key: '1q7qjw' }],
    ['path', { d: 'M4 4v7a4 4 0 0 0 4 4h12', key: 'z08zvw' }],
  ],
);

export const Crosshair = createNodeIcon(
  'Crosshair',
  [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['line', { x1: '22', x2: '18', y1: '12', y2: '12', key: 'l9bcsi' }],
    ['line', { x1: '6', x2: '2', y1: '12', y2: '12', key: '13hhkx' }],
    ['line', { x1: '12', x2: '12', y1: '6', y2: '2', key: '10w3f3' }],
    ['line', { x1: '12', x2: '12', y1: '22', y2: '18', key: '15g9kq' }],
  ],
);

export const Diamond = createNodeIcon(
  'Diamond',
  [
    ['path', { d: 'M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z', key: '1f1r0c' }],
  ],
);

export const Edit = createNodeIcon(
  'Edit',
  [
    ['path', { d: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', key: '1m0v6g' }],
    ['path', { d: 'M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z', key: 'ohrbg2' }],
  ],
);

export const Edit3 = createNodeIcon(
  'Edit3',
  [
    ['path', { d: 'M12 20h9', key: 't2du7b' }],
    ['path', { d: 'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z', key: '1ykcvy' }],
  ],
);

export const ExternalLink = createNodeIcon(
  'ExternalLink',
  [
    ['path', { d: 'M15 3h6v6', key: '1q9fwt' }],
    ['path', { d: 'M10 14 21 3', key: 'gplh6r' }],
    ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', key: 'a6xqqp' }],
  ],
);

export const FileSearch = createNodeIcon(
  'FileSearch',
  [
    ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4', key: 'tnqrlb' }],
    ['path', { d: 'M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3', key: 'ms7g94' }],
    ['path', { d: 'm9 18-1.5-1.5', key: '1j6qii' }],
    ['circle', { cx: '5', cy: '14', r: '3', key: 'ufru5t' }],
  ],
);

export const Fingerprint = createNodeIcon(
  'Fingerprint',
  [
    ['path', { d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4', key: '1nerag' }],
    ['path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88', key: 'o46ks0' }],
    ['path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02', key: 'ptglia' }],
    ['path', { d: 'M2 12a10 10 0 0 1 18-6', key: 'ydlgp0' }],
    ['path', { d: 'M2 16h.01', key: '1gqxmh' }],
    ['path', { d: 'M21.8 16c.2-2 .131-5.354 0-6', key: 'drycrb' }],
    ['path', { d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2', key: '1tidbn' }],
    ['path', { d: 'M8.65 22c.21-.66.45-1.32.57-2', key: '13wd9y' }],
    ['path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2', key: '1fr1j5' }],
  ],
);

export const Flag = createNodeIcon(
  'Flag',
  [
    ['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', key: 'i9b6wo' }],
    ['line', { x1: '4', x2: '4', y1: '22', y2: '15', key: '1cm3nv' }],
  ],
);

export const FolderOpen = createNodeIcon(
  'FolderOpen',
  [
    ['path', { d: 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2', key: 'usdka0' }],
  ],
);

export const Gavel = createNodeIcon(
  'Gavel',
  [
    ['path', { d: 'm14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8', key: '15492f' }],
    ['path', { d: 'm16 16 6-6', key: 'vzrcl6' }],
    ['path', { d: 'm8 8 6-6', key: '18bi4p' }],
    ['path', { d: 'm9 7 8 8', key: '5jnvq1' }],
    ['path', { d: 'm21 11-8-8', key: 'z4y7zo' }],
  ],
);

export const Hash = createNodeIcon(
  'Hash',
  [
    ['line', { x1: '4', x2: '20', y1: '9', y2: '9', key: '4lhtct' }],
    ['line', { x1: '4', x2: '20', y1: '15', y2: '15', key: 'vyu0kd' }],
    ['line', { x1: '10', x2: '8', y1: '3', y2: '21', key: '1ggp8o' }],
    ['line', { x1: '16', x2: '14', y1: '3', y2: '21', key: 'weycgp' }],
  ],
);

export const HelpCircle = createNodeIcon(
  'HelpCircle',
  [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', key: '1u773s' }],
    ['path', { d: 'M12 17h.01', key: 'p32p05' }],
  ],
);

export const History = createNodeIcon(
  'History',
  [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', key: '1357e3' }],
    ['path', { d: 'M3 3v5h5', key: '1xhq8a' }],
    ['path', { d: 'M12 7v5l4 2', key: '1fdv2h' }],
  ],
);

export const Image = createNodeIcon(
  'Image',
  [
    ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2', key: '1m3agn' }],
    ['circle', { cx: '9', cy: '9', r: '2', key: 'af1f0g' }],
    ['path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21', key: '1xmnt7' }],
  ],
);

export const ImageIcon = Image;

export const Laptop = createNodeIcon(
  'Laptop',
  [
    ['path', { d: 'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16', key: 'tarvll' }],
  ],
);

export const Link = createNodeIcon(
  'Link',
  [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', key: '1cjeqo' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', key: '19qd67' }],
  ],
);

export const LogIn = createNodeIcon(
  'LogIn',
  [
    ['path', { d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', key: 'u53s6r' }],
    ['polyline', { points: '10 17 15 12 10 7', key: '1ail0h' }],
    ['line', { x1: '15', x2: '3', y1: '12', y2: '12', key: 'v6grx8' }],
  ],
);

export const Minus = createNodeIcon(
  'Minus',
  [
    ['path', { d: 'M5 12h14', key: '1ays0h' }],
  ],
);

export const MoreVertical = createNodeIcon(
  'MoreVertical',
  [
    ['circle', { cx: '12', cy: '12', r: '1', key: '41hilf' }],
    ['circle', { cx: '12', cy: '5', r: '1', key: 'gxeob9' }],
    ['circle', { cx: '12', cy: '19', r: '1', key: 'lyex9k' }],
  ],
);

export const ParkingCircle = createNodeIcon(
  'ParkingCircle',
  [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'M9 17V7h4a3 3 0 0 1 0 6H9', key: '1dfk2c' }],
  ],
);

export const Radar = createNodeIcon(
  'Radar',
  [
    ['path', { d: 'M19.07 4.93A10 10 0 0 0 6.99 3.34', key: 'z3du51' }],
    ['path', { d: 'M4 6h.01', key: 'oypzma' }],
    ['path', { d: 'M2.29 9.62A10 10 0 1 0 21.31 8.35', key: 'qzzz0' }],
    ['path', { d: 'M16.24 7.76A6 6 0 1 0 8.23 16.67', key: '1yjesh' }],
    ['path', { d: 'M12 18h.01', key: 'mhygvu' }],
    ['path', { d: 'M17.99 11.66A6 6 0 0 1 15.77 16.67', key: '1u2y91' }],
    ['circle', { cx: '12', cy: '12', r: '2', key: '1c9p78' }],
    ['path', { d: 'm13.41 10.59 5.66-5.66', key: 'mhq4k0' }],
  ],
);

export const RotateCcw = createNodeIcon(
  'RotateCcw',
  [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', key: '1357e3' }],
    ['path', { d: 'M3 3v5h5', key: '1xhq8a' }],
  ],
);

export const ScanEye = createNodeIcon(
  'ScanEye',
  [
    ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2', key: 'aa7l1z' }],
    ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2', key: '4qcy5o' }],
    ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2', key: '6vwrx8' }],
    ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2', key: 'ioqczr' }],
    ['circle', { cx: '12', cy: '12', r: '1', key: '41hilf' }],
    ['path', { d: 'M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0', key: '11ak4c' }],
  ],
);

export const Settings = createNodeIcon(
  'Settings',
  [
    ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', key: '1qme2f' }],
    ['circle', { cx: '12', cy: '12', r: '3', key: '1v7zrd' }],
  ],
);

export const Share2 = createNodeIcon(
  'Share2',
  [
    ['circle', { cx: '18', cy: '5', r: '3', key: 'gq8acd' }],
    ['circle', { cx: '6', cy: '12', r: '3', key: 'w7nqdw' }],
    ['circle', { cx: '18', cy: '19', r: '3', key: '1xt0gg' }],
    ['line', { x1: '8.59', x2: '15.42', y1: '13.51', y2: '17.49', key: '47mynk' }],
    ['line', { x1: '15.41', x2: '8.59', y1: '6.51', y2: '10.49', key: '1n3mei' }],
  ],
);

export const ShoppingBag = createNodeIcon(
  'ShoppingBag',
  [
    ['path', { d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', key: 'hou9p0' }],
    ['path', { d: 'M3 6h18', key: 'd0wm0j' }],
    ['path', { d: 'M16 10a4 4 0 0 1-8 0', key: '1ltviw' }],
  ],
);

export const Siren = createNodeIcon(
  'Siren',
  [
    ['path', { d: 'M7 18v-6a5 5 0 1 1 10 0v6', key: 'pcx96s' }],
    ['path', { d: 'M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z', key: '1b4s83' }],
    ['path', { d: 'M21 12h1', key: 'jtio3y' }],
    ['path', { d: 'M18.5 4.5 18 5', key: 'g5sp9y' }],
    ['path', { d: 'M2 12h1', key: '1uaihz' }],
    ['path', { d: 'M12 2v1', key: '11qlp1' }],
    ['path', { d: 'm4.929 4.929.707.707', key: '1i51kw' }],
    ['path', { d: 'M12 12v6', key: '3ahymv' }],
  ],
);

export const Smartphone = createNodeIcon(
  'Smartphone',
  [
    ['rect', { width: '14', height: '20', x: '5', y: '2', rx: '2', ry: '2', key: '1yt0o3' }],
    ['path', { d: 'M12 18h.01', key: 'mhygvu' }],
  ],
);

export const Square = createNodeIcon(
  'Square',
  [
    ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', key: 'afitv7' }],
  ],
);

export const Target = createNodeIcon(
  'Target',
  [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['circle', { cx: '12', cy: '12', r: '6', key: '1vlfrh' }],
    ['circle', { cx: '12', cy: '12', r: '2', key: '1c9p78' }],
  ],
);

export const Tent = createNodeIcon(
  'Tent',
  [
    ['path', { d: 'M3.5 21 14 3', key: '1szst5' }],
    ['path', { d: 'M20.5 21 10 3', key: '1310c3' }],
    ['path', { d: 'M15.5 21 12 15l-3.5 6', key: '1ddtfw' }],
    ['path', { d: 'M2 21h20', key: '1nyx9w' }],
  ],
);

export const Truck = createNodeIcon(
  'Truck',
  [
    ['path', { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', key: 'wrbu53' }],
    ['path', { d: 'M15 18H9', key: '1lyqi6' }],
    ['path', { d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14', key: 'lysw3i' }],
    ['circle', { cx: '17', cy: '18', r: '2', key: '332jqn' }],
    ['circle', { cx: '7', cy: '18', r: '2', key: '19iecd' }],
  ],
);

export const Unlink = createNodeIcon(
  'Unlink',
  [
    ['path', { d: 'm18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71', key: 'yqzxt4' }],
    ['path', { d: 'm5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71', key: '4qinb0' }],
    ['line', { x1: '8', x2: '8', y1: '2', y2: '5', key: '1041cp' }],
    ['line', { x1: '2', x2: '5', y1: '8', y2: '8', key: '14m1p5' }],
    ['line', { x1: '16', x2: '16', y1: '19', y2: '22', key: 'rzdirn' }],
    ['line', { x1: '19', x2: '22', y1: '16', y2: '16', key: 'ox905f' }],
  ],
);

export const UserMinus = createNodeIcon(
  'UserMinus',
  [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', key: '1yyitq' }],
    ['circle', { cx: '9', cy: '7', r: '4', key: 'nufk8' }],
    ['line', { x1: '22', x2: '16', y1: '11', y2: '11', key: '1shjgl' }],
  ],
);

export const Wallet = createNodeIcon(
  'Wallet',
  [
    ['path', { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', key: '18etb6' }],
    ['path', { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4', key: 'xoc0q4' }],
  ],
);

export const Wifi = createNodeIcon(
  'Wifi',
  [
    ['path', { d: 'M12 20h.01', key: 'zekei9' }],
    ['path', { d: 'M2 8.82a15 15 0 0 1 20 0', key: 'dnpr2z' }],
    ['path', { d: 'M5 12.859a10 10 0 0 1 14 0', key: '1x1e6c' }],
    ['path', { d: 'M8.5 16.429a5 5 0 0 1 7 0', key: '1bycff' }],
  ],
);

export const WifiOff = createNodeIcon(
  'WifiOff',
  [
    ['path', { d: 'M12 20h.01', key: 'zekei9' }],
    ['path', { d: 'M8.5 16.429a5 5 0 0 1 7 0', key: '1bycff' }],
    ['path', { d: 'M5 12.859a10 10 0 0 1 5.17-2.69', key: '1dl1wf' }],
    ['path', { d: 'M19 12.859a10 10 0 0 0-2.007-1.523', key: '4k23kn' }],
    ['path', { d: 'M2 8.82a15 15 0 0 1 4.177-2.643', key: '1grhjp' }],
    ['path', { d: 'M22 8.82a15 15 0 0 0-11.288-3.764', key: 'z3jwby' }],
    ['path', { d: 'm2 2 20 20', key: '1ooewy' }],
  ],
);

export const Wrench = createNodeIcon(
  'Wrench',
  [
    ['path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.24-3.24a6 6 0 0 1-7.88 7.88l-8 8a2 2 0 1 1-2.83-2.83l8-8a6 6 0 0 1 7.88-7.88z', key: 'wrench-body' }],
  ],
);
