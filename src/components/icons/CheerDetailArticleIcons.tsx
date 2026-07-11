import type { ReactNode, SVGProps } from 'react';

type CheerDetailArticleIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CheerDetailArticleSvgIcon({
  size = 24,
  children,
  ...props
}: CheerDetailArticleIconProps & { children: ReactNode }) {
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

export function CheerDetailArrowLeftIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailClockIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailEditIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4Z" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailExternalLinkIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailEyeIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailFlagIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1 4 1 4H5" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailFlameIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M8.5 14.5a3.5 3.5 0 1 0 7 0c0-1.9-1-3.1-2-4.2-.8-.9-1.5-1.8-1.5-3.3-2 1.2-4 3.6-4 7.5Z" />
      <path d="M12 22a8 8 0 0 0 7-12c-1.5-2.5-4-4-4-8-3.5 2-7 5.6-7 12a8 8 0 0 0 4 8Z" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailMegaphoneIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="m3 11 14-6v14L3 13v-2Z" />
      <path d="M7 14v5a2 2 0 0 0 2 2h1" />
      <path d="M17 9h2a3 3 0 0 1 0 6h-2" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailMoreVerticalIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <circle cx="12" cy="5" fill="currentColor" r="1.5" stroke="none" />
      <circle cx="12" cy="12" fill="currentColor" r="1.5" stroke="none" />
      <circle cx="12" cy="19" fill="currentColor" r="1.5" stroke="none" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailQuoteIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M9 7H5a2 2 0 0 0-2 2v5h5v-4H5V9h4V7Z" />
      <path d="M21 7h-4a2 2 0 0 0-2 2v5h5v-4h-3V9h4V7Z" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailRepeatIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </CheerDetailArticleSvgIcon>
  );
}

export function CheerDetailTrashIcon(props: CheerDetailArticleIconProps) {
  return (
    <CheerDetailArticleSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </CheerDetailArticleSvgIcon>
  );
}
