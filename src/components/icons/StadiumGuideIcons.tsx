import type { SVGProps } from 'react';

type StadiumGuideIconProps = SVGProps<SVGSVGElement>;

function StadiumGuideSvgIcon({ children, ...props }: StadiumGuideIconProps) {
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

export function ArrowUpDownIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M7 3v18" />
      <path d="m3 7 4-4 4 4" />
      <path d="M17 21V3" />
      <path d="m13 17 4 4 4-4" />
    </StadiumGuideSvgIcon>
  );
}

export function ArrowSquareOutIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
    </StadiumGuideSvgIcon>
  );
}

export function BookOpenIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 1 20 23V5.5Z" />
    </StadiumGuideSvgIcon>
  );
}

export function CameraIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3" />
    </StadiumGuideSvgIcon>
  );
}

export function CaretDownIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </StadiumGuideSvgIcon>
  );
}

export const ChevronDownIcon = CaretDownIcon;

export function EyeIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </StadiumGuideSvgIcon>
  );
}

export function HeartIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </StadiumGuideSvgIcon>
  );
}

export function MapPinIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </StadiumGuideSvgIcon>
  );
}

export function ImageSquareIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m4 16 4.5-4.5 3.5 3.5 2-2 6 6" />
    </StadiumGuideSvgIcon>
  );
}

export function MinusIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M5 12h14" />
    </StadiumGuideSvgIcon>
  );
}

export function ParkingCircleIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 16V8h4a2.5 2.5 0 0 1 0 5h-4" />
    </StadiumGuideSvgIcon>
  );
}

export function PlusIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </StadiumGuideSvgIcon>
  );
}

export function RefreshIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M20 12a8 8 0 0 1-14.9 4" />
      <path d="M4 16v4h4" />
      <path d="M4 12a8 8 0 0 1 14.9-4" />
      <path d="M20 8V4h-4" />
    </StadiumGuideSvgIcon>
  );
}

export function SearchIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </StadiumGuideSvgIcon>
  );
}

export function ShoppingBagIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M6 8h12l-1 13H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </StadiumGuideSvgIcon>
  );
}

export function SpinnerGapIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M21 12a9 9 0 0 1-9 9" />
      <path d="M3 12a9 9 0 0 1 9-9" />
    </StadiumGuideSvgIcon>
  );
}

export function StarIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </StadiumGuideSvgIcon>
  );
}

export function TruckIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M3 6h11v9H3Z" />
      <path d="M14 9h4l3 3v3h-7Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </StadiumGuideSvgIcon>
  );
}

export function TrashIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </StadiumGuideSvgIcon>
  );
}

export function UtensilsIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M4 3v7" />
      <path d="M8 3v7" />
      <path d="M4 7h4" />
      <path d="M6 10v11" />
      <path d="M16 3c2 1.5 3 3.8 3 7v11" />
      <path d="M16 3v18" />
    </StadiumGuideSvgIcon>
  );
}

export function WarningTriangleIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M12 3 22 20H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </StadiumGuideSvgIcon>
  );
}

export function XIcon(props: StadiumGuideIconProps) {
  return (
    <StadiumGuideSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </StadiumGuideSvgIcon>
  );
}
