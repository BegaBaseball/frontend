import type { ReactNode, SVGProps } from 'react';

type CheerFlowIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CheerFlowSvgIcon({
  size = 24,
  children,
  ...props
}: CheerFlowIconProps & { children: ReactNode }) {
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

export function AlertCircleIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </CheerFlowSvgIcon>
  );
}

export function ArrowLeftIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </CheerFlowSvgIcon>
  );
}

export function ArrowUpIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </CheerFlowSvgIcon>
  );
}

export function ChevronDownIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </CheerFlowSvgIcon>
  );
}

export function BookmarkIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z" />
    </CheerFlowSvgIcon>
  );
}

export function FlameIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </CheerFlowSvgIcon>
  );
}

export function HomeIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </CheerFlowSvgIcon>
  );
}

export function ImageIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4.5-4.5L5 22" />
    </CheerFlowSvgIcon>
  );
}

export function LineChartIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="m6 16 4-5 4 3 5-8" />
    </CheerFlowSvgIcon>
  );
}

export function MegaphoneIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M3 11v2a2 2 0 0 0 2 2h3l8 4V5l-8 4H5a2 2 0 0 0-2 2Z" />
      <path d="M8 15v4" />
      <path d="M19 9a4 4 0 0 1 0 6" />
    </CheerFlowSvgIcon>
  );
}

export function MessageSquareIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </CheerFlowSvgIcon>
  );
}

export function UploadIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </CheerFlowSvgIcon>
  );
}

export function UserIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </CheerFlowSvgIcon>
  );
}

export function XIcon(props: CheerFlowIconProps) {
  return (
    <CheerFlowSvgIcon {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </CheerFlowSvgIcon>
  );
}
