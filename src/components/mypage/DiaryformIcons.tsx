import type { ReactNode, SVGProps } from 'react';

type DiaryformIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function DiaryformSvgIcon({
  size = 24,
  children,
  ...props
}: DiaryformIconProps & { children: ReactNode }) {
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

export function DiaryformArrowLeftIcon(props: DiaryformIconProps) {
  return (
    <DiaryformSvgIcon {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </DiaryformSvgIcon>
  );
}

export function DiaryformChevronLeftIcon(props: DiaryformIconProps) {
  return (
    <DiaryformSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </DiaryformSvgIcon>
  );
}

export function DiaryformChevronRightIcon(props: DiaryformIconProps) {
  return (
    <DiaryformSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </DiaryformSvgIcon>
  );
}
