import type { ReactNode, SVGProps } from 'react';

type DirectMessageIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function DirectMessageSvgIcon({
  size = 24,
  children,
  ...props
}: DirectMessageIconProps & { children: ReactNode }) {
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

export function DirectMessageArrowLeftIcon(props: DirectMessageIconProps) {
  return (
    <DirectMessageSvgIcon {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </DirectMessageSvgIcon>
  );
}

export function DirectMessageMessageCircleIcon(props: DirectMessageIconProps) {
  return (
    <DirectMessageSvgIcon {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-4-.9L3 21l1.5-4.6a8.6 8.6 0 1 1 16.5-4.9Z" />
    </DirectMessageSvgIcon>
  );
}

export function DirectMessageSpinnerIcon(props: DirectMessageIconProps) {
  return (
    <DirectMessageSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </DirectMessageSvgIcon>
  );
}

export function DirectMessageTrashIcon(props: DirectMessageIconProps) {
  return (
    <DirectMessageSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </DirectMessageSvgIcon>
  );
}

export function DirectMessageXCircleIcon(props: DirectMessageIconProps) {
  return (
    <DirectMessageSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </DirectMessageSvgIcon>
  );
}
