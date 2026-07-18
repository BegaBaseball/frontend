import type { ReactNode, SVGProps } from 'react';

type CheerModalIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CheerModalSvgIcon({
  size = 24,
  children,
  ...props
}: CheerModalIconProps & { children: ReactNode }) {
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

export function CheerModalImagePlusIcon(props: CheerModalIconProps) {
  return (
    <CheerModalSvgIcon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      <path d="m14 8 3 3 5-5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </CheerModalSvgIcon>
  );
}

export function CheerModalLoaderIcon(props: CheerModalIconProps) {
  return (
    <CheerModalSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </CheerModalSvgIcon>
  );
}

export function CheerModalSmileIcon(props: CheerModalIconProps) {
  return (
    <CheerModalSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </CheerModalSvgIcon>
  );
}

export function CheerModalXIcon(props: CheerModalIconProps) {
  return (
    <CheerModalSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </CheerModalSvgIcon>
  );
}
