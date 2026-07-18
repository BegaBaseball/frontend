import type { ReactNode, SVGProps } from 'react';

type AdminDetailIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  weight?: string;
};

function AdminDetailSvgIcon({
  size = 24,
  children,
  weight: _weight,
  'aria-hidden': ariaHidden = true,
  focusable = false,
  ...props
}: AdminDetailIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden={ariaHidden}
      focusable={focusable}
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

export function AdminAlertTriangleIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="m21.7 18-7.9-14a2 2 0 0 0-3.6 0L2.3 18A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </AdminDetailSvgIcon>
  );
}

export function AdminCloseIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </AdminDetailSvgIcon>
  );
}

export function AdminDownloadIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </AdminDetailSvgIcon>
  );
}

export function AdminClipboardIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0v2H9V4ZM9 11h6M9 15h6" />
    </AdminDetailSvgIcon>
  );
}

export function AdminClockIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </AdminDetailSvgIcon>
  );
}

export function AdminEditIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </AdminDetailSvgIcon>
  );
}

export function AdminEyeIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </AdminDetailSvgIcon>
  );
}

export function AdminLinkIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </AdminDetailSvgIcon>
  );
}

export function AdminFileSearchIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" />
      <path d="M14 2v6h6M20 8v4" />
      <circle cx="17" cy="17" r="3" />
      <path d="m21 21-1.8-1.8" />
    </AdminDetailSvgIcon>
  );
}

export function AdminFilterIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M3 5h18l-7 8v6l-4 2v-8Z" />
    </AdminDetailSvgIcon>
  );
}

export function AdminFolderOpenIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2" />
      <path d="M3 10h18l-3 9H6Z" />
    </AdminDetailSvgIcon>
  );
}

export function AdminPlusIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </AdminDetailSvgIcon>
  );
}

export function AdminRefreshIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 8A7 7 0 0 1 18.5 6L20 8M4 16l1.5 2A7 7 0 0 0 18 16" />
    </AdminDetailSvgIcon>
  );
}

export function AdminUploadIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
    </AdminDetailSvgIcon>
  );
}

export function AdminSaveIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M5 3h12l3 3v15H4V4a1 1 0 0 1 1-1Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </AdminDetailSvgIcon>
  );
}

export function AdminSparklesIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2ZM5 14l-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8ZM19 13l-.7 1.8-1.8.7 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.7Z" />
    </AdminDetailSvgIcon>
  );
}

export function AdminSirenIcon(props: AdminDetailIconProps) {
  return (
    <AdminDetailSvgIcon {...props}>
      <path d="M7 17v-6a5 5 0 0 1 10 0v6M5 21h14M9 17h6M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M2 12h2M20 12h2" />
    </AdminDetailSvgIcon>
  );
}
