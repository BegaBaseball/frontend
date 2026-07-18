import type { ReactNode, SVGProps } from 'react';

type VerificationDialogIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function VerificationDialogSvgIcon({
  size = 24,
  children,
  ...props
}: VerificationDialogIconProps & { children: ReactNode }) {
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

export function VerificationDialogLockIcon(props: VerificationDialogIconProps) {
  return (
    <VerificationDialogSvgIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </VerificationDialogSvgIcon>
  );
}

export function VerificationDialogShieldIcon(props: VerificationDialogIconProps) {
  return (
    <VerificationDialogSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </VerificationDialogSvgIcon>
  );
}

export function VerificationDialogShieldCheckIcon(props: VerificationDialogIconProps) {
  return (
    <VerificationDialogSvgIcon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </VerificationDialogSvgIcon>
  );
}
