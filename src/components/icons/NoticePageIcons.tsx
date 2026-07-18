import type { ReactNode, SVGProps } from 'react';

type NoticePageIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function NoticePageSvgIcon({
  size = 24,
  children,
  ...props
}: NoticePageIconProps & { children: ReactNode }) {
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

export function NoticeChevronLeftIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </NoticePageSvgIcon>
  );
}

export function NoticeChevronRightIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </NoticePageSvgIcon>
  );
}

export function NoticeHeartIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </NoticePageSvgIcon>
  );
}

export function NoticeMegaphoneIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="m3 11 18-5v12L3 13v-2Z" />
      <path d="M7 13v5a2 2 0 0 0 2 2h1" />
    </NoticePageSvgIcon>
  );
}

export function NoticeMessageSquareIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </NoticePageSvgIcon>
  );
}

export function NoticePenSquareIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4Z" />
    </NoticePageSvgIcon>
  );
}

export function NoticeRefreshIcon(props: NoticePageIconProps) {
  return (
    <NoticePageSvgIcon {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </NoticePageSvgIcon>
  );
}
