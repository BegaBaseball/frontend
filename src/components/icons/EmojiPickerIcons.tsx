import type { ReactNode, SVGProps } from 'react';

type EmojiPickerIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function EmojiPickerSvgIcon({
  size = 24,
  children,
  ...props
}: EmojiPickerIconProps & { children: ReactNode }) {
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

export function EmojiPickerSearchIcon(props: EmojiPickerIconProps) {
  return (
    <EmojiPickerSvgIcon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </EmojiPickerSvgIcon>
  );
}
