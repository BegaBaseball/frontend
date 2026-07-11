import type { ReactNode, SVGProps } from 'react';

type HomeSecondaryIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function HomeSecondarySvgIcon({
  size = 24,
  children,
  ...props
}: HomeSecondaryIconProps & { children: ReactNode }) {
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

export function HomeSecondaryChevronLeftIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryChevronRightIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryFlameIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="M12 22c4 0 7-2.8 7-6.8 0-2.7-1.4-4.9-3.6-6.4.1 1.7-.6 3.1-1.8 4-1.4-3.6-3.4-6.2-6.2-8.8.2 4.1-2.4 6.1-2.4 10.4C5 18.8 8 22 12 22Z" />
      <path d="M12 22c1.8 0 3.2-1.2 3.2-3 0-1.4-.8-2.5-2.2-3.4-.2 1-.8 1.8-1.7 2.3-.4-1.4-1.2-2.6-2.4-3.7.1 2.4-.9 3.4-.9 4.8 0 1.8 1.4 3 4 3Z" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryMessageSquareIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryRefreshIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="M20 11a8 8 0 0 0-14.9-3" />
      <path d="M5 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3" />
      <path d="M19 20v-4h-4" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryTrophyIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a2 2 0 0 0 0 4h3" />
      <path d="M16 6h3a2 2 0 0 1 0 4h-3" />
      <path d="M12 13v5" />
      <path d="M8 21h8" />
      <path d="M10 18h4" />
    </HomeSecondarySvgIcon>
  );
}

export function HomeSecondaryUsersIcon(props: HomeSecondaryIconProps) {
  return (
    <HomeSecondarySvgIcon {...props}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 11a4 4 0 0 1 0-6" />
      <path d="M22 21a7 7 0 0 0-5-6.7" />
    </HomeSecondarySvgIcon>
  );
}
