import type { ReactNode, SVGProps } from 'react';

type CheerComposerIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CheerComposerSvgIcon({
  size = 24,
  children,
  ...props
}: CheerComposerIconProps & { children: ReactNode }) {
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

export function CheerComposerImagePlusIcon(props: CheerComposerIconProps) {
  return (
    <CheerComposerSvgIcon {...props}>
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
      <path d="M16 5v6" />
      <path d="M13 8h6" />
    </CheerComposerSvgIcon>
  );
}

export function CheerComposerSmileIcon(props: CheerComposerIconProps) {
  return (
    <CheerComposerSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </CheerComposerSvgIcon>
  );
}
