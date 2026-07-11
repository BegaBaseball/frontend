import type { ReactNode, SVGProps } from 'react';

type MateFlowIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function MateFlowSvgIcon({
  size = 24,
  children,
  ...props
}: MateFlowIconProps & { children: ReactNode }) {
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

export function MateAlertCircleIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateArrowRightCircleIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 16 4-4-4-4" />
      <path d="M8 12h8" />
    </MateFlowSvgIcon>
  );
}

export function MateCalendarIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
    </MateFlowSvgIcon>
  );
}

export function MateCheckCircleIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </MateFlowSvgIcon>
  );
}

export function MateChevronLeftIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </MateFlowSvgIcon>
  );
}

export function MateChevronDownIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </MateFlowSvgIcon>
  );
}

export function MateChevronRightIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </MateFlowSvgIcon>
  );
}

export function MateClockIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </MateFlowSvgIcon>
  );
}

export function MateCloseIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </MateFlowSvgIcon>
  );
}

export function MateHeartIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </MateFlowSvgIcon>
  );
}

export function MateFlameIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </MateFlowSvgIcon>
  );
}

export function MateImageIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </MateFlowSvgIcon>
  );
}

export function MateListBulletsIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="4" cy="12" fill="currentColor" r="1.2" stroke="none" />
      <circle cx="4" cy="18" fill="currentColor" r="1.2" stroke="none" />
    </MateFlowSvgIcon>
  );
}

export function MateInfoIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateLoaderIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </MateFlowSvgIcon>
  );
}

export function MateMapPinIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </MateFlowSvgIcon>
  );
}

export function MateMessageSquareIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </MateFlowSvgIcon>
  );
}

export function MatePencilIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </MateFlowSvgIcon>
  );
}

export function MatePlusIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </MateFlowSvgIcon>
  );
}

export function MateQrCodeIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <rect height="5" width="5" x="3" y="3" />
      <rect height="5" width="5" x="16" y="3" />
      <rect height="5" width="5" x="3" y="16" />
      <path d="M16 16h.01" />
      <path d="M21 16h.01" />
      <path d="M16 21h.01" />
      <path d="M21 21h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateRefreshIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </MateFlowSvgIcon>
  );
}

export function MateRowsIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <rect height="4" rx="1" width="18" x="3" y="5" />
      <rect height="4" rx="1" width="18" x="3" y="10" />
      <rect height="4" rx="1" width="18" x="3" y="15" />
    </MateFlowSvgIcon>
  );
}

export function MateSearchIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </MateFlowSvgIcon>
  );
}

export function MateSendIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </MateFlowSvgIcon>
  );
}

export function MateShieldIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </MateFlowSvgIcon>
  );
}

export function MateSquaresFourIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </MateFlowSvgIcon>
  );
}

export function MateStarIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    </MateFlowSvgIcon>
  );
}

export function MateTicketIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" />
    </MateFlowSvgIcon>
  );
}

export function MateTrashIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </MateFlowSvgIcon>
  );
}

export function MateUsersIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </MateFlowSvgIcon>
  );
}

export function MateWalletIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M20 7H5a2 2 0 0 1 0-4h12" />
      <path d="M20 7v14H5a2 2 0 0 1-2-2V5" />
      <path d="M16 13h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateWifiIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateWifiOffIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <path d="m2 2 20 20" />
      <path d="M8.5 16a5 5 0 0 1 6.5-.5" />
      <path d="M5 12.5a10 10 0 0 1 7.5-2.9" />
      <path d="M12 20h.01" />
    </MateFlowSvgIcon>
  );
}

export function MateXCircleIcon(props: MateFlowIconProps) {
  return (
    <MateFlowSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </MateFlowSvgIcon>
  );
}
