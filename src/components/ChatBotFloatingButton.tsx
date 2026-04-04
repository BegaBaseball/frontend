import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

interface ChatBotFloatingButtonProps {
  ariaLabel?: string;
  className?: string;
  onClick: () => void;
  testId?: string;
}

export default function ChatBotFloatingButton({
  ariaLabel = '챗봇 열기',
  className = '',
  onClick,
  testId,
}: ChatBotFloatingButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`fixed z-[9999] inline-flex items-center justify-center rounded-full
                  h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] bg-green-900 text-white
                  shadow-md hover:bg-green-900 active:bg-green-950
                  transition-colors duration-200 active:scale-95
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300
                  dark:bg-green-800 dark:hover:bg-green-700
                  ${className}`}
      aria-label={ariaLabel}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="relative inline-flex h-full w-full items-center justify-center" aria-hidden="true">
        <img
          src={baseballLogo}
          alt=""
          className="h-[88%] w-[88%] object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
    </button>
  );
}
