import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -100px 0; }
  100% { background-position: 100px 0; }
`;

const energyFlow = keyframes`
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

const ProgressContainer = styled.div<{ $color?: string }>`
  width: 100%;
  height: 16px;
  background: #0a0a1e;
  border: 3px solid #4a4a6a;
  position: relative;
  image-rendering: pixelated;
  overflow: hidden;

  /* Pixel corner cut effect */
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  /* Inner shadow for depth */
  box-shadow:
    inset 2px 2px 4px rgba(0,0,0,0.5),
    inset -1px -1px 2px rgba(255,255,255,0.05);

  /* 빛나는 외곽 효과 */
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid transparent;
    border-radius: 2px;
    pointer-events: none;
  }
`;

const ProgressFill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${props => Math.min(100, Math.max(0, props.$percent))}%;
  position: relative;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  /* 에너지 흐름 그라데이션 배경 */
  background: linear-gradient(
    90deg,
    ${props => props.$color} 0%,
    ${props => {
      // 더 밝은 색상 생성
      const color = props.$color;
      if (color.startsWith('#')) {
        return color + 'ff';
      }
      return color;
    }} 25%,
    ${props => props.$color} 50%,
    ${props => {
      const color = props.$color;
      if (color.startsWith('#')) {
        return color + 'ff';
      }
      return color;
    }} 75%,
    ${props => props.$color} 100%
  );
  background-size: 40px 100%;
  animation: ${energyFlow} 1s linear infinite;

  /* 밝은 하이라이트 오버레이 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.3) 0%,
      transparent 100%
    );
  }

  /* 빛나는 끝 부분 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.6) 50%,
      ${props => props.$color} 100%
    );
    animation: ${pulseGlow} 1s ease-in-out infinite;
    filter: blur(2px);
  }

  /* Pixel segments */
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 4px,
    rgba(0,0,0,0.15) 4px,
    rgba(0,0,0,0.15) 5px
  );

  /* 글로우 효과 */
  box-shadow:
    0 0 10px ${props => props.$color}80,
    inset 0 0 5px rgba(255, 255, 255, 0.2);
`;

const ProgressLabel = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  z-index: 1;
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

export default function PixelProgressBar({
  value,
  max,
  color = '#00ff00',
  showLabel = true,
  label,
  size = 'md',
}: PixelProgressBarProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="relative" style={{ height: sizeMap[size] }}>
      <ProgressContainer style={{ height: sizeMap[size] }}>
        <ProgressFill $percent={percent} $color={color} />
      </ProgressContainer>
      {showLabel && (
        <ProgressLabel>
          {label || `${Math.floor(value).toLocaleString()}/${max.toLocaleString()}`}
        </ProgressLabel>
      )}
    </div>
  );
}
