import type { ReactNode, SVGProps } from 'react';

type MyPageFlowIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function MyPageFlowSvgIcon({
  size = 24,
  children,
  ...props
}: MyPageFlowIconProps & { children: ReactNode }) {
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

export function MyPageAlertCircleIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageAlertTriangleIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageBanIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageBarChartIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V7" />
      <path d="M17 16v-8" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageBellIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageCheckCircleIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageClockIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageCoinsIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <ellipse cx="8" cy="7" rx="5" ry="3" />
      <path d="M3 7v6c0 1.7 2.2 3 5 3s5-1.3 5-3V7" />
      <path d="M13 9.5c2.8.2 5 1.4 5 3 0 1.7-2.2 3-5 3-.8 0-1.6-.1-2.3-.3" />
      <path d="M18 12.5v4c0 1.7-2.2 3-5 3-1.9 0-3.6-.6-4.4-1.5" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageCrownIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7Z" />
      <path d="M5 19h14" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageEditIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageEyeIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageEyeOffIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
      <path d="M9.5 5.3A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.4 3.5" />
      <path d="M6.6 6.6C3.5 8.6 2 12 2 12s3.5 7 10 7c1.2 0 2.3-.2 3.3-.6" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageFingerprintIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M2 12C2 6.5 6.5 2 12 2c2.4 0 4.6.9 6.3 2.3" />
      <path d="M21.8 10.5A10 10 0 0 1 20 18" />
      <path d="M7 12a5 5 0 0 1 10 0c0 4-1.2 6.2-3.2 8.6" />
      <path d="M10 20.5c1.3-1.8 2-4 2-8.5" />
      <path d="M4.5 17.5A14 14 0 0 0 7 12" />
      <path d="M9 6.8A6.8 6.8 0 0 1 18.8 12" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageFlameIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M12 22c4 0 7-2.8 7-6.8 0-2.8-1.6-5.3-4.8-7.5.2 1.9-.5 3.3-1.9 4.3.2-3.1-1.3-5.8-4.3-8C8.5 8 5 10.7 5 15.2 5 19.2 8 22 12 22Z" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageLaptopIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <rect height="11" rx="2" width="16" x="4" y="4" />
      <path d="M2 20h20" />
      <path d="M8 20h8" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageLinkIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageLoaderIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M21 12a9 9 0 0 1-9 9" />
      <path d="M3 12a9 9 0 0 1 9-9" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageLockIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <rect height="11" rx="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageMapPinIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageSaveIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageSearchIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageSettingsIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 18l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 6A2 2 0 1 1 7 3.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 6l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageShieldAlertIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageSmartphoneIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <rect height="20" rx="2" width="12" x="6" y="2" />
      <path d="M11 18h2" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageSparklesIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
      <path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" />
      <path d="M19 13l.8 1.8L22 16l-2.2 1.2L19 19l-.8-1.8L16 16l2.2-1.2L19 13Z" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageTicketIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageTrashIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageUnlinkIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M8 12a4 4 0 0 1 0-5.7l1.4-1.4a4 4 0 0 1 5.7 0" />
      <path d="M16 12a4 4 0 0 1 0 5.7l-1.4 1.4a4 4 0 0 1-5.7 0" />
      <path d="M3 21l18-18" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageUserPlusIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </MyPageFlowSvgIcon>
  );
}

export function MyPageUsersIcon(props: MyPageFlowIconProps) {
  return (
    <MyPageFlowSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </MyPageFlowSvgIcon>
  );
}
