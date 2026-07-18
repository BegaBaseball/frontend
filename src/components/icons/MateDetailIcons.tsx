import type { ReactNode, SVGProps } from 'react';

type MateDetailIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function MateDetailSvgIcon({
  size = 24,
  children,
  ...props
}: MateDetailIconProps & { children: ReactNode }) {
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

export function MateDetailAlertTriangleIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M12 3 22 20H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailBoxIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M4 8 12 4l8 4-8 4-8-4Z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailBulbIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8 14a6 6 0 1 1 8 0c-.8.7-1 1.4-1 2H9c0-.6-.2-1.3-1-2Z" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailCameraIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailCheckCircleIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailChevronLeftIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailClockIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailHeartIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6Z" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailInfoIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailMapIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailMapPinIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailMessageSquareIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailPulseIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailQrCodeIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2Z" />
      <path d="M18 14h2v6h-6v-2" />
      <path d="M14 20h.01" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailQuoteIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M9 7H5v5h4v5H4" />
      <path d="M20 7h-4v5h4v5h-5" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailRefreshIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M20 12a8 8 0 0 1-14.9 4" />
      <path d="M4 16v4h4" />
      <path d="M4 12a8 8 0 0 1 14.9-4" />
      <path d="M20 8V4h-4" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailShareIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4" />
      <path d="m8.6 13.5 6.8 4" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailShieldIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.9 8.6 7 10 4.1-1.4 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailStarIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailThumbsUpIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M7 10v10H4V10h3Z" />
      <path d="M7 10 12 3c1.2.5 1.6 1.7 1.1 3.1L12 10h6a2 2 0 0 1 2 2l-1 6a2.5 2.5 0 0 1-2.5 2H7" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailUsersIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </MateDetailSvgIcon>
  );
}

export function MateDetailZapIcon(props: MateDetailIconProps) {
  return (
    <MateDetailSvgIcon {...props}>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
    </MateDetailSvgIcon>
  );
}
