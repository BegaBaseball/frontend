import type { SVGProps } from 'react';

type AuthIconProps = SVGProps<SVGSVGElement>;

function AuthSvgIcon({ children, ...props }: AuthIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowLeftIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </AuthSvgIcon>
  );
}

export function CheckIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="m20 6-11 11-5-5" />
    </AuthSvgIcon>
  );
}

export function CheckCircleIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-5" />
    </AuthSvgIcon>
  );
}

export function XCircleIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </AuthSvgIcon>
  );
}

export function EyeIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </AuthSvgIcon>
  );
}

export function EyeOffIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.1 4.1" />
      <path d="M6.5 6.8A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.2-.8" />
    </AuthSvgIcon>
  );
}

export function HomeIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </AuthSvgIcon>
  );
}

export function LockIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </AuthSvgIcon>
  );
}

export function MailIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </AuthSvgIcon>
  );
}

export function ShieldAlertIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <path d="M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6l8-3Z" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </AuthSvgIcon>
  );
}

export function UserIcon(props: AuthIconProps) {
  return (
    <AuthSvgIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </AuthSvgIcon>
  );
}
