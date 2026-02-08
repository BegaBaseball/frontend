import styled, { css, keyframes } from 'styled-components';

// ============================================
// FONT FAMILIES
// ============================================
// 타이포그래피 위계:
// - retroDisplay: 제목, 순위, 숫자 (영문 중심, 픽셀 느낌)
// - retroText: 설명, 공지, 한글 텍스트 (가독성 중시)
// - retroSystem: 아주 작은 시스템 메시지
export const fonts = {
  retroDisplay: "'Press Start 2P', monospace",
  retroText: "'Galmuri11', 'Galmuri9', sans-serif",
  retroSystem: "'Galmuri9', 'Pretendard', sans-serif",
};

// ============================================
// CRISP TEXT (안티앨리어싱 제거)
// ============================================
// 픽셀 폰트가 흐릿하게 번지는 것을 방지
export const crispText = css`
  font-smooth: never;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
`;

// 한글 텍스트 최적화 스타일
export const koreanTextStyle = css`
  font-family: ${fonts.retroText};
  letter-spacing: -0.5px;
  line-height: 1.6;
  ${crispText}
`;

// 텍스트 외곽선 (가독성 향상)
export const textOutline = css`
  text-shadow:
    -1px -1px 0 #000,
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000;
`;

// ============================================
// CRT SCANLINE EFFECT
// ============================================
export const crtScanlines = css`
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15) 0px,
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    z-index: 10;
  }
`;

// ============================================
// PIXEL BORDER MIXIN
// ============================================
export const pixelBorder = css`
  border: 4px solid #4a4a6a;
  box-shadow:
    inset 2px 2px 0 rgba(255,255,255,0.1),
    inset -2px -2px 0 rgba(0,0,0,0.3),
    4px 4px 0 rgba(0,0,0,0.5);
  image-rendering: pixelated;
`;

// ============================================
// KEYFRAME ANIMATIONS
// ============================================

// 1위 전용 황금빛 흐름 애니메이션
const goldFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// 글리치 효과 (탭 전환/갱신 시)
const glitch = keyframes`
  0% { transform: translate(0); filter: none; }
  20% { transform: translate(-2px, 2px); filter: hue-rotate(90deg); }
  40% { transform: translate(2px, -2px); filter: hue-rotate(-90deg); }
  60% { transform: translate(-1px, 1px); filter: saturate(2); }
  80% { transform: translate(1px, -1px); filter: contrast(1.2); }
  100% { transform: translate(0); filter: none; }
`;

// 에너지 흐름 애니메이션 (프로그레스 바)
const energyFlow = keyframes`
  0% { background-position: 0% 0%; }
  100% { background-position: 40px 0%; }
`;

// 아이템 플로팅 애니메이션
const floatItem = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-6px) rotate(-2deg); }
  75% { transform: translateY(-6px) rotate(2deg); }
`;

// 왕관 흔들림 애니메이션
const crownWiggle = keyframes`
  0%, 100% { transform: translateY(0) rotate(-10deg); }
  50% { transform: translateY(-5px) rotate(10deg); }
`;

// 도트 매트릭스 깜빡임
const dotMatrixBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
`;

// Flickering neon text effect
const flicker = keyframes`
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    opacity: 1;
    text-shadow:
      0 0 4px #fff,
      0 0 11px #fff,
      0 0 19px #fff,
      0 0 40px #0ff,
      0 0 80px #0ff;
  }
  20%, 24%, 55% {
    opacity: 0.8;
    text-shadow: none;
  }
`;

// Gold shimmer for #1 rank
const goldShine = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

// Pulsing glow effect
const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
  }
`;

// Score pop-in animation
const scorePop = keyframes`
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

// Combo text shake
const comboShake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
`;

// Pixel bounce
const pixelBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

// Main container with CRT effect
export const RetroContainer = styled.div`
  position: relative;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  border-radius: 8px;
  overflow: hidden;
  ${crtScanlines}
`;

// Flickering text component
export const FlickerText = styled.span<{ $active?: boolean }>`
  font-family: ${fonts.retroDisplay};
  ${crispText}
  animation: ${props => props.$active ? css`${flicker} 1.5s infinite alternate` : 'none'};
`;

// Pixel-style number display
export const PixelNumber = styled.span<{ $color?: string }>`
  font-family: ${fonts.retroDisplay};
  font-size: 24px;
  color: ${props => props.$color || '#00ff00'};
  text-shadow: 2px 2px 0 rgba(0,0,0,0.8);
  letter-spacing: 2px;
  ${crispText}
`;

// Retro button with pixel styling
export const RetroButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  font-family: ${fonts.retroText};
  font-size: 11px;
  padding: 12px 20px;
  border: none;
  cursor: pointer;
  position: relative;
  text-transform: uppercase;
  transition: all 0.1s ease;
  ${crispText}
  ${textOutline}

  ${props => {
    switch (props.$variant) {
      case 'danger':
        return css`
          background: linear-gradient(180deg, #ff4444 0%, #cc0000 100%);
          color: #fff;
          box-shadow:
            0 4px 0 #880000,
            inset 0 1px 0 rgba(255,255,255,0.3);
        `;
      case 'secondary':
        return css`
          background: linear-gradient(180deg, #4a4a6a 0%, #2a2a4a 100%);
          color: #fff;
          box-shadow:
            0 4px 0 #1a1a2a,
            inset 0 1px 0 rgba(255,255,255,0.2);
        `;
      default:
        return css`
          background: linear-gradient(180deg, #00ccff 0%, #0088cc 100%);
          color: #fff;
          box-shadow:
            0 4px 0 #005588,
            inset 0 1px 0 rgba(255,255,255,0.3);
        `;
    }
  }}

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 ${props =>
      props.$variant === 'danger' ? '#880000' :
      props.$variant === 'secondary' ? '#1a1a2a' : '#005588'
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// Card with pixel border
export const RetroCard = styled.div<{ $glow?: boolean; $glowColor?: string }>`
  background: linear-gradient(180deg, #1a1a2e 0%, #0a0a1e 100%);
  ${pixelBorder}
  padding: 16px;

  ${props => props.$glow && css`
    animation: ${glowPulse} 2s infinite;
    color: ${props.$glowColor || '#00ffff'};
    border-color: ${props.$glowColor || '#00ffff'};
  `}
`;

// Rank badge with tier-based styling
export const RankBadge = styled.div<{ $rank: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 32px;
  font-family: ${fonts.retroDisplay};
  font-size: 11px;
  padding: 0 8px;
  ${crispText}

  ${props => {
    if (props.$rank === 1) {
      return css`
        background: linear-gradient(
          90deg,
          #ffd700 0%,
          #ffd700 40%,
          #fff 50%,
          #ffd700 60%,
          #ffd700 100%
        );
        background-size: 200px 100%;
        animation: ${goldShine} 2s infinite linear;
        color: #000;
        border: 2px solid #ffaa00;
        text-shadow: 0 0 4px rgba(255,215,0,0.5);
      `;
    } else if (props.$rank === 2) {
      return css`
        background: linear-gradient(180deg, #e0e0e0 0%, #a0a0a0 100%);
        color: #333;
        border: 2px solid #808080;
      `;
    } else if (props.$rank === 3) {
      return css`
        background: linear-gradient(180deg, #cd9a53 0%, #8b6914 100%);
        color: #fff;
        border: 2px solid #8b4513;
      `;
    } else {
      return css`
        background: linear-gradient(180deg, #3a3a5a 0%, #2a2a4a 100%);
        color: #8a8aaa;
        border: 2px solid #4a4a6a;
      `;
    }
  }}
`;

// Score display with animation
export const ScoreDisplay = styled.div<{ $animate?: boolean }>`
  font-family: ${fonts.retroDisplay};
  font-size: 16px;
  color: #00ff00;
  text-shadow:
    0 0 4px #00ff00,
    0 0 8px #00ff00;
  ${crispText}

  ${props => props.$animate && css`
    animation: ${scorePop} 0.5s ease-out;
  `}
`;

// Streak counter with fire effect
export const StreakCounter = styled.div<{ $streak: number }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: ${fonts.retroText};
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 4px;
  ${crispText}
  ${textOutline}

  ${props => {
    if (props.$streak >= 7) {
      return css`
        background: linear-gradient(180deg, #ff00ff 0%, #cc00cc 100%);
        color: #fff;
        animation: ${comboShake} 0.5s infinite;
        text-shadow: 0 0 10px #ff00ff;
      `;
    } else if (props.$streak >= 5) {
      return css`
        background: linear-gradient(180deg, #ff6600 0%, #cc4400 100%);
        color: #fff;
        text-shadow: 0 0 6px #ff6600;
      `;
    } else if (props.$streak >= 3) {
      return css`
        background: linear-gradient(180deg, #ffcc00 0%, #cc9900 100%);
        color: #000;
      `;
    } else {
      return css`
        background: linear-gradient(180deg, #4a4a6a 0%, #2a2a4a 100%);
        color: #aaa;
      `;
    }
  }}
`;

// Divider with retro styling
export const RetroDivider = styled.div`
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    #4a4a6a 10%,
    #6a6a8a 50%,
    #4a4a6a 90%,
    transparent 100%
  );
  margin: 16px 0;
`;

// Pixel art crown for #1
export const PixelCrown = styled.span`
  display: inline-block;
  font-size: 16px;
  animation: ${pixelBounce} 1s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(255,215,0,0.5));
`;

// ============================================
// CHAMPION ROW STYLE (1위 전용)
// ============================================
export const ChampionRowStyle = css`
  background: linear-gradient(
    90deg,
    rgba(255, 215, 0, 0.15) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 215, 0, 0.15) 100%
  );
  background-size: 200% 200%;
  animation: ${goldFlow} 3s ease infinite;
  border: 3px solid #ffd700 !important;
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.4),
    inset 0 0 15px rgba(255, 215, 0, 0.15);
  position: relative;
`;

// ============================================
// GLITCH WRAPPER (탭 전환 시)
// ============================================
export const GlitchWrapper = styled.div<{ $active?: boolean }>`
  ${props => props.$active && css`
    animation: ${glitch} 0.3s ease-out;
  `}
`;

// ============================================
// DOT MATRIX SUBTITLE (전광판 느낌)
// ============================================
export const DotMatrixText = styled.div`
  position: relative;
  padding: 8px 16px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.3) 2px,
      rgba(0, 0, 0, 0.3) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.3) 2px,
      rgba(0, 0, 0, 0.3) 4px
    ),
    linear-gradient(180deg, #1a0a2a 0%, #0a0a1a 100%);
  border: 2px solid #ff00ff;
  border-radius: 4px;

  span {
    font-family: ${fonts.retroText};
    animation: ${dotMatrixBlink} 2s infinite;
    ${crispText}
  }
`;

// ============================================
// ANIMATED CROWN (1위 왕관)
// ============================================
export const AnimatedCrown = styled.span`
  display: inline-block;
  font-size: 20px;
  animation: ${crownWiggle} 1s infinite ease-in-out;
  filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
  margin-right: 4px;
`;

// ============================================
// BASEBALL ICONS
// ============================================
export const BaseballIcon = styled.span`
  display: inline-block;
  font-size: 16px;
  filter: drop-shadow(0 0 4px rgba(255, 102, 0, 0.5));
`;

// ============================================
// PIXEL EMPTY STATE (8비트 빈 상태)
// ============================================
export const PixelEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .icon {
    font-size: 64px;
    margin-bottom: 24px;
    animation: ${pixelBounce} 2s ease-in-out infinite;
    image-rendering: pixelated;
  }

  .title {
    font-family: ${fonts.retroDisplay};
    font-size: 14px;
    color: #00ffff;
    margin-bottom: 12px;
    ${crispText}
  }

  .message {
    font-family: ${fonts.retroText};
    font-size: 12px;
    color: #8a8aaa;
    line-height: 1.8;
    letter-spacing: -0.3px;
    ${textOutline}
  }
`;

// ============================================
// ENERGY PROGRESS BAR STYLE
// ============================================
export const energyBarStyle = css`
  background: linear-gradient(
    90deg,
    #ff00ff 0%,
    #ff66ff 50%,
    #ff00ff 100%
  );
  background-size: 40px 100%;
  animation: ${energyFlow} 1s linear infinite;
`;

// ============================================
// FLOATING ITEM STYLE
// ============================================
export const floatingItemStyle = css`
  animation: ${floatItem} 2s ease-in-out infinite;
`;

// Export animations for use elsewhere
export const animations = {
  flicker,
  goldShine,
  glowPulse,
  scorePop,
  comboShake,
  pixelBounce,
  goldFlow,
  glitch,
  energyFlow,
  floatItem,
  crownWiggle,
  dotMatrixBlink,
};
