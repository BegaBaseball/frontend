import type { ReactNode, SVGProps } from 'react';

type OffseasonIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function OffseasonSvgIcon({
  size = 24,
  children,
  ...props
}: OffseasonIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function AlertCircleIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </OffseasonSvgIcon>
  );
}

export function ArrowUpDownIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
      <path d="M12 4v16" />
    </OffseasonSvgIcon>
  );
}

export function AwardIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5" />
    </OffseasonSvgIcon>
  );
}

export function Building2Icon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M4 22h16" />
      <path d="M9 6h1" />
      <path d="M14 6h1" />
      <path d="M9 10h1" />
      <path d="M14 10h1" />
      <path d="M9 14h1" />
      <path d="M14 14h1" />
    </OffseasonSvgIcon>
  );
}

export function CalendarDaysIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
    </OffseasonSvgIcon>
  );
}

export function ChevronLeftIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </OffseasonSvgIcon>
  );
}

export function ChevronDownIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </OffseasonSvgIcon>
  );
}

export function ClockIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </OffseasonSvgIcon>
  );
}

export function CrownIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m2 6 5 4 5-7 5 7 5-4-3 12H5Z" />
      <path d="M5 22h14" />
    </OffseasonSvgIcon>
  );
}

export function FilterIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M22 3H2l8 9.5V19l4 2v-8.5Z" />
    </OffseasonSvgIcon>
  );
}

export function InfoIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </OffseasonSvgIcon>
  );
}

export function NewspaperIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M4 22h14a2 2 0 0 0 2-2V7H8v13a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2h10" />
      <path d="M10 12h6" />
      <path d="M10 16h6" />
      <path d="M10 8h6" />
    </OffseasonSvgIcon>
  );
}

export function RefreshIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </OffseasonSvgIcon>
  );
}

export function SearchIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </OffseasonSvgIcon>
  );
}

export function SparklesIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      <path d="m5 3 .8 2.2L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </OffseasonSvgIcon>
  );
}

export function TrendingUpIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </OffseasonSvgIcon>
  );
}

export function TrophyIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M5 5H3a3 3 0 0 0 3 3h1" />
      <path d="M19 5h2a3 3 0 0 1-3 3h-1" />
    </OffseasonSvgIcon>
  );
}

export function XIcon(props: OffseasonIconProps) {
  return (
    <OffseasonSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </OffseasonSvgIcon>
  );
}
