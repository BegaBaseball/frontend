import type { ReactNode, SVGProps } from 'react';

type ImageGridIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function ImageGridSvgIcon({
  size = 24,
  children,
  ...props
}: ImageGridIconProps & { children: ReactNode }) {
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

export function ImageGridChevronLeftIcon(props: ImageGridIconProps) {
  return (
    <ImageGridSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </ImageGridSvgIcon>
  );
}

export function ImageGridChevronRightIcon(props: ImageGridIconProps) {
  return (
    <ImageGridSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </ImageGridSvgIcon>
  );
}

export function ImageGridCloseIcon(props: ImageGridIconProps) {
  return (
    <ImageGridSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </ImageGridSvgIcon>
  );
}

export function ImageGridImageOffIcon(props: ImageGridIconProps) {
  return (
    <ImageGridSvgIcon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6 8 13.5 5.5 11 3 14v3a2 2 0 0 0 2 2h12" />
      <path d="M14 5h5a2 2 0 0 1 2 2v10" />
      <path d="M5 5h2" />
      <circle cx="16.5" cy="8.5" r="1.5" />
    </ImageGridSvgIcon>
  );
}
