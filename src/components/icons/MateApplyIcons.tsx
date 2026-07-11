import type { ReactNode, SVGProps } from 'react';

type MateApplyIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function MateApplySvgIcon({
  size = 24,
  children,
  ...props
}: MateApplyIconProps & { children: ReactNode }) {
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

export function MateApplyAlertTriangleIcon(props: MateApplyIconProps) {
  return (
    <MateApplySvgIcon {...props}>
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </MateApplySvgIcon>
  );
}

export function MateApplyChevronLeftIcon(props: MateApplyIconProps) {
  return (
    <MateApplySvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </MateApplySvgIcon>
  );
}

export function MateApplyMessageSquareIcon(props: MateApplyIconProps) {
  return (
    <MateApplySvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </MateApplySvgIcon>
  );
}

export function MateApplyShieldIcon(props: MateApplyIconProps) {
  return (
    <MateApplySvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </MateApplySvgIcon>
  );
}

export function MateApplyWalletIcon(props: MateApplyIconProps) {
  return (
    <MateApplySvgIcon {...props}>
      <path d="M4 7V6a2 2 0 0 1 2-2h12v4" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13h5v4h-5a2 2 0 0 1 0-4Z" />
    </MateApplySvgIcon>
  );
}
