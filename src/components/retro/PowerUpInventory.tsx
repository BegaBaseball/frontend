import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { fonts, crispText, textOutline } from './RetroTheme';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const floatHover = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
`;

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const InventoryContainer = styled.div`
  background:
    /* 그리드 패턴 */
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
    linear-gradient(180deg, #0a0a1e 0%, #050510 100%);
  border-top: 3px solid #4a4a6a;
  padding: 24px 20px;
  position: relative;

  /* 코너 장식 */
  &::before,
  &::after {
    content: '🎮';
    position: absolute;
    font-size: 14px;
    opacity: 0.5;
  }
  &::before {
    top: 12px;
    left: 12px;
  }
  &::after {
    bottom: 12px;
    right: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(0, 255, 255, 0.2);

  h3 {
    font-family: ${fonts.retroDisplay};
    font-size: 11px;
    color: #00ffff;
    display: flex;
    align-items: center;
    gap: 10px;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    ${crispText}
  }

  .help {
    font-family: ${fonts.retroDisplay};
    font-size: 9px;
    color: #6a6a8a;
    cursor: help;
    padding: 4px 8px;
    border: 1px solid #4a4a6a;
    border-radius: 4px;
    transition: all 0.2s ease;
    ${crispText}

    &:hover {
      color: #00ffff;
      border-color: #00ffff;
    }
  }
`;

const PowerupsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const PowerupCard = styled(motion.button)<{
  $color: string;
  $available: boolean;
  $active?: boolean;
  $hasItem: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  background: ${props => {
    if (props.$active) {
      return `linear-gradient(180deg, ${props.$color}33 0%, ${props.$color}11 100%)`;
    }
    if (!props.$hasItem) {
      return 'rgba(0, 0, 0, 0.6)';
    }
    return 'rgba(0, 0, 0, 0.4)';
  }};
  border: 2px solid ${props => props.$hasItem ? props.$color : '#222'};
  border-radius: 8px;
  cursor: ${props => props.$available ? 'pointer' : 'not-allowed'};
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* 미보유 시 흑백 처리 */
  filter: ${props => props.$hasItem ? 'none' : 'grayscale(100%) brightness(0.5)'};

  ${props => props.$active && css`
    animation: ${glow} 2s infinite;
    color: ${props.$color};
  `}

  /* 보유 아이템 빛나는 테두리 */
  ${props => props.$hasItem && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, ${props.$color}40, transparent);
      animation: ${shimmer} 3s infinite;
    }
  `}

  &:hover {
    ${props => props.$available && css`
      transform: scale(1.05) translateY(-8px);
      border-color: #fff;
      box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.3),
        0 0 20px ${props.$color}60;

      .icon {
        animation: ${floatHover} 0.6s ease-in-out infinite;
      }
    `}
  }

  .icon {
    font-size: 48px;
    margin-bottom: 14px;
    animation: ${float} 3s ease-in-out infinite;
    filter: ${props => props.$hasItem
      ? `drop-shadow(0 0 10px ${props.$color}80)`
      : 'none'
    };
  }

  .name {
    font-family: ${fonts.retroText};
    font-size: 12px;
    color: ${props => props.$hasItem ? props.$color : '#444'};
    margin-bottom: 8px;
    text-align: center;
    letter-spacing: -0.3px;
    ${crispText}
    text-shadow: ${props => props.$hasItem
      ? `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px ${props.$color}60`
      : 'none'
    };
  }

  .description {
    font-family: ${fonts.retroText};
    font-size: 10px;
    color: ${props => props.$hasItem ? '#bbb' : '#555'};
    text-align: center;
    line-height: 1.6;
    margin-bottom: 14px;
    min-height: 32px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
  }

  .count {
    font-family: ${fonts.retroDisplay};
    font-size: 14px;
    color: ${props => props.$hasItem ? '#fff' : '#444'};
    background: ${props => props.$hasItem
      ? `linear-gradient(180deg, ${props.$color}40 0%, ${props.$color}20 100%)`
      : 'rgba(0, 0, 0, 0.5)'
    };
    padding: 6px 16px;
    border-radius: 4px;
    border: 2px solid ${props => props.$hasItem ? props.$color : '#333'};
    ${crispText}
    ${props => props.$hasItem && css`
      text-shadow: 0 0 8px ${props.$color};
    `}
  }
`;

const ActiveBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: #00ff00;
  color: #000;
  font-family: ${fonts.retroDisplay};
  font-size: 6px;
  padding: 3px 6px;
  border-radius: 2px;
  ${crispText}
`;

const Modal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #1a1a2e 0%, #0a0a1e 100%);
  border: 3px solid #ff00ff;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  text-align: center;

  h4 {
    font-family: ${fonts.retroText};
    font-size: 14px;
    color: #ff00ff;
    margin-bottom: 16px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
  }

  p {
    font-family: ${fonts.retroText};
    font-size: 11px;
    color: #bbb;
    line-height: 1.8;
    margin-bottom: 24px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
  }

  .buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  font-family: ${fonts.retroText};
  font-size: 11px;
  padding: 12px 24px;
  border: 2px solid ${props => props.$variant === 'primary' ? '#00ff00' : '#666'};
  background: ${props => props.$variant === 'primary'
    ? 'linear-gradient(180deg, #00aa00 0%, #006600 100%)'
    : 'transparent'
  };
  color: ${props => props.$variant === 'primary' ? '#fff' : '#888'};
  cursor: pointer;
  transition: all 0.2s ease;
  ${crispText}
  ${textOutline}

  &:hover {
    transform: translateY(-2px);
    ${props => props.$variant === 'primary'
      ? 'box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);'
      : 'color: #fff; border-color: #888;'
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
    <InventoryContainer>
      <Header>
        <h3>
          <span>🎮</span>
          POWER-UPS
        </h3>
        <span className="help" title="아이템은 예측 화면에서 사용할 수 있습니다">
          ?
        </span>
      </Header>

      <PowerupsGrid>
        {POWERUPS.map((powerup) => {
          const count = powerups[powerup.type] || 0;
          const isActive = activePowerups.includes(powerup.type);
          const hasItem = count > 0;
          const available = hasItem && !disabled;

          return (
            <PowerupCard
              key={powerup.type}
              $color={powerup.color}
              $available={available}
              $active={isActive}
              $hasItem={hasItem}
              onClick={() => available && !isActive && setSelectedPowerup(powerup)}
              whileTap={available ? { scale: 0.98 } : undefined}
            >
              {isActive && <ActiveBadge>ACTIVE</ActiveBadge>}
              <span className="icon">{powerup.icon}</span>
              <span className="name">{powerup.nameKo}</span>
              <span className="description">{powerup.description}</span>
              <span className="count">x{count}</span>
            </PowerupCard>
          );
        })}
      </PowerupsGrid>

      {/* Use Powerup Modal */}
      {selectedPowerup && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isUsing && setSelectedPowerup(null)}
        >
          <ModalContent
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {selectedPowerup.icon}
            </div>
            <h4>{selectedPowerup.nameKo}</h4>
            <p>
              {selectedPowerup.description}
              <br /><br />
              이 아이템을 사용하시겠습니까?
            </p>
            <div className="buttons">
              <ModalButton
                $variant="secondary"
                onClick={() => setSelectedPowerup(null)}
                disabled={isUsing}
              >
                취소
              </ModalButton>
              <ModalButton
                $variant="primary"
                onClick={handleUse}
                disabled={isUsing}
              >
                {isUsing ? '사용 중...' : '사용하기'}
              </ModalButton>
            </div>
          </ModalContent>
        </Modal>
      )}
    </InventoryContainer>
  );
}
