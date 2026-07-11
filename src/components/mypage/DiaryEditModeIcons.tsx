import type { ReactNode, SVGProps } from 'react';

type DiaryEditModeIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function DiaryEditModeSvgIcon({
  size = 24,
  children,
  ...props
}: DiaryEditModeIconProps & { children: ReactNode }) {
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

export function DiaryEditModeCameraIcon(props: DiaryEditModeIconProps) {
  return (
    <DiaryEditModeSvgIcon {...props}>
      <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" />
      <circle cx="12" cy="13" r="3" />
    </DiaryEditModeSvgIcon>
  );
}

export function DiaryEditModeCloseIcon(props: DiaryEditModeIconProps) {
  return (
    <DiaryEditModeSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </DiaryEditModeSvgIcon>
  );
}

export function DiaryEditModeLoaderIcon(props: DiaryEditModeIconProps) {
  return (
    <DiaryEditModeSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </DiaryEditModeSvgIcon>
  );
}

export function DiaryEditModeTicketIcon(props: DiaryEditModeIconProps) {
  return (
    <DiaryEditModeSvgIcon {...props}>
      <path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3Z" />
      <path d="M9 8v8" />
      <path d="M15 8v8" />
    </DiaryEditModeSvgIcon>
  );
}
