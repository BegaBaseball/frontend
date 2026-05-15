import { type CSSProperties, useCallback, useEffect, useMemo } from 'react';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { ensureRetroFontsLoaded } from './RetroTheme';

const comboAnimationCss = `
  @keyframes combo-fadeInOverlay {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes combo-shake {
    0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) rotate(-3deg) scale(1.02); }
    20%, 40%, 60%, 80% { transform: translate(-50%, -50%) rotate(3deg) scale(0.98); }
  }

  @keyframes combo-explode {
    0% { transform: scale(0) rotate(-15deg); opacity: 0; }
    50% { transform: scale(1.3) rotate(5deg); opacity: 1; }
    70% { transform: scale(0.95) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  @keyframes combo-floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
  }

  @keyframes combo-reveal {
    0% { transform: scale(0); }
    70% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  @keyframes combo-bonusReveal {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  pointerEvents: 'none',
  background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.3) 0%, transparent 70%)',
  animation: 'combo-fadeInOverlay 0.3s ease-out',
};

const comboContentStyle: CSSProperties = {
  animation: 'combo-reveal 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
  transformOrigin: 'center',
};

const PARTICLES = ['STAR', 'SPARKLES', 'DIZZY', 'FIRE', 'COLLISION', 'TARGET', 'TROPHY'] as const;
const PARTICLE_EMOJI: Record<(typeof PARTICLES)[number], string> = {
  STAR: '⭐',
  SPARKLES: '✨',
  DIZZY: '💫',
  FIRE: '🔥',
  COLLISION: '💥',
  TARGET: '🎯',
  TROPHY: '🏆',
};

interface ComboAnimationProps {
  streak?: number;
  score?: number;
  show?: boolean;
  onComplete?: () => void;
}

const getComboContainerStyle = (streak: number): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  animation: streak >= 7
    ? 'combo-explode 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), combo-shake 0.5s 0.6s infinite'
    : 'combo-explode 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
});

const getComboNumberStyle = (streak: number): CSSProperties => {
  const baseStyle: CSSProperties = {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: `${Math.min(120, 60 + streak * 8)}px`,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: '16px',
  };

  if (streak >= 10) {
    return {
      ...baseStyle,
      background: 'linear-gradient(180deg, #ff00ff 0%, #ff6600 25%, #ffff00 50%, #00ff00 75%, #00ffff 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      filter: 'drop-shadow(0 0 30px rgba(255, 0, 255, 0.8))',
    };
  }

  if (streak >= 7) {
    return {
      ...baseStyle,
      color: '#ff00ff',
      textShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #ff00ff, 4px 4px 0 #000',
    };
  }

  if (streak >= 5) {
    return {
      ...baseStyle,
      color: '#ff6600',
      textShadow: '0 0 15px #ff6600, 0 0 30px #ff6600, 3px 3px 0 #000',
    };
  }

  if (streak >= 3) {
    return {
      ...baseStyle,
      color: '#ffcc00',
      textShadow: '0 0 10px #ffcc00, 0 0 20px #ffcc00, 2px 2px 0 #000',
    };
  }

  return {
    ...baseStyle,
    color: '#00ff00',
    textShadow: '0 0 8px #00ff00, 2px 2px 0 #000',
  };
};

const getComboTextStyle = (streak: number): CSSProperties => ({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: `${Math.min(32, 16 + streak * 2)}px`,
  color: '#fff',
  textShadow: '2px 2px 0 #000, -2px -2px 0 #000',
  marginBottom: '8px',
});

const getBonusTextStyle = (streak: number): CSSProperties => ({
  fontFamily: "'Press Start 2P', monospace",
  fontSize: '14px',
  color: streak >= 5 ? '#ffd700' : '#00ff00',
  textShadow: '1px 1px 0 #000',
  marginTop: '8px',
  opacity: 0,
  animation: 'combo-bonusReveal 0.35s ease-out 0.3s forwards',
});

const getParticleStyle = (delay: number, x: number, y: number): CSSProperties => ({
  position: 'absolute',
  fontSize: '24px',
  animation: `combo-floatUp 1.5s ${delay}s ease-out forwards`,
  left: `calc(50% + ${x}px)`,
  top: `calc(50% + ${y}px)`,
});

export default function ComboAnimation({
  streak: externalStreak,
  score: externalScore,
  show: externalShow,
  onComplete,
}: ComboAnimationProps = {}) {
  const storeComboState = useLeaderboardStore((state) => state.showComboAnimation);
  const storeComboStreak = useLeaderboardStore((state) => state.comboStreak);
  const storeComboScore = useLeaderboardStore((state) => state.comboScore);
  const hideCombo = useLeaderboardStore((state) => state.hideCombo);

  const streak = externalStreak ?? storeComboStreak;
  const score = externalScore ?? storeComboScore;
  const visible = externalShow ?? storeComboState;
  const shouldShow = visible && streak > 0;

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    ensureRetroFontsLoaded();

    const timer = setTimeout(() => {
      hideCombo();
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [hideCombo, onComplete, shouldShow]);

  const getComboMessage = (comboStreak: number): string => {
    if (comboStreak >= 10) return 'LEGENDARY!';
    if (comboStreak >= 7) return 'ON FIRE!';
    if (comboStreak >= 5) return 'AMAZING!';
    if (comboStreak >= 3) return 'COMBO!';
    return 'NICE!';
  };

  const generateParticles = useCallback((comboStreak: number) => {
    const count = Math.min(12, 4 + comboStreak);
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      const radius = 80 + Math.random() * 40;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: Math.random() * 0.3,
        emoji: PARTICLE_EMOJI[PARTICLES[Math.floor(Math.random() * PARTICLES.length)]],
      };
    });
  }, []);

  const particles = useMemo(() => {
    if (!shouldShow || streak < 3) {
      return [];
    }
    return generateParticles(streak);
  }, [generateParticles, shouldShow, streak]);

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <style>{comboAnimationCss}</style>
      <div aria-live="polite" role="status" style={overlayStyle}>
        <div style={getComboContainerStyle(streak)}>
          {particles.map((particle, index) => (
            <div
              key={`${particle.emoji}-${index}`}
              style={getParticleStyle(particle.delay, particle.x, particle.y)}
            >
              {particle.emoji}
            </div>
          ))}

          <div style={comboContentStyle}>
            <div style={getComboNumberStyle(streak)}>{streak}</div>
            <div style={getComboTextStyle(streak)}>{streak}연승!</div>
            <div style={getBonusTextStyle(streak)}>
              {getComboMessage(streak)}
              {score ? ` +${score.toLocaleString()} PTS` : ''}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
