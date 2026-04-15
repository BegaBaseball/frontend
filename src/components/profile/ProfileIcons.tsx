import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({
  className,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ProfileAlertCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function ProfileBanIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </BaseIcon>
  );
}

export function ProfileBellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </BaseIcon>
  );
}

export function ProfileBellOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 3 18 18" />
      <path d="M8.7 4.8A6 6 0 0 1 18 9c0 7 3 8 3 8H8" />
      <path d="M6.3 6.3A5.97 5.97 0 0 0 6 9c0 4.2-1.1 6.3-2 7.2" />
      <path d="M10 20a2 2 0 0 0 3.3 1.5" />
    </BaseIcon>
  );
}

export function ProfileLoaderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-9-9" />
    </BaseIcon>
  );
}

export function ProfileQuoteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 11H5V7h4v4Z" />
      <path d="M19 11h-4V7h4v4Z" />
      <path d="M5 11c0 4-2 6-2 6" />
      <path d="M15 11c0 4-2 6-2 6" />
    </BaseIcon>
  );
}

export function ProfileTrophyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M6 5H4a2 2 0 0 0 2 5h1" />
      <path d="M18 5h2a2 2 0 0 1-2 5h-1" />
      <path d="M12 11v4" />
      <path d="M8 21h8" />
      <path d="M10 15h4v6h-4z" />
    </BaseIcon>
  );
}

export function ProfileUserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </BaseIcon>
  );
}

export function ProfileUserMinusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M4 20a6 6 0 0 1 12 0" />
      <path d="M16 11h6" />
    </BaseIcon>
  );
}

export function ProfileUserPlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M4 20a6 6 0 0 1 12 0" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </BaseIcon>
  );
}

export function ProfileUsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
  );
}

export function ProfileCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </BaseIcon>
  );
}
