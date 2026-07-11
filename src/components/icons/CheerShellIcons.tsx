import type { SVGProps } from 'react';

type CheerShellIconProps = SVGProps<SVGSVGElement>;

function CheerShellSvgIcon({ children, ...props }: CheerShellIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function BookmarkIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="M6 4h12v17l-6-4-6 4V4Z" />
    </CheerShellSvgIcon>
  );
}

export function HomeIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </CheerShellSvgIcon>
  );
}

export function LineChartIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 3 5-7" />
    </CheerShellSvgIcon>
  );
}

export function MegaphoneIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="M4 13h3l10 5V6L7 11H4v2Z" />
      <path d="M7 13v4a2 2 0 0 0 2 2h1" />
      <path d="M19 9a3 3 0 0 1 0 6" />
    </CheerShellSvgIcon>
  );
}

export function PenSquareIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h8" />
      <path d="M4 5v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8" />
      <path d="m13 15 7-7-3-3-7 7-1 4 4-1Z" />
    </CheerShellSvgIcon>
  );
}

export function SearchIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </CheerShellSvgIcon>
  );
}

export function XIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </CheerShellSvgIcon>
  );
}

export function UserIcon(props: CheerShellIconProps) {
  return (
    <CheerShellSvgIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </CheerShellSvgIcon>
  );
}
