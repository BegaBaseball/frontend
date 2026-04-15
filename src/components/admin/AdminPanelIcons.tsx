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

export function AdminActivityIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </BaseIcon>
  );
}

export function AdminBotIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="7" width="14" height="10" rx="2" />
      <path d="M12 3v4" />
      <path d="M8 17v3" />
      <path d="M16 17v3" />
      <path d="M5 10H3" />
      <path d="M21 10h-2" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="14" cy="12" r="1" />
    </BaseIcon>
  );
}

export function AdminBugIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 9h6" />
      <path d="M10 4h4" />
      <path d="M12 4v2" />
      <rect x="7" y="6" width="10" height="12" rx="5" />
      <path d="M3 13h4" />
      <path d="M17 13h4" />
      <path d="M5 8 7.5 9.5" />
      <path d="M19 8 16.5 9.5" />
      <path d="M5 18 7.5 16.5" />
      <path d="M19 18 16.5 16.5" />
    </BaseIcon>
  );
}

export function AdminCalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </BaseIcon>
  );
}

export function AdminCameraIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 8h4l2-2h4l2 2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="14" r="4" />
    </BaseIcon>
  );
}

export function AdminMapPinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </BaseIcon>
  );
}

export function AdminMessageSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M21 12a8.96 8.96 0 0 1-2.64 6.36A8.96 8.96 0 0 1 12 21a8.96 8.96 0 0 1-4.24-1.06L3 21l1.06-4.76A8.96 8.96 0 0 1 3 12a9 9 0 1 1 18 0Z" />
    </BaseIcon>
  );
}

export function AdminNewspaperIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 6h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V7a1 1 0 0 1 1-1Z" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
      <path d="M8 18h5" />
    </BaseIcon>
  );
}

export function AdminSearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </BaseIcon>
  );
}

export function AdminShieldAlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5c0 5 2.9 8.84 7 10 4.1-1.16 7-5 7-10V6l-7-3Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function AdminTrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

export function AdminTrendingUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 17h18" />
      <path d="m6 14 4-4 3 3 5-6" />
      <path d="M14 7h4v4" />
    </BaseIcon>
  );
}

export function AdminUserCogIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M4 20a6 6 0 0 1 12 0" />
      <circle cx="18" cy="16" r="2" />
      <path d="m18 12 .6 1.2 1.3.2-.9.9.2 1.3-1.2-.6-1.2.6.2-1.3-.9-.9 1.3-.2Z" />
    </BaseIcon>
  );
}

export function AdminUsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
  );
}
