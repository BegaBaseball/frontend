import type { ReactNode, SVGProps } from 'react';

type AdminPanelIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  weight?: string;
};

function AdminPanelSvgIcon({
  size = 24,
  children,
  weight: _weight,
  'aria-hidden': ariaHidden = true,
  focusable = false,
  ...props
}: AdminPanelIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden={ariaHidden}
      focusable={focusable}
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

export function AdminActivityIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </AdminPanelSvgIcon>
  );
}

export function AdminBotIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 12h.01M15 12h.01M9 16h6M12 3v4M8 3h8" />
    </AdminPanelSvgIcon>
  );
}

export function AdminBugIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M8 2l1.5 2M16 2l-1.5 2M3 13h4M17 13h4M5 8l2 1M19 8l-2 1M5 18l2-1M19 18l-2-1" />
      <rect x="7" y="4" width="10" height="16" rx="5" />
      <path d="M12 4v16" />
    </AdminPanelSvgIcon>
  );
}

export function AdminCalendarIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </AdminPanelSvgIcon>
  );
}

export function AdminCameraIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" />
      <circle cx="12" cy="13" r="3" />
    </AdminPanelSvgIcon>
  );
}

export function AdminMapPinIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </AdminPanelSvgIcon>
  );
}

export function AdminMessageSquareIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 9h8M8 13h5" />
    </AdminPanelSvgIcon>
  );
}

export function AdminNewspaperIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M4 4h14v16H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z" />
      <path d="M18 8h2a2 2 0 0 1 2 2v7a3 3 0 0 1-3 3h-1M7 8h7M7 12h7M7 16h4" />
    </AdminPanelSvgIcon>
  );
}

export function AdminSearchIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </AdminPanelSvgIcon>
  );
}

export function AdminShieldAlertIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4M12 16h.01" />
    </AdminPanelSvgIcon>
  );
}

export function AdminTrashIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 10v7M14 10v7" />
    </AdminPanelSvgIcon>
  );
}

export function AdminTrendingUpIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </AdminPanelSvgIcon>
  );
}

export function AdminUserCogIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 9.5-4.9" />
      <circle cx="17" cy="17" r="3" />
      <path d="M17 12.5v1M17 20.5v1M12.5 17h1M20.5 17h1M13.8 13.8l.7.7M19.5 19.5l.7.7M20.2 13.8l-.7.7M14.5 19.5l-.7.7" />
    </AdminPanelSvgIcon>
  );
}

export function AdminUsersIcon(props: AdminPanelIconProps) {
  return (
    <AdminPanelSvgIcon {...props}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-2a6 6 0 0 1 12 0v2M16 4.5a4 4 0 0 1 0 7M17 15a6 6 0 0 1 5 6" />
    </AdminPanelSvgIcon>
  );
}
