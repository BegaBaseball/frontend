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

export function MatePlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function MateSearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </BaseIcon>
  );
}

export function MateCameraIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="4" />
    </BaseIcon>
  );
}

export function MateClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function MateCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </BaseIcon>
  );
}

export function MateInfoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </BaseIcon>
  );
}

export function MateMapPinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </BaseIcon>
  );
}

export function MateMessageSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M21 12a8.96 8.96 0 0 1-2.64 6.36A8.96 8.96 0 0 1 12 21a8.96 8.96 0 0 1-4.24-1.06L3 21l1.06-4.76A8.96 8.96 0 0 1 3 12a9 9 0 1 1 18 0Z" />
    </BaseIcon>
  );
}

export function MateShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5c0 5 3.3 8.7 7 10 3.7-1.3 7-5 7-10V6l-7-3Z" />
    </BaseIcon>
  );
}

export function MateStarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.19L12 17.27l-5.56 2.84 1.06-6.19L3 9.53l6.22-.9L12 3Z" />
    </BaseIcon>
  );
}

export function MateAlertCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function MateAlertTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4 3.8 19h16.4L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 15h.01" />
    </BaseIcon>
  );
}

export function MateArrowRightCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l3 3-3 3" />
      <path d="M8 12h5" />
    </BaseIcon>
  );
}

export function MateCalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
    </BaseIcon>
  );
}

export function MateCheckCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </BaseIcon>
  );
}

export function MateChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </BaseIcon>
  );
}

export function MateChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </BaseIcon>
  );
}

export function MateLoaderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </BaseIcon>
  );
}

export function MateQrCodeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="5" height="5" rx="1" />
      <rect x="15" y="4" width="5" height="5" rx="1" />
      <rect x="4" y="15" width="5" height="5" rx="1" />
      <path d="M16 15h1" />
      <path d="M19 15h1" />
      <path d="M15 18h2" />
      <path d="M18 18h2" />
      <path d="M16 20h4" />
    </BaseIcon>
  );
}

export function MateUsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16.5 19a4.5 4.5 0 0 0-9 0" />
      <circle cx="12" cy="9" r="3" />
      <path d="M20 19a3.5 3.5 0 0 0-2.45-3.34" />
      <path d="M16.5 6.5a3 3 0 0 1 0 5.5" />
    </BaseIcon>
  );
}

export function MatePencilIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4 20 4.5-1 9-9a2.12 2.12 0 1 0-3-3l-9 9L4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </BaseIcon>
  );
}

export function MateRefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 11a8 8 0 0 0-14.6-3" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.6 3" />
      <path d="M20 20v-4h-4" />
    </BaseIcon>
  );
}

export function MateShareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="18" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="m8 11 8-5" />
      <path d="m8 13 8 5" />
    </BaseIcon>
  );
}

export function MateMapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </BaseIcon>
  );
}

export function MateSunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </BaseIcon>
  );
}

export function MateCloudIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 18h10a4 4 0 0 0 .2-8 5.5 5.5 0 0 0-10.65 1.5A3.5 3.5 0 0 0 7 18Z" />
    </BaseIcon>
  );
}

export function MateCloudRainIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 16h10a4 4 0 0 0 .2-8 5.5 5.5 0 0 0-10.65 1.5A3.5 3.5 0 0 0 7 16Z" />
      <path d="M9 18v2" />
      <path d="M12 18v3" />
      <path d="M15 18v2" />
    </BaseIcon>
  );
}

export function MateTicketIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9a2 2 0 0 0 2-2h12v4a2 2 0 0 1 0 4v4H6a2 2 0 0 0-2-2V9Z" />
      <path d="M10 7v10" />
      <path d="M10 11h.01" />
      <path d="M10 15h.01" />
    </BaseIcon>
  );
}

export function MateTrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </BaseIcon>
  );
}

export function MateWalletIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h10v14H6a2 2 0 0 1-2-2V7Z" />
      <path d="M16 9h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3" />
      <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function MateXCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </BaseIcon>
  );
}

export function MateImageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m20 15-4.5-4.5-5 5L8 13l-4 4" />
    </BaseIcon>
  );
}

export function MateSendIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 20 21 12 3 4l3 7 7 1-7 1-3 7Z" />
    </BaseIcon>
  );
}

export function MateWifiIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12.55a11 11 0 0 1 14 0" />
      <path d="M8.5 16a6 6 0 0 1 7 0" />
      <path d="M12 19h.01" />
    </BaseIcon>
  );
}

export function MateWifiOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m2 2 20 20" />
      <path d="M8.5 16a6 6 0 0 1 5.45-.72" />
      <path d="M5 12.55a11 11 0 0 1 8.17-1.72" />
      <path d="M12 19h.01" />
      <path d="M16.5 7.5A11 11 0 0 1 19 9.5" />
    </BaseIcon>
  );
}

export function MateZapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </BaseIcon>
  );
}

export function MatePulseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </BaseIcon>
  );
}

export function MateThumbsUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
    </BaseIcon>
  );
}

export function MateBoxIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
    </BaseIcon>
  );
}

export function MateBulbIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </BaseIcon>
  );
}

export function MateQuoteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 21c3 0 7-1 7-8V5H3v8h4M14 21c3 0 7-1 7-8V5h-7v8h4" />
    </BaseIcon>
  );
}

export function MateHeartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </BaseIcon>
  );
}
