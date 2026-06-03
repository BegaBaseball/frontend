import {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  PropsWithChildren,
  useEffect,
} from 'react';

const STYLE_ID = 'retro-theme-global-styles';
const RETRO_FONT_LINKS = [
  {
    id: 'retro-font-preconnect-googleapis',
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    id: 'retro-font-preconnect-gstatic',
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    id: 'retro-font-press-start',
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  },
  {
    id: 'retro-font-galmuri',
    rel: 'stylesheet',
    href: 'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css',
  },
] as const;
const textOutlineShadow =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const retroThemeStyles = `
  @keyframes retroThemeFlicker {
    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
      opacity: 1;
      text-shadow: 0 0 4px #fff, 0 0 11px #fff, 0 0 19px #fff, 0 0 40px #0ff, 0 0 80px #0ff;
    }
    20%, 24%, 55% {
      opacity: 0.8;
      text-shadow: none;
    }
  }

  @keyframes retroThemeGlowPulse {
    0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
    50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
  }

  @keyframes retroThemeScorePop {
    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
    50% { transform: scale(1.3) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  @keyframes retroThemeComboShake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }

  @keyframes retroThemePixelBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes retroThemeGlitch {
    0% { transform: translate(0); filter: none; }
    20% { transform: translate(-2px, 2px); filter: hue-rotate(90deg); }
    40% { transform: translate(2px, -2px); filter: hue-rotate(-90deg); }
    60% { transform: translate(-1px, 1px); filter: saturate(2); }
    80% { transform: translate(1px, -1px); filter: contrast(1.2); }
    100% { transform: translate(0); filter: none; }
  }

  @keyframes retroThemeEnergyFlow {
    0% { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }

  @keyframes retroThemeFloatItem {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-6px) rotate(-2deg); }
    75% { transform: translateY(-6px) rotate(2deg); }
  }

  @keyframes retroThemeCrownWiggle {
    0%, 100% { transform: translateY(0) rotate(-10deg); }
    50% { transform: translateY(-5px) rotate(10deg); }
  }

  @keyframes retroThemeDotMatrixBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  @keyframes retroThemeGoldFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const ensureRetroThemeStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }

  const styleTag = document.createElement('style');
  styleTag.id = STYLE_ID;
  styleTag.textContent = retroThemeStyles;
  document.head.appendChild(styleTag);
};

export const ensureRetroFontsLoaded = () => {
  if (typeof document === 'undefined') {
    return;
  }

  RETRO_FONT_LINKS.forEach((entry) => {
    if (document.getElementById(entry.id)) {
      return;
    }

    const link = document.createElement('link');
    link.id = entry.id;
    link.rel = entry.rel;
    link.href = entry.href;
    if ('crossOrigin' in entry) {
      link.crossOrigin = entry.crossOrigin;
    }
    document.head.appendChild(link);
  });
};

const useRetroThemeStyles = () => {
  useEffect(() => {
    ensureRetroFontsLoaded();
    ensureRetroThemeStyles();
  }, []);
};

export const fonts = {
  retroDisplay: "'Press Start 2P', monospace",
  retroText: "'Galmuri11', 'Galmuri9', sans-serif",
  retroSystem: "'Galmuri9', 'Pretendard', sans-serif",
};

export const crispText: CSSProperties = {
  WebkitFontSmoothing: 'none',
  MozOsxFontSmoothing: 'grayscale',
  imageRendering: 'pixelated',
};

export const koreanTextStyle: CSSProperties = {
  ...crispText,
  fontFamily: fonts.retroText,
  letterSpacing: '-0.5px',
  lineHeight: 1.6,
};

export const textOutline: CSSProperties = {
  textShadow: textOutlineShadow,
};

export const crtScanlines: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
};

export const pixelBorder: CSSProperties = {
  border: '4px solid #4a4a6a',
  boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.1), inset -2px -2px 0 rgba(0,0,0,0.3), 4px 4px 0 rgba(0,0,0,0.5)',
  imageRendering: 'pixelated',
};

type BaseDivProps = HTMLAttributes<HTMLDivElement>;
type BaseSpanProps = HTMLAttributes<HTMLSpanElement>;

export function RetroContainer({ children, style, ...props }: PropsWithChildren<BaseDivProps>) {
  useRetroThemeStyles();

  return (
    <div
      {...props}
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
        borderRadius: '8px',
        overflow: 'hidden',
        ...crtScanlines,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function FlickerText({
  $active,
  style,
  ...props
}: PropsWithChildren<BaseSpanProps & { $active?: boolean }>) {
  useRetroThemeStyles();

  return (
    <span
      {...props}
      style={{
        fontFamily: fonts.retroDisplay,
        ...crispText,
        animation: $active ? 'retroThemeFlicker 1.5s infinite alternate' : undefined,
        ...style,
      }}
    />
  );
}

export function PixelNumber({
  $color,
  style,
  ...props
}: PropsWithChildren<BaseSpanProps & { $color?: string }>) {
  return (
    <span
      {...props}
      style={{
        fontFamily: fonts.retroDisplay,
        fontSize: '24px',
        color: $color || '#00ff00',
        textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
        letterSpacing: '2px',
        ...crispText,
        ...style,
      }}
    />
  );
}

export function RetroButton({
  $variant = 'primary',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { $variant?: 'primary' | 'secondary' | 'danger' }) {
  const variantStyle =
    $variant === 'danger'
      ? {
          background: 'linear-gradient(180deg, #ff4444 0%, #cc0000 100%)',
          color: '#fff',
          boxShadow: '0 4px 0 #880000, inset 0 1px 0 rgba(255,255,255,0.3)',
        }
      : $variant === 'secondary'
        ? {
            background: 'linear-gradient(180deg, #4a4a6a 0%, #2a2a4a 100%)',
            color: '#fff',
            boxShadow: '0 4px 0 #1a1a2a, inset 0 1px 0 rgba(255,255,255,0.2)',
          }
        : {
            background: 'linear-gradient(180deg, #00ccff 0%, #0088cc 100%)',
            color: '#fff',
            boxShadow: '0 4px 0 #005588, inset 0 1px 0 rgba(255,255,255,0.3)',
          };

  return (
    <button
      {...props}
      style={{
        fontFamily: fonts.retroText,
        fontSize: '11px',
        padding: '12px 20px',
        border: 'none',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        textTransform: 'uppercase',
        transition: 'all 0.1s ease',
        opacity: props.disabled ? 0.5 : 1,
        ...crispText,
        ...textOutline,
        ...variantStyle,
        ...style,
      }}
    />
  );
}

export function RetroCard({
  $glow,
  $glowColor,
  style,
  ...props
}: PropsWithChildren<BaseDivProps & { $glow?: boolean; $glowColor?: string }>) {
  useRetroThemeStyles();

  return (
    <div
      {...props}
      style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1e 100%)',
        padding: '16px',
        ...pixelBorder,
        color: $glow ? ($glowColor || '#00ffff') : undefined,
        borderColor: $glow ? ($glowColor || '#00ffff') : undefined,
        animation: $glow ? 'retroThemeGlowPulse 2s infinite' : undefined,
        ...style,
      }}
    />
  );
}

export function RankBadge({
  $rank,
  style,
  ...props
}: PropsWithChildren<BaseDivProps & { $rank: number }>) {
  useRetroThemeStyles();

  const badgeStyle: CSSProperties =
    $rank === 1
      ? {
          background: 'linear-gradient(90deg, #ffd700 0%, #ffd700 40%, #fff 50%, #ffd700 60%, #ffd700 100%)',
          backgroundSize: '200px 100%',
          animation: 'retroThemeGoldFlow 2s linear infinite',
          color: '#000',
          border: '2px solid #ffaa00',
          textShadow: '0 0 4px rgba(255,215,0,0.5)',
        }
      : $rank === 2
        ? {
            background: 'linear-gradient(180deg, #e0e0e0 0%, #a0a0a0 100%)',
            color: '#333',
            border: '2px solid #808080',
          }
        : $rank === 3
          ? {
              background: 'linear-gradient(180deg, #cd9a53 0%, #8b6914 100%)',
              color: '#fff',
              border: '2px solid #8b4513',
            }
          : {
              background: 'linear-gradient(180deg, #3a3a5a 0%, #2a2a4a 100%)',
              color: '#8a8aaa',
              border: '2px solid #4a4a6a',
            };

  return (
    <div
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '48px',
        height: '32px',
        fontFamily: fonts.retroDisplay,
        fontSize: '11px',
        padding: '0 8px',
        ...crispText,
        ...badgeStyle,
        ...style,
      }}
    />
  );
}

export function ScoreDisplay({
  $animate,
  style,
  ...props
}: PropsWithChildren<BaseDivProps & { $animate?: boolean }>) {
  useRetroThemeStyles();

  return (
    <div
      {...props}
      style={{
        fontFamily: fonts.retroDisplay,
        fontSize: '16px',
        color: '#00ff00',
        textShadow: '0 0 4px #00ff00, 0 0 8px #00ff00',
        ...crispText,
        animation: $animate ? 'retroThemeScorePop 0.5s ease-out' : undefined,
        ...style,
      }}
    />
  );
}

export function StreakCounter({
  $streak,
  style,
  ...props
}: PropsWithChildren<BaseDivProps & { $streak: number }>) {
  useRetroThemeStyles();

  const streakStyle: CSSProperties =
    $streak >= 7
      ? {
          background: 'linear-gradient(180deg, #ff00ff 0%, #cc00cc 100%)',
          color: '#fff',
          animation: 'retroThemeComboShake 0.5s infinite',
          textShadow: '0 0 10px #ff00ff',
        }
      : $streak >= 5
        ? {
            background: 'linear-gradient(180deg, #ff6600 0%, #cc4400 100%)',
            color: '#fff',
            textShadow: '0 0 6px #ff6600',
          }
        : $streak >= 3
          ? {
              background: 'linear-gradient(180deg, #ffcc00 0%, #cc9900 100%)',
              color: '#000',
            }
          : {
              background: 'linear-gradient(180deg, #4a4a6a 0%, #2a2a4a 100%)',
              color: '#aaa',
            };

  return (
    <div
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: fonts.retroText,
        fontSize: '11px',
        padding: '6px 12px',
        borderRadius: '4px',
        ...crispText,
        ...textOutline,
        ...streakStyle,
        ...style,
      }}
    />
  );
}

export function RetroDivider({ style, ...props }: BaseDivProps) {
  return (
    <div
      {...props}
      style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, #4a4a6a 10%, #6a6a8a 50%, #4a4a6a 90%, transparent 100%)',
        margin: '16px 0',
        ...style,
      }}
    />
  );
}

export function PixelCrown({ style, ...props }: PropsWithChildren<BaseSpanProps>) {
  useRetroThemeStyles();

  return (
    <span
      {...props}
      style={{
        display: 'inline-block',
        fontSize: '16px',
        animation: 'retroThemePixelBounce 1s ease-in-out infinite',
        filter: 'drop-shadow(0 2px 4px rgba(255,215,0,0.5))',
        ...style,
      }}
    />
  );
}

export const ChampionRowStyle: CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 215, 0, 0.15) 100%)',
  backgroundSize: '200% 200%',
  border: '3px solid #ffd700',
  boxShadow: '0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 15px rgba(255, 215, 0, 0.15)',
  position: 'relative',
};

export function GlitchWrapper({
  $active,
  style,
  ...props
}: PropsWithChildren<BaseDivProps & { $active?: boolean }>) {
  useRetroThemeStyles();

  return (
    <div
      {...props}
      style={{
        animation: $active ? 'retroThemeGlitch 0.3s ease-out' : undefined,
        ...style,
      }}
    />
  );
}

export function DotMatrixText({ children, style, ...props }: PropsWithChildren<BaseDivProps>) {
  useRetroThemeStyles();

  return (
    <div
      {...props}
      style={{
        position: 'relative',
        padding: '8px 16px',
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px), repeating-linear-gradient(90deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px), linear-gradient(180deg, #1a0a2a 0%, #0a0a1a 100%)',
        border: '2px solid #ff00ff',
        borderRadius: '4px',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: fonts.retroText,
          animation: 'retroThemeDotMatrixBlink 2s infinite',
          ...crispText,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function AnimatedCrown({ style, ...props }: PropsWithChildren<BaseSpanProps>) {
  useRetroThemeStyles();

  return (
    <span
      {...props}
      style={{
        display: 'inline-block',
        fontSize: '20px',
        animation: 'retroThemeCrownWiggle 1s infinite ease-in-out',
        filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))',
        marginRight: '4px',
        ...style,
      }}
    />
  );
}

export function BaseballIcon({ style, ...props }: PropsWithChildren<BaseSpanProps>) {
  return (
    <span
      {...props}
      style={{
        display: 'inline-block',
        fontSize: '16px',
        filter: 'drop-shadow(0 0 4px rgba(255, 102, 0, 0.5))',
        ...style,
      }}
    />
  );
}

export function PixelEmptyState({ style, ...props }: PropsWithChildren<BaseDivProps>) {
  return (
    <div
      {...props}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        ...style,
      }}
    />
  );
}

export const energyBarStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #ff00ff 0%, #ff66ff 50%, #ff00ff 100%)',
  backgroundSize: '40px 100%',
  animation: 'retroThemeEnergyFlow 1s linear infinite',
};

export const floatingItemStyle: CSSProperties = {
  animation: 'retroThemeFloatItem 2s ease-in-out infinite',
};

export const animations = {
  flicker: 'retroThemeFlicker 1.5s infinite alternate',
  goldShine: 'retroThemeGoldFlow 2s linear infinite',
  glowPulse: 'retroThemeGlowPulse 2s infinite',
  scorePop: 'retroThemeScorePop 0.5s ease-out',
  comboShake: 'retroThemeComboShake 0.5s infinite',
  pixelBounce: 'retroThemePixelBounce 1s ease-in-out infinite',
  goldFlow: 'retroThemeGoldFlow 3s ease infinite',
  glitch: 'retroThemeGlitch 0.3s ease-out',
  energyFlow: 'retroThemeEnergyFlow 1s linear infinite',
  floatItem: 'retroThemeFloatItem 2s ease-in-out infinite',
  crownWiggle: 'retroThemeCrownWiggle 1s infinite ease-in-out',
  dotMatrixBlink: 'retroThemeDotMatrixBlink 2s infinite',
};
