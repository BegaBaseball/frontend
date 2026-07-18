import type { ReactNode, SVGProps } from 'react';

type ChatBotConversationIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function ChatBotConversationSvgIcon({
  size = 24,
  children,
  ...props
}: ChatBotConversationIconProps & { children: ReactNode }) {
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

export function ChatBotConversationBrainCircuitIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="M9 3a3 3 0 0 0-3 3v1.2A3.5 3.5 0 0 0 4 13.5V15a3 3 0 0 0 3 3h2" />
      <path d="M15 3a3 3 0 0 1 3 3v1.2a3.5 3.5 0 0 1 2 6.3V15a3 3 0 0 1-3 3h-2" />
      <path d="M9 8h6" />
      <path d="M12 8v8" />
      <path d="M8 16h8" />
      <circle cx="7" cy="8" fill="currentColor" r="1" stroke="none" />
      <circle cx="17" cy="8" fill="currentColor" r="1" stroke="none" />
      <circle cx="12" cy="16" fill="currentColor" r="1" stroke="none" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationCheckIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="m20 6-11 11-5-5" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationChevronDownIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationChevronRightIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationCopyIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <rect height="14" rx="2" width="14" x="8" y="8" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationSendIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationSpinnerIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationSquareIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <rect height="14" rx="2" width="14" x="5" y="5" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationStarIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </ChatBotConversationSvgIcon>
  );
}

export function ChatBotConversationZapIcon(props: ChatBotConversationIconProps) {
  return (
    <ChatBotConversationSvgIcon {...props}>
      <path d="M13 2 3 14h8l-1 8 11-13h-8l1-7Z" />
    </ChatBotConversationSvgIcon>
  );
}
