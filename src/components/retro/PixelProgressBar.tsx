const pixelProgressBarStyles = `
  @keyframes retroPixelProgressEnergyFlow {
    0% { background-position: 0 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes retroPixelProgressPulseGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

interface PixelProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: '12px',
  md: '16px',
  lg: '24px',
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export default function PixelProgressBar({
  value,
  max,
  color = '#00ff00',
  showLabel = true,
  label,
  size = 'md',
}: PixelProgressBarProps) {
  const percent = clampPercent(max > 0 ? (value / max) * 100 : 0);
  const height = sizeMap[size];

  return (
    <div className="relative" style={{ height }}>
      <style>{pixelProgressBarStyles}</style>
      <div
        style={{
          width: '100%',
          height,
          background: '#0a0a1e',
          border: '3px solid #4a4a6a',
          position: 'relative',
          overflow: 'hidden',
          clipPath: 'polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px))',
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05)',
          imageRendering: 'pixelated',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            position: 'relative',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 4px,
                rgba(0,0,0,0.15) 4px,
                rgba(0,0,0,0.15) 5px
              ),
              linear-gradient(
                90deg,
                ${color} 0%,
                rgba(255,255,255,0.4) 25%,
                ${color} 50%,
                rgba(255,255,255,0.4) 75%,
                ${color} 100%
              )
            `,
            backgroundSize: '5px 100%, 40px 100%',
            animation: 'retroPixelProgressEnergyFlow 1s linear infinite',
            boxShadow: `0 0 10px ${color}80, inset 0 0 5px rgba(255, 255, 255, 0.2)`,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '0 0 auto 0',
              height: '40%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '20px',
              height: '100%',
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, ${color} 100%)`,
              animation: 'retroPixelProgressPulseGlow 1s ease-in-out infinite',
              filter: 'blur(2px)',
            }}
          />
        </div>
      </div>

      {showLabel && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: '#fff',
            textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {label || `${Math.floor(value).toLocaleString()}/${max.toLocaleString()}`}
        </div>
      )}
    </div>
  );
}
