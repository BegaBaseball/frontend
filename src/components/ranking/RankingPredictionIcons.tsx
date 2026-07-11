import type { ReactNode, SVGProps } from 'react';

type RankingPredictionIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function RankingPredictionSvgIcon({
  size = 24,
  children,
  ...props
}: RankingPredictionIconProps & { children: ReactNode }) {
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

export function RankingLogInIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </RankingPredictionSvgIcon>
  );
}

export function RankingRotateCcwIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <path d="M3 3v6h6" />
      <path d="M3.5 13a8.5 8.5 0 1 0 2.5-6" />
    </RankingPredictionSvgIcon>
  );
}

export function RankingGripVerticalIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <circle cx="9" cy="5" fill="currentColor" r="1" stroke="none" />
      <circle cx="15" cy="5" fill="currentColor" r="1" stroke="none" />
      <circle cx="9" cy="12" fill="currentColor" r="1" stroke="none" />
      <circle cx="15" cy="12" fill="currentColor" r="1" stroke="none" />
      <circle cx="9" cy="19" fill="currentColor" r="1" stroke="none" />
      <circle cx="15" cy="19" fill="currentColor" r="1" stroke="none" />
    </RankingPredictionSvgIcon>
  );
}

export function RankingChevronUpIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <path d="m18 15-6-6-6 6" />
    </RankingPredictionSvgIcon>
  );
}

export function RankingChevronDownIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </RankingPredictionSvgIcon>
  );
}

export function RankingCloseIcon(props: RankingPredictionIconProps) {
  return (
    <RankingPredictionSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </RankingPredictionSvgIcon>
  );
}
