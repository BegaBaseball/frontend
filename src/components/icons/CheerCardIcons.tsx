import type { ReactNode, SVGProps } from 'react';

type CheerCardIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CheerCardSvgIcon({
  size = 24,
  children,
  ...props
}: CheerCardIconProps & { children: ReactNode }) {
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

export function CheerCardBookmarkIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardEditIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardHeartIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardMessageCircleIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardMessageSquareIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardMoreHorizontalIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="1.5" stroke="none" />
      <circle cx="19" cy="12" fill="currentColor" r="1.5" stroke="none" />
      <circle cx="5" cy="12" fill="currentColor" r="1.5" stroke="none" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardQuoteIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M3 21c3 0 6-2 6-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
      <path d="M15 21c3 0 6-2 6-6V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardPenSquareIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4Z" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardRepeatIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="m17 1 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardRotateCcwIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardTrashIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </CheerCardSvgIcon>
  );
}

export function CheerCardUndoIcon(props: CheerCardIconProps) {
  return (
    <CheerCardSvgIcon {...props}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </CheerCardSvgIcon>
  );
}
