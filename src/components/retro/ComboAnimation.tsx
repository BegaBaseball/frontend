import { useEffect, useState, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const shake = keyframes`
  0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) rotate(-3deg) scale(1.02); }
  20%, 40%, 60%, 80% { transform: translate(-50%, -50%) rotate(3deg) scale(0.98); }
`;

const explode = keyframes`
  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(5deg); opacity: 1; }
  70% { transform: scale(0.95) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const floatUp = keyframes`
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
  background: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0.3) 0%,
    transparent 70%
  );
`;

const ComboContainer = styled.div<{ $streak: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  animation: ${explode} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

  ${props => props.$streak >= 7 && css`
    animation: ${explode} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
               ${shake} 0.5s 0.6s infinite;
  `}
`;

const ComboNumber = styled.div<{ $streak: number }>`
  font-family: 'Press Start 2P', monospace;
  font-size: ${props => Math.min(120, 60 + props.$streak * 8)}px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 16px;

  ${props => {
    if (props.$streak >= 10) {
      return css`
        background: linear-gradient(
          180deg,
          #ff00ff 0%,
          #ff6600 25%,
          #ffff00 50%,
          #00ff00 75%,
          #00ffff 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 30px rgba(255, 0, 255, 0.8));
      `;
    } else if (props.$streak >= 7) {
      return css`
        color: #ff00ff;
        text-shadow:
          0 0 20px #ff00ff,
          0 0 40px #ff00ff,
          0 0 60px #ff00ff,
          4px 4px 0 #000;
      `;
    } else if (props.$streak >= 5) {
      return css`
        color: #ff6600;
        text-shadow:
          0 0 15px #ff6600,
          0 0 30px #ff6600,
          3px 3px 0 #000;
      `;
    } else if (props.$streak >= 3) {
      return css`
        color: #ffcc00;
        text-shadow:
          0 0 10px #ffcc00,
          0 0 20px #ffcc00,
          2px 2px 0 #000;
      `;
    } else {
      return css`
        color: #00ff00;
        text-shadow:
          0 0 8px #00ff00,
          2px 2px 0 #000;
      `;
    }
  }}
`;

const ComboText = styled.div<{ $streak: number }>`
  font-family: 'Press Start 2P', monospace;
  font-size: ${props => Math.min(32, 16 + props.$streak * 2)}px;
  color: #fff;
  text-shadow: 2px 2px 0 #000, -2px -2px 0 #000;
  margin-bottom: 8px;
`;

const BonusText = styled.div<{ $streak: number }>`
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: ${props => props.$streak >= 5 ? '#ffd700' : '#00ff00'};
  text-shadow: 1px 1px 0 #000;
  margin-top: 8px;
`;

const Particle = styled.div<{ $delay: number; $x: number; $y: number }>`
  position: absolute;
  font-size: 24px;
  animation: ${floatUp} 1.5s ${props => props.$delay}s ease-out forwards;
  left: calc(50% + ${props => props.$x}px);
  top: calc(50% + ${props => props.$y}px);
`;

const PARTICLES = ['⭐', '✨', '💫', '🔥', '💥', '🎯', '🏆'];

interface ComboData {
  streak: number;
  score?: number;
  visible: boolean;
}

interface ComboAnimationProps {
  // Allow external control
  streak?: number;
  score?: number;
  show?: boolean;
  onComplete?: () => void;
}

export default function ComboAnimation({
  streak: externalStreak,
  score: externalScore,
  show: externalShow,
  onComplete,
}: ComboAnimationProps = {}) {
  const [combo, setCombo] = useState<ComboData>({
    streak: 0,
    visible: false,
  });

  // Listen for custom events (for global triggering)
  useEffect(() => {
    const handler = (e: CustomEvent<{ streak: number; score?: number }>) => {
      setCombo({
        streak: e.detail.streak,
        score: e.detail.score,
        visible: true,
      });
    };

    window.addEventListener('combo-animation', handler as EventListener);
    return () => window.removeEventListener('combo-animation', handler as EventListener);
  }, []);

  // Handle external prop control
  useEffect(() => {
    if (externalShow !== undefined && externalStreak !== undefined) {
      setCombo({
        streak: externalStreak,
        score: externalScore,
        visible: externalShow,
      });
    }
  }, [externalShow, externalStreak, externalScore]);

  // Auto-hide after delay
  useEffect(() => {
    if (combo.visible) {
      const timer = setTimeout(() => {
        setCombo(c => ({ ...c, visible: false }));
        onComplete?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [combo.visible, onComplete]);

  const getComboMessage = (streak: number): string => {
    if (streak >= 10) return 'LEGENDARY!';
    if (streak >= 7) return 'ON FIRE!';
    if (streak >= 5) return 'AMAZING!';
    if (streak >= 3) return 'COMBO!';
    return 'NICE!';
  };

  const generateParticles = useCallback((streak: number) => {
    const count = Math.min(12, 4 + streak);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: Math.random() * 0.3,
        emoji: PARTICLES[Math.floor(Math.random() * PARTICLES.length)],
      };
    });
  }, []);

  const particles = useMemo(() => {
    if (!combo.visible || combo.streak < 3) {
      return [];
    }
    return generateParticles(combo.streak);
  }, [combo.visible, combo.streak, generateParticles]);

  return (
    <AnimatePresence>
      {combo.visible && combo.streak > 0 && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ComboContainer $streak={combo.streak}>
            {/* Particles */}
            {particles.map((p, i) => (
              <Particle key={i} $delay={p.delay} $x={p.x} $y={p.y}>
                {p.emoji}
              </Particle>
            ))}

            {/* Main combo display */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
            >
              <ComboNumber $streak={combo.streak}>
                {combo.streak}
              </ComboNumber>
              <ComboText $streak={combo.streak}>
                {combo.streak}연승!
              </ComboText>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <BonusText $streak={combo.streak}>
                  {getComboMessage(combo.streak)}
                  {combo.score && ` +${combo.score.toLocaleString()} PTS`}
                </BonusText>
              </motion.div>
            </motion.div>
          </ComboContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

// Utility function to trigger combo animation globally
export function triggerComboAnimation(streak: number, score?: number) {
  window.dispatchEvent(
    new CustomEvent('combo-animation', {
      detail: { streak, score },
    })
  );
}
