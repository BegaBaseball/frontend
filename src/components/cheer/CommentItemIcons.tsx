import type { ReactNode, SVGProps } from 'react';

type CommentItemIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CommentItemSvgIcon({
  size = 24,
  children,
  ...props
}: CommentItemIconProps & { children: ReactNode }) {
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

export function CommentCornerDownRightIcon(props: CommentItemIconProps) {
  return (
    <CommentItemSvgIcon {...props}>
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
      <path d="m15 10 5 5-5 5" />
    </CommentItemSvgIcon>
  );
}

export function CommentHeartIcon(props: CommentItemIconProps) {
  return (
    <CommentItemSvgIcon {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </CommentItemSvgIcon>
  );
}

export function CommentSendIcon(props: CommentItemIconProps) {
  return (
    <CommentItemSvgIcon {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </CommentItemSvgIcon>
  );
}

export function CommentTrashIcon(props: CommentItemIconProps) {
  return (
    <CommentItemSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </CommentItemSvgIcon>
  );
}
