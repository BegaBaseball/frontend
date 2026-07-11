import type { ReactNode, SVGProps } from 'react';

type LandingIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function LandingSvgIcon({
  size = 24,
  children,
  ...props
}: LandingIconProps & { children: ReactNode }) {
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

export function LandingArrowRightIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </LandingSvgIcon>
  );
}

export function LandingBookOpenIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H3Z" />
      <path d="M21 18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h5Z" />
    </LandingSvgIcon>
  );
}

export function LandingChevronDownIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </LandingSvgIcon>
  );
}

export function LandingHomeIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </LandingSvgIcon>
  );
}

export function LandingLineChartIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </LandingSvgIcon>
  );
}

export function LandingMapPinIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </LandingSvgIcon>
  );
}

export function LandingMegaphoneIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="m3 11 18-5v12L3 14v-3Z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </LandingSvgIcon>
  );
}

export function LandingUsersIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </LandingSvgIcon>
  );
}

export function LandingXIcon(props: LandingIconProps) {
  return (
    <LandingSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </LandingSvgIcon>
  );
}
