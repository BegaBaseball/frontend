import type { ReactNode, SVGProps } from 'react';

type ChatBotSessionIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function ChatBotSessionSvgIcon({
  size = 24,
  children,
  ...props
}: ChatBotSessionIconProps & { children: ReactNode }) {
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

export function ChatBotSessionCloseIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionHistoryIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionMessageSquareTextIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionPlusIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionSpinnerIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionStarIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </ChatBotSessionSvgIcon>
  );
}

export function ChatBotSessionTrashIcon(props: ChatBotSessionIconProps) {
  return (
    <ChatBotSessionSvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </ChatBotSessionSvgIcon>
  );
}
