import type { ReactNode, SVGProps } from 'react';

type MateCreateIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function MateCreateSvgIcon({
  size = 24,
  children,
  ...props
}: MateCreateIconProps & { children: ReactNode }) {
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

export function MateCreateAlertCircleIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </MateCreateSvgIcon>
  );
}

export function MateCreateCheckCircleIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </MateCreateSvgIcon>
  );
}

export function MateCreateChevronLeftIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </MateCreateSvgIcon>
  );
}

export function MateCreateChevronRightIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </MateCreateSvgIcon>
  );
}

export function MateCreateLoaderIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </MateCreateSvgIcon>
  );
}

export function MateCreateTicketIcon(props: MateCreateIconProps) {
  return (
    <MateCreateSvgIcon {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" />
      <path d="M9 8h.01" />
      <path d="M9 12h.01" />
      <path d="M9 16h.01" />
      <path d="M13 9h4" />
      <path d="M13 15h4" />
    </MateCreateSvgIcon>
  );
}
