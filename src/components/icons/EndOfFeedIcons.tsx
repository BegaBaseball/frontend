import type { ReactNode, SVGProps } from 'react';

type EndOfFeedIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function EndOfFeedSvgIcon({
  size = 24,
  children,
  ...props
}: EndOfFeedIconProps & { children: ReactNode }) {
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

export function EndOfFeedCheckIcon(props: EndOfFeedIconProps) {
  return (
    <EndOfFeedSvgIcon {...props}>
      <path d="m20 6-11 11-5-5" />
    </EndOfFeedSvgIcon>
  );
}
