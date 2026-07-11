import type { SVGProps } from 'react';

type AdminShieldIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  weight?: string;
};

export function AdminShieldIcon({
  size = 24,
  weight: _weight,
  'aria-hidden': ariaHidden = true,
  focusable = false,
  ...props
}: AdminShieldIconProps) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}
