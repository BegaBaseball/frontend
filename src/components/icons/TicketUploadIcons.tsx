import type { ReactNode, SVGProps } from 'react';

type TicketUploadIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function TicketUploadSvgIcon({
  size = 24,
  children,
  ...props
}: TicketUploadIconProps & { children: ReactNode }) {
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

export function TicketUploadCheckCircleIcon(props: TicketUploadIconProps) {
  return (
    <TicketUploadSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </TicketUploadSvgIcon>
  );
}

export function TicketUploadLoaderIcon(props: TicketUploadIconProps) {
  return (
    <TicketUploadSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </TicketUploadSvgIcon>
  );
}

export function TicketUploadTicketIcon(props: TicketUploadIconProps) {
  return (
    <TicketUploadSvgIcon {...props}>
      <path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" />
    </TicketUploadSvgIcon>
  );
}

export function TicketUploadUploadIcon(props: TicketUploadIconProps) {
  return (
    <TicketUploadSvgIcon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </TicketUploadSvgIcon>
  );
}
