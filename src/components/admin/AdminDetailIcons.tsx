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

export function AdminAlertTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function AdminCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </BaseIcon>
  );
}

export function AdminDownloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </BaseIcon>
  );
}

export function AdminClipboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    </BaseIcon>
  );
}

export function AdminClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function AdminEditIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 20 8-8-4-4-8 8-1 5 5-1Z" />
      <path d="m14 6 4 4" />
    </BaseIcon>
  );
}

export function AdminEyeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </BaseIcon>
  );
}

export function AdminLinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 1 0-7.07-7.07L11 5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19" />
    </BaseIcon>
  );
}

export function AdminFileSearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <circle cx="11" cy="13" r="3" />
      <path d="m16 18-2-2" />
    </BaseIcon>
  );
}

export function AdminFilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </BaseIcon>
  );
}

export function AdminFolderOpenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 19h15a2 2 0 0 0 1.94-1.5L22 10H9.5a2 2 0 0 0-1.93 1.48L6.4 15H3V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1" />
    </BaseIcon>
  );
}

export function AdminPlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function AdminRefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 0 1-15.36 6.36" />
      <path d="M3 12A9 9 0 0 1 18.36 5.64" />
      <path d="M21 3v6h-6" />
      <path d="M3 21v-6h6" />
    </BaseIcon>
  );
}

export function AdminUploadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 21h14" />
    </BaseIcon>
  );
}

export function AdminSaveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 21h14a1 1 0 0 0 1-1V8l-4-4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1Z" />
      <path d="M8 21v-7h8v7" />
      <path d="M8 4v5h6" />
    </BaseIcon>
  );
}

export function AdminSparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z" />
      <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z" />
    </BaseIcon>
  );
}

export function AdminSirenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 18v-3a5 5 0 1 1 10 0v3" />
      <path d="M5 18h14" />
      <path d="M12 3v3" />
      <path d="m4.5 7.5 2.1 2.1" />
      <path d="m19.5 7.5-2.1 2.1" />
    </BaseIcon>
  );
}
