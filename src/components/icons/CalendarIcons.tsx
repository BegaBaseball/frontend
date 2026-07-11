import type { ReactNode, SVGProps } from 'react';

type CalendarIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CalendarSvgIcon({
  size = 24,
  children,
  ...props
}: CalendarIconProps & { children: ReactNode }) {
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

export function CalendarChevronLeftIcon(props: CalendarIconProps) {
  return (
    <CalendarSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </CalendarSvgIcon>
  );
}

export function CalendarChevronRightIcon(props: CalendarIconProps) {
  return (
    <CalendarSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </CalendarSvgIcon>
  );
}
