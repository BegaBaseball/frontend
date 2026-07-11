import type { ReactNode, SVGProps } from 'react';

type NotificationPanelIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function NotificationPanelSvgIcon({
  size = 24,
  children,
  ...props
}: NotificationPanelIconProps & { children: ReactNode }) {
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

export function NotificationAlertTriangleIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationBellIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationCalendarIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationCheckCheckIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m3 12 4 4 4-8" />
      <path d="m13 12 4 4 4-8" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationCheckIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m5 12 5 5L20 7" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationClockIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationCloseIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationFileTextIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationHeartIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationMessageCircleIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-4-.9L3 21l1.5-4.6a8.6 8.6 0 1 1 16.5-4.9Z" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationMessageSquareIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationRepeatIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m17 1 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationShieldAlertIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationStarIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationTrashIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </NotificationPanelSvgIcon>
  );
}

export function NotificationUserPlusIcon(props: NotificationPanelIconProps) {
  return (
    <NotificationPanelSvgIcon {...props}>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </NotificationPanelSvgIcon>
  );
}
