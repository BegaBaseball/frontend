import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function FirstLoadIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function FirstLoadArrowRightIcon(props: IconProps) {
  return (
    <FirstLoadIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </FirstLoadIcon>
  );
}

export function FirstLoadSunIcon(props: IconProps) {
  return (
    <FirstLoadIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </FirstLoadIcon>
  );
}

export function FirstLoadMoonIcon(props: IconProps) {
  return (
    <FirstLoadIcon {...props}>
      <path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8a7 7 0 1 0 10.7 10.7Z" />
    </FirstLoadIcon>
  );
}

export function FirstLoadImageOffIcon(props: IconProps) {
  return (
    <FirstLoadIcon {...props}>
      <path d="m2 2 20 20" />
      <path d="M10.4 10.4 8 13.5l-1.5-2L3 16h13" />
      <path d="M10.5 5H19a2 2 0 0 1 2 2v8.5" />
      <path d="M5 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10.5" />
      <circle cx="16" cy="9" r="1.5" />
    </FirstLoadIcon>
  );
}
