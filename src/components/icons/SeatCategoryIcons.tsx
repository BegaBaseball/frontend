import type { ReactNode, SVGProps } from 'react';

type SeatCategoryIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function SeatCategorySvgIcon({
  size = 24,
  children,
  ...props
}: SeatCategoryIconProps & { children: ReactNode }) {
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

export function SeatDiamondIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="m12 3 8 9-8 9-8-9 8-9Z" />
      <path d="M4 12h16" />
      <path d="m9 3-2 9 5 9 5-9-2-9" />
    </SeatCategorySvgIcon>
  );
}

export function SeatEyeIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SeatCategorySvgIcon>
  );
}

export function SeatMegaphoneIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="m3 11 18-5v12L3 13v-2Z" />
      <path d="M7 13v5a2 2 0 0 0 2 2h1" />
    </SeatCategorySvgIcon>
  );
}

export function SeatTentIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="M3 20 12 4l9 16Z" />
      <path d="M12 4v16" />
      <path d="M7 20h10" />
    </SeatCategorySvgIcon>
  );
}

export function SeatUtensilsIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="M4 3v7" />
      <path d="M8 3v7" />
      <path d="M6 3v18" />
      <path d="M18 3v18" />
      <path d="M18 3a4 4 0 0 0 0 8" />
    </SeatCategorySvgIcon>
  );
}

export function SeatZapIcon(props: SeatCategoryIconProps) {
  return (
    <SeatCategorySvgIcon {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </SeatCategorySvgIcon>
  );
}
