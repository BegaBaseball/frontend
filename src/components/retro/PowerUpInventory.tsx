import { CSSProperties, useState } from 'react';

const retroDisplay = "'Press Start 2P', monospace";
const retroText = "'Galmuri11', 'Galmuri9', sans-serif";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const powerupInventoryStyles = `
  @keyframes retroPowerupFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes retroPowerupFloatHover {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.05); }
  }

  @keyframes retroPowerupGlow {
    0%, 100% { box-shadow: 0 0 5px currentColor; }
    50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
  }

  @keyframes retroPowerupShimmer {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(220%); }
  }

  @keyframes retroPowerupModalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes retroPowerupModalPopIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .retro-powerup-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .retro-powerup-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .retro-powerup-card.is-active {
    animation: retroPowerupGlow 2s infinite;
  }

  .retro-powerup-card.has-item .retro-powerup-shimmer {
    position: absolute;
    inset: 0;
    animation: retroPowerupShimmer 3s linear infinite;
    pointer-events: none;
  }

  .retro-powerup-card.is-clickable:hover {
    transform: scale(1.05) translateY(-8px);
    border-color: #ffffff;
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(255, 255, 255, 0.18);
  }

  .retro-powerup-card.is-clickable:hover .retro-powerup-icon {
    animation: retroPowerupFloatHover 0.6s ease-in-out infinite;
  }

  .retro-powerup-card.is-clickable:active {
    transform: scale(0.98);
  }

  .retro-powerup-icon {
    font-size: 48px;
    margin-bottom: 14px;
    animation: retroPowerupFloat 3s ease-in-out infinite;
  }

  .retro-powerup-help {
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  .retro-powerup-help:hover {
    color: #00ffff;
    border-color: #00ffff;
  }

  .retro-powerup-modal {
    animation: retroPowerupModalFadeIn 0.18s ease-out;
  }

  .retro-powerup-modal-content {
    animation: retroPowerupModalPopIn 0.2s ease-out;
  }

  .retro-powerup-modal-button {
    transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .retro-powerup-modal-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .retro-powerup-modal-button.primary:hover:not(:disabled) {
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
  }

  .retro-powerup-modal-button.secondary:hover:not(:disabled) {
    color: #fff;
    border-color: #888;
  }

  @media (max-width: 480px) {
    .retro-powerup-grid {
      grid-template-columns: 1fr;
    }
  }
`;

interface PowerupData {
  type: string;
  name: string;
  nameKo: string;
  description: string;
  icon: string;
  color: string;
}

const POWERUPS: PowerupData[] = [
  {
    type: 'MAGIC_BAT',
    name: 'Magic Bat',
    nameKo: '매직 배트',
    description: '다음 예측 점수 2배!',
    icon: '🏏',
    color: '#ff6600',
  },
  {
    type: 'GOLDEN_GLOVE',
    name: 'Golden Glove',
    nameKo: '골든 글러브',
    description: '연승 보호 (1회 실패 무효)',
    icon: '🧤',
    color: '#ffd700',
  },
  {
    type: 'SCOUTER',
    name: 'Scouter',
    nameKo: '스카우터',
    description: '다른 유저 투표 비율 미리보기',
    icon: '🔭',
    color: '#00ff00',
  },
];

interface PowerUpInventoryProps {
  powerups: Record<string, number>;
  activePowerups?: string[];
  onUsePowerup?: (type: string) => Promise<void>;
  disabled?: boolean;
}

const getPowerupCardStyle = (
  color: string,
  hasItem: boolean,
  isActive: boolean,
  actionable: boolean,
): CSSProperties => ({
  background: isActive
    ? `linear-gradient(180deg, ${color}33 0%, ${color}11 100%)`
    : hasItem
      ? 'rgba(0, 0, 0, 0.4)'
      : 'rgba(0, 0, 0, 0.6)',
  border: `2px solid ${hasItem ? color : '#222'}`,
  cursor: actionable ? 'pointer' : 'not-allowed',
  filter: hasItem ? 'none' : 'grayscale(100%) brightness(0.5)',
});

const getPowerupTextStyle = (color: string, hasItem: boolean): CSSProperties => ({
  color: hasItem ? color : '#444',
  textShadow: hasItem ? `${textOutline}, 0 0 8px ${color}60` : 'none',
});

export default function PowerUpInventory({
  powerups,
  activePowerups = [],
  onUsePowerup,
  disabled = false,
}: PowerUpInventoryProps) {
  const [selectedPowerup, setSelectedPowerup] = useState<PowerupData | null>(null);
  const [isUsing, setIsUsing] = useState(false);

  const handleUse = async () => {
    if (!selectedPowerup || !onUsePowerup) return;

    setIsUsing(true);
    try {
      await onUsePowerup(selectedPowerup.type);
      setSelectedPowerup(null);
    } catch (error) {
      console.error('Failed to use powerup:', error);
    } finally {
      setIsUsing(false);
    }
  };

  return (
    <div
      style={{
        background: `
          repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 20px,
            rgba(74, 74, 106, 0.1) 20px,
            rgba(74, 74, 106, 0.1) 21px
          ),
          repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 20px,
            rgba(74, 74, 106, 0.1) 20px,
            rgba(74, 74, 106, 0.1) 21px
          ),
          linear-gradient(180deg, #0a0a1e 0%, #050510 100%)
        `,
        borderTop: '3px solid #4a4a6a',
        padding: '24px 20px',
        position: 'relative',
      }}
    >
      <style>{powerupInventoryStyles}</style>

      <span style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '14px', opacity: 0.5 }}>🎮</span>
      <span style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '14px', opacity: 0.5 }}>🎮</span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid rgba(0, 255, 255, 0.2)',
        }}
      >
        <h3
          style={{
            fontFamily: retroDisplay,
            fontSize: '11px',
            color: '#00ffff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
            margin: 0,
            imageRendering: 'pixelated',
          }}
        >
          <span>🎮</span>
          POWER-UPS
        </h3>
        <span
          className="retro-powerup-help"
          title="아이템은 예측 화면에서 사용할 수 있습니다"
          style={{
            fontFamily: retroDisplay,
            fontSize: '9px',
            color: '#6a6a8a',
            cursor: 'help',
            padding: '4px 8px',
            border: '1px solid #4a4a6a',
            borderRadius: '4px',
            imageRendering: 'pixelated',
          }}
        >
          ?
        </span>
      </div>

      <div className="retro-powerup-grid">
        {POWERUPS.map((powerup) => {
          const count = powerups[powerup.type] || 0;
          const isActive = activePowerups.includes(powerup.type);
          const hasItem = count > 0;
          const available = hasItem && !disabled;
          const actionable = available && !isActive && Boolean(onUsePowerup);

          return (
            <button
              key={powerup.type}
              type="button"
              className={[
                'retro-powerup-card',
                hasItem ? 'has-item' : '',
                isActive ? 'is-active' : '',
                actionable ? 'is-clickable' : '',
              ].filter(Boolean).join(' ')}
              style={getPowerupCardStyle(powerup.color, hasItem, isActive, actionable)}
              onClick={() => actionable && setSelectedPowerup(powerup)}
              disabled={!actionable}
            >
              {hasItem && (
                <span
                  className="retro-powerup-shimmer"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${powerup.color}40, transparent)`,
                  }}
                />
              )}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#00ff00',
                    color: '#000',
                    fontFamily: retroDisplay,
                    fontSize: '6px',
                    padding: '3px 6px',
                    borderRadius: '2px',
                    imageRendering: 'pixelated',
                  }}
                >
                  ACTIVE
                </span>
              )}
              <span
                className="retro-powerup-icon"
                style={{
                  filter: hasItem ? `drop-shadow(0 0 10px ${powerup.color}80)` : 'none',
                }}
              >
                {powerup.icon}
              </span>
              <span
                style={{
                  ...getPowerupTextStyle(powerup.color, hasItem),
                  fontFamily: retroText,
                  fontSize: '12px',
                  marginBottom: '8px',
                  textAlign: 'center',
                  letterSpacing: '-0.3px',
                  imageRendering: 'pixelated',
                }}
              >
                {powerup.nameKo}
              </span>
              <span
                style={{
                  fontFamily: retroText,
                  fontSize: '10px',
                  color: hasItem ? '#bbb' : '#555',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  marginBottom: '14px',
                  minHeight: '32px',
                  letterSpacing: '-0.3px',
                  textShadow: textOutline,
                  imageRendering: 'pixelated',
                }}
              >
                {powerup.description}
              </span>
              <span
                style={{
                  fontFamily: retroDisplay,
                  fontSize: '14px',
                  color: hasItem ? '#fff' : '#444',
                  background: hasItem
                    ? `linear-gradient(180deg, ${powerup.color}40 0%, ${powerup.color}20 100%)`
                    : 'rgba(0, 0, 0, 0.5)',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  border: `2px solid ${hasItem ? powerup.color : '#333'}`,
                  textShadow: hasItem ? `0 0 8px ${powerup.color}` : undefined,
                  imageRendering: 'pixelated',
                }}
              >
                x{count}
              </span>
            </button>
          );
        })}
      </div>

      {selectedPowerup && (
        <div
          className="retro-powerup-modal"
          onClick={() => !isUsing && setSelectedPowerup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="retro-powerup-modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1e 100%)',
              border: '3px solid #ff00ff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{selectedPowerup.icon}</div>
            <h4
              style={{
                fontFamily: retroText,
                fontSize: '14px',
                color: '#ff00ff',
                margin: '0 0 16px',
                letterSpacing: '-0.3px',
                textShadow: textOutline,
                imageRendering: 'pixelated',
              }}
            >
              {selectedPowerup.nameKo}
            </h4>
            <p
              style={{
                fontFamily: retroText,
                fontSize: '11px',
                color: '#bbb',
                lineHeight: 1.8,
                margin: '0 0 24px',
                letterSpacing: '-0.3px',
                textShadow: textOutline,
                imageRendering: 'pixelated',
              }}
            >
              {selectedPowerup.description}
              <br />
              <br />
              이 아이템을 사용하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="retro-powerup-modal-button secondary"
                onClick={() => setSelectedPowerup(null)}
                disabled={isUsing}
                style={{
                  fontFamily: retroText,
                  fontSize: '11px',
                  padding: '12px 24px',
                  border: '2px solid #666',
                  background: 'transparent',
                  color: '#888',
                  cursor: isUsing ? 'not-allowed' : 'pointer',
                  textShadow: textOutline,
                  imageRendering: 'pixelated',
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="retro-powerup-modal-button primary"
                onClick={handleUse}
                disabled={isUsing}
                style={{
                  fontFamily: retroText,
                  fontSize: '11px',
                  padding: '12px 24px',
                  border: '2px solid #00ff00',
                  background: 'linear-gradient(180deg, #00aa00 0%, #006600 100%)',
                  color: '#fff',
                  cursor: isUsing ? 'not-allowed' : 'pointer',
                  textShadow: textOutline,
                  imageRendering: 'pixelated',
                }}
              >
                {isUsing ? '사용 중...' : '사용하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
