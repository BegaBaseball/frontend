import styled, { keyframes, css } from 'styled-components';
import LevelBadge, { getRankTier } from './LevelBadge';
import PixelProgressBar from './PixelProgressBar';
import { StreakCounter, RetroDivider, fonts, crispText, textOutline } from './RetroTheme';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const scoreGlow = keyframes`
  0%, 100% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
  50% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor; }
`;

const rankShine = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const PanelContainer = styled.div`
  background: linear-gradient(180deg, #1a0a2a 0%, #0a0a1a 100%);
  border: 3px solid #ff00ff;
  border-radius: 4px;
  padding: 20px;
  margin: 16px;
  position: relative;
  overflow: hidden;

  /* Corner decorations */
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border: 2px solid #ff00ff;
  }

  &::before {
    top: 6px;
    left: 6px;
    border-right: none;
    border-bottom: none;
  }

  &::after {
    bottom: 6px;
    right: 6px;
    border-left: none;
    border-top: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 4px;
  background: linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%);
  border: 3px solid #ff00ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  .label {
    font-family: ${fonts.retroDisplay};
    font-size: 9px;
    color: #ff00ff;
    margin-bottom: 4px;
    ${crispText}
  }

  .name {
    font-family: ${fonts.retroText};
    font-size: 16px;
    color: #fff;
    margin-bottom: 8px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
  }
`;

const RankSection = styled.div`
  text-align: right;

  @media (max-width: 640px) {
    text-align: left;
  }
`;

const RankDisplay = styled.div<{ $rank: number }>`
  font-family: ${fonts.retroText};
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  ${crispText}
  ${textOutline}

  @media (max-width: 640px) {
    justify-content: flex-start;
  }
`;

const RankNumber = styled.div<{ $rank: number }>`
  font-family: ${fonts.retroDisplay};
  font-size: 24px;
  padding: 8px 16px;
  border-radius: 4px;
  position: relative;
  ${crispText}

  ${props => {
    if (props.$rank === 1) {
      return css`
        color: #ffd700;
        background: linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
        border: 3px solid #ffd700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 15px rgba(255, 215, 0, 0.2);
        text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);

        &::before {
          content: '👑';
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16px;
        }
      `;
    } else if (props.$rank === 2) {
      return css`
        color: #c0c0c0;
        background: linear-gradient(180deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.1) 100%);
        border: 3px solid #c0c0c0;
        box-shadow: 0 0 15px rgba(192, 192, 192, 0.3);
        text-shadow: 0 0 10px rgba(192, 192, 192, 0.6);
      `;
    } else if (props.$rank === 3) {
      return css`
        color: #cd7f32;
        background: linear-gradient(180deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.1) 100%);
        border: 3px solid #cd7f32;
        box-shadow: 0 0 15px rgba(205, 127, 50, 0.3);
        text-shadow: 0 0 10px rgba(205, 127, 50, 0.6);
      `;
    } else if (props.$rank <= 10) {
      return css`
        color: #00ffff;
        background: rgba(0, 255, 255, 0.1);
        border: 2px solid #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
        text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
      `;
    } else {
      return css`
        color: #00ffff;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid #4a4a6a;
        text-shadow: 0 0 6px rgba(0, 255, 255, 0.3);
      `;
    }
  }}
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatBox = styled.div<{ $highlight?: boolean }>`
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid ${props => props.$highlight ? '#00ff00' : '#3a3a5a'};
  border-radius: 4px;
  padding: 16px 12px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  ${props => props.$highlight && css`
    box-shadow:
      0 0 15px rgba(0, 255, 0, 0.3),
      inset 0 0 20px rgba(0, 255, 0, 0.1);
    background: linear-gradient(180deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%);

    /* 빛나는 테두리 효과 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.2), transparent);
      animation: ${rankShine} 3s infinite;
    }
  `}

  &:hover {
    transform: translateY(-2px);
    ${props => props.$highlight && css`
      box-shadow:
        0 0 25px rgba(0, 255, 0, 0.5),
        inset 0 0 30px rgba(0, 255, 0, 0.15);
    `}
  }

  .label {
    font-family: ${fonts.retroText};
    font-size: 11px;
    color: ${props => props.$highlight ? '#88ff88' : '#7a7a9a'};
    margin-bottom: 10px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
  }

  .value {
    font-family: ${fonts.retroDisplay};
    font-size: 20px;
    color: ${props => props.$highlight ? '#00ff00' : '#fff'};
    ${crispText}
    ${props => props.$highlight && css`
      animation: ${scoreGlow} 2s infinite;
    `}
    text-shadow: ${props => props.$highlight
      ? '0 0 15px rgba(0, 255, 0, 0.8)'
      : '0 0 4px rgba(255, 255, 255, 0.3)'
    };
  }

  .suffix {
    font-family: ${fonts.retroText};
    font-size: 11px;
    color: ${props => props.$highlight ? '#66ff66' : '#888'};
    margin-left: 4px;
    ${crispText}
  }
`;

const XPSection = styled.div`
  margin-top: 16px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .label {
    font-family: ${fonts.retroDisplay};
    font-size: 9px;
    color: #aaa;
    ${crispText}
  }

  .next-level {
    font-family: ${fonts.retroDisplay};
    font-size: 9px;
    color: #00ffff;
    animation: ${pulse} 2s infinite;
    ${crispText}
  }
`;

export interface UserStats {
  userId: number;
  userName: string;
  profileImageUrl?: string;
  rank: number;
  totalScore: number;
  seasonScore: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  experiencePoints: number;
  nextLevelExp: number;
  accuracy?: number;
}

interface UserStatsPanelProps {
  stats: UserStats;
}

// Calculate XP needed for next level
function calculateNextLevelXP(level: number): number {
  // Level = floor(sqrt(exp / 100)) + 1
  // So exp for level L = (L-1)^2 * 100
  return Math.pow(level, 2) * 100;
}

function calculateCurrentLevelXP(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export default function UserStatsPanel({ stats }: UserStatsPanelProps) {
  const currentLevelXP = calculateCurrentLevelXP(stats.level);
  const nextLevelXP = calculateNextLevelXP(stats.level);
  const xpProgress = stats.experiencePoints - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <PanelContainer>
      <Header>
        <UserSection>
          <Avatar>
            {stats.profileImageUrl ? (
              <img src={stats.profileImageUrl} alt={stats.userName} />
            ) : (
              '🧑'
            )}
          </Avatar>
          <UserInfo>
            <div className="label">YOUR STATUS</div>
            <div className="name">{stats.userName}</div>
            <LevelBadge level={stats.level} />
          </UserInfo>
        </UserSection>

        <RankSection>
          <RankDisplay $rank={stats.rank}>
            <span>현재 순위</span>
            <RankNumber $rank={stats.rank}>
              #{stats.rank}
            </RankNumber>
          </RankDisplay>
          {stats.currentStreak > 0 && (
            <StreakCounter $streak={stats.currentStreak}>
              {stats.currentStreak >= 5 && '🔥 '}
              {stats.currentStreak}연승 중!
            </StreakCounter>
          )}
        </RankSection>
      </Header>

      <RetroDivider />

      <StatsGrid>
        <StatBox $highlight>
          <div className="label">시즌 점수</div>
          <div className="value">
            {formatNumber(stats.seasonScore)}
            <span className="suffix">PTS</span>
          </div>
        </StatBox>

        <StatBox>
          <div className="label">총점</div>
          <div className="value">
            {formatNumber(stats.totalScore)}
            <span className="suffix">PTS</span>
          </div>
        </StatBox>

        <StatBox>
          <div className="label">최고 연승</div>
          <div className="value">
            {stats.maxStreak}
            <span className="suffix">연승</span>
          </div>
        </StatBox>

        <StatBox>
          <div className="label">적중률</div>
          <div className="value">
            {stats.accuracy !== undefined ? `${stats.accuracy.toFixed(1)}` : '-'}
            <span className="suffix">%</span>
          </div>
        </StatBox>
      </StatsGrid>

      <XPSection>
        <div className="header">
          <span className="label">
            EXP: {formatNumber(stats.experiencePoints)}
          </span>
          <span className="next-level">
            NEXT LV.{(stats.level + 1).toString().padStart(2, '0')} → {formatNumber(nextLevelXP)} EXP
          </span>
        </div>
        <PixelProgressBar
          value={xpProgress}
          max={xpNeeded}
          color={getRankTier(stats.level) === 'HALL_OF_FAME' ? '#ffd700' : '#00ffff'}
          size="lg"
        />
      </XPSection>
    </PanelContainer>
  );
}
