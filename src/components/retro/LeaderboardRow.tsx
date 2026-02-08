import styled, { css, keyframes } from 'styled-components';
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import LevelBadge from './LevelBadge';
import { RankBadge, StreakCounter, fonts, crispText, textOutline } from './RetroTheme';

const rankUpGlow = keyframes`
  0%, 100% { color: #00ff00; }
  50% { color: #ccffcc; text-shadow: 0 0 10px #00ff00; }
`;

const rankDownGlow = keyframes`
  0%, 100% { color: #ff4444; }
  50% { color: #ffcccc; text-shadow: 0 0 10px #ff4444; }
`;

// 1위 전용 반짝임
const goldShine = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
`;

const RowContainer = styled(motion.div) <{
  $isCurrentUser: boolean;
  $rank: number;
  $rankChange?: number;
}>`
  display: grid;
  grid-template-columns: 60px 1fr 100px 80px;
  align-items: center;
  padding: 8px 16px;
  position: relative;
  font-family: ${fonts.retroDisplay};
  color: #fff;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent; // 기본 투명

  /* 1, 2, 3위 텍스트 색상 및 스타일 */
  ${props => props.$rank === 1 && css`
    color: #ffd700;
    text-shadow: 2px 2px 0px #000;
  `}
  
  ${props => props.$rank === 2 && css`
    color: #c0c0c0;
    text-shadow: 2px 2px 0px #000;
  `}

  ${props => props.$rank === 3 && css`
    color: #cd7f32;
    text-shadow: 2px 2px 0px #000;
  `}

  /* 내 랭킹 강조 (배경 약간 밝게) */
  ${props => props.$isCurrentUser && css`
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid #ff00ff;
  `}

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  /* 순위 변동 애니메이션 */
  ${props => props.$rankChange && props.$rankChange > 0 && css`
    animation: ${rankUpGlow} 2s ease-out;
  `}

  ${props => props.$rankChange && props.$rankChange < 0 && css`
    animation: ${rankDownGlow} 2s ease-out;
  `}

  @media (max-width: 640px) {
    grid-template-columns: 50px 1fr 80px;
    gap: 8px;
    padding: 8px 4px;
  }
`;

const RankCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  ${crispText}
  ${textOutline}
`;

const CrownIcon = styled.span`
  display: inline-block;
  font-size: 16px;
  margin-right: -4px;
  animation: ${goldShine} 2s infinite;
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid #fff;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  overflow: hidden;
  box-shadow: 2px 2px 0px rgba(0,0,0,0.5);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;

  .name {
    font-family: ${fonts.retroDisplay};
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 1px;
    ${crispText}
    ${textOutline}
  }
`;

const ScoreCell = styled.div`
  text-align: right;
  font-family: ${fonts.retroDisplay};
  font-size: 16px;
  letter-spacing: 1px;
  ${crispText}
  ${textOutline}

  @media (max-width: 640px) {
    font-size: 14px;
  }
`;

const StreakCell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: ${fonts.retroDisplay};
  font-size: 16px;
  ${textOutline}

  @media (max-width: 640px) {
    display: none;
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
  const formatScore = (score: number): string => {
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
      transition={{ duration: 0.1 }}
    >
      {/* Rank */}
      <RankCell>
        {rank === 1 && <CrownIcon>👑</CrownIcon>}
        <span>{rank}.</span>
      </RankCell>

      {/* User Info */}
      <UserCell>
        <Avatar>
          {entry.profileImageUrl ? (
            <img src={entry.profileImageUrl} alt={entry.userName} />
          ) : (
            '😐'
          )}
        </Avatar>
        <UserInfo>
          <div className="name">{entry.userName}</div>
        </UserInfo>
      </UserCell>

      {/* Score */}
      <ScoreCell>
        {formatScore(entry.score)}
      </ScoreCell>

      {/* Streak */}
      <StreakCell>
        {entry.streak}
      </StreakCell>
    </RowContainer>
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

export default LeaderboardRow;
