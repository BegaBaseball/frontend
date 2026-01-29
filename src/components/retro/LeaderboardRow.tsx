import styled, { css, keyframes } from 'styled-components';
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import LevelBadge from './LevelBadge';
import { RankBadge, StreakCounter, animations, fonts, crispText, textOutline } from './RetroTheme';

const rankUpGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(0, 255, 0, 0); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.5); }
`;

const rankDownGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(255, 0, 0, 0); }
  50% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.5); }
`;

// 1위 전용 황금빛 흐름 애니메이션
const goldFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// 왕관 흔들림 애니메이션
const crownWiggle = keyframes`
  0%, 100% { transform: rotate(-10deg) scale(1); }
  25% { transform: rotate(5deg) scale(1.1); }
  50% { transform: rotate(-5deg) scale(1); }
  75% { transform: rotate(10deg) scale(1.1); }
`;

// 애니메이션된 왕관
const AnimatedCrown = styled.span`
  display: inline-block;
  font-size: 18px;
  animation: ${crownWiggle} 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
  margin-right: 4px;
`;

const RowContainer = styled(motion.div)<{
  $isCurrentUser: boolean;
  $rank: number;
  $rankChange?: number;
}>`
  display: grid;
  grid-template-columns: 60px 1fr 120px 100px 80px;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  position: relative;
  border-radius: 4px;
  transition: all 0.3s ease;

  /* 기본 배경 & 테두리 */
  background: ${props => {
    if (props.$isCurrentUser) {
      return 'linear-gradient(90deg, rgba(255,0,255,0.2) 0%, rgba(0,255,255,0.1) 100%)';
    }
    if (props.$rank === 1) {
      return 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 215, 0, 0.15) 100%)';
    }
    return 'linear-gradient(180deg, rgba(30,30,50,0.8) 0%, rgba(20,20,40,0.8) 100%)';
  }};
  background-size: ${props => props.$rank === 1 ? '200% 200%' : 'auto'};

  border: ${props => {
    if (props.$isCurrentUser) return '2px solid #ff00ff';
    if (props.$rank === 1) return '3px solid #ffd700';
    if (props.$rank === 2) return '2px solid #c0c0c0';
    if (props.$rank === 3) return '2px solid #cd7f32';
    return '2px solid #3a3a5a';
  }};

  /* 1위 전용 황금 애니메이션 */
  ${props => props.$rank === 1 && css`
    animation: ${goldFlow} 3s ease infinite;
    box-shadow:
      0 0 25px rgba(255, 215, 0, 0.5),
      inset 0 0 20px rgba(255, 215, 0, 0.15);
  `}

  /* 2위 은색 글로우 */
  ${props => props.$rank === 2 && css`
    box-shadow: 0 0 15px rgba(192, 192, 192, 0.3);
  `}

  /* 3위 동색 글로우 */
  ${props => props.$rank === 3 && css`
    box-shadow: 0 0 12px rgba(205, 127, 50, 0.3);
  `}

  /* 순위 변동 애니메이션 */
  ${props => props.$rankChange && props.$rankChange > 0 && props.$rank !== 1 && css`
    animation: ${rankUpGlow} 2s ease-out;
  `}

  ${props => props.$rankChange && props.$rankChange < 0 && props.$rank !== 1 && css`
    animation: ${rankDownGlow} 2s ease-out;
  `}

  &:hover {
    transform: translateX(4px);
    ${props => !props.$isCurrentUser && props.$rank !== 1 && css`
      background: linear-gradient(180deg, rgba(40,40,60,0.9) 0%, rgba(30,30,50,0.9) 100%);
    `}
    ${props => props.$isCurrentUser && css`
      background: linear-gradient(90deg, rgba(255,0,255,0.3) 0%, rgba(0,255,255,0.2) 100%);
    `}
    ${props => props.$rank === 1 && css`
      box-shadow:
        0 0 35px rgba(255, 215, 0, 0.7),
        inset 0 0 25px rgba(255, 215, 0, 0.2);
    `}
  }

  @media (max-width: 640px) {
    grid-template-columns: 50px 1fr 80px;
    gap: 8px;
    padding: 10px 12px;
  }
`;

const RankCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const Avatar = styled.div<{ $rank: number }>`
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%);
  border: 2px solid ${props => {
    if (props.$rank === 1) return '#ffd700';
    if (props.$rank === 2) return '#c0c0c0';
    if (props.$rank === 3) return '#cd7f32';
    return '#4a4a6a';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div<{ $isChampion?: boolean }>`
  min-width: 0;
  flex: 1;

  .name {
    font-family: ${fonts.retroText};
    font-size: 13px;
    color: ${props => props.$isChampion ? '#ffd700' : '#fff'};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
    letter-spacing: -0.3px;
    ${crispText}
    ${textOutline}
    ${props => props.$isChampion && css`
      text-shadow:
        -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000,
        0 0 10px rgba(255, 215, 0, 0.6);
    `}
  }

  .handle {
    font-family: ${fonts.retroSystem};
    font-size: 10px;
    color: #7a7a9a;
    letter-spacing: 0px;
    ${crispText}
  }
`;

const ScoreCell = styled.div`
  text-align: right;
  font-family: ${fonts.retroDisplay};
  font-size: 13px;
  color: #00ff00;
  text-shadow: 0 0 4px rgba(0, 255, 0, 0.5);
  ${crispText}

  @media (max-width: 640px) {
    font-size: 11px;
  }
`;

const LevelCell = styled.div`
  display: flex;
  justify-content: center;

  @media (max-width: 640px) {
    display: none;
  }
`;

const StreakCell = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;

  @media (max-width: 640px) {
    display: none;
  }
`;

const RankChange = styled.span<{ $change: number }>`
  font-family: ${fonts.retroDisplay};
  font-size: 8px;
  margin-left: 4px;
  color: ${props => props.$change > 0 ? '#00ff00' : props.$change < 0 ? '#ff4444' : '#666'};
  ${crispText}

  &::before {
    content: '${props => props.$change > 0 ? '▲' : props.$change < 0 ? '▼' : '-'}';
    margin-right: 2px;
  }
`;

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  handle?: string;
  profileImageUrl?: string;
  level: number;
  score: number;
  streak: number;
  rankChange?: number;
}

interface LeaderboardRowProps {
  rank: number;
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

const LeaderboardRow = forwardRef<HTMLDivElement, LeaderboardRowProps>(({
  rank,
  entry,
  isCurrentUser = false,
}, ref) => {
  const getOrdinalSuffix = (value: number): string => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return 'TH';
    }
    switch (value % 10) {
      case 1:
        return 'ST';
      case 2:
        return 'ND';
      case 3:
        return 'RD';
      default:
        return 'TH';
    }
  };

  const formatScore = (score: number): string => {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    }
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toLocaleString();
  };

  return (
    <RowContainer
      ref={ref}
      $isCurrentUser={isCurrentUser}
      $rank={rank}
      $rankChange={entry.rankChange}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Rank */}
      <RankCell>
        {rank === 1 && <AnimatedCrown>👑</AnimatedCrown>}
        {rank === 2 && <span style={{ marginRight: 4, filter: 'drop-shadow(0 0 4px rgba(192, 192, 192, 0.6))' }}>🥈</span>}
        {rank === 3 && <span style={{ marginRight: 4, filter: 'drop-shadow(0 0 4px rgba(205, 127, 50, 0.6))' }}>🥉</span>}
        <RankBadge $rank={rank}>
          {rank <= 3 ? ['1ST', '2ND', '3RD'][rank - 1] : `${rank}${getOrdinalSuffix(rank)}`}
        </RankBadge>
        {entry.rankChange !== undefined && entry.rankChange !== 0 && (
          <RankChange $change={entry.rankChange}>
            {Math.abs(entry.rankChange)}
          </RankChange>
        )}
      </RankCell>

      {/* User Info */}
      <UserCell>
        <Avatar $rank={rank}>
          {entry.profileImageUrl ? (
            <img src={entry.profileImageUrl} alt={entry.userName} />
          ) : (
            '🧑'
          )}
        </Avatar>
        <UserInfo $isChampion={rank === 1}>
          <div className="name">{entry.userName}</div>
          {entry.handle && <div className="handle">@{entry.handle}</div>}
        </UserInfo>
      </UserCell>

      {/* Score */}
      <ScoreCell>
        {formatScore(entry.score)} PTS
      </ScoreCell>

      {/* Level */}
      <LevelCell>
        <LevelBadge level={entry.level} compact />
      </LevelCell>

      {/* Streak */}
      <StreakCell>
        {entry.streak > 0 && (
          <StreakCounter $streak={entry.streak}>
            {entry.streak >= 5 && '🔥'}
            {entry.streak}연승
          </StreakCounter>
        )}
      </StreakCell>
    </RowContainer>
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

export default LeaderboardRow;
