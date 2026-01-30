import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import {
  fonts,
  crispText,
} from './RetroTheme';
import LeaderboardRow, { LeaderboardEntry } from './LeaderboardRow';
import { TickerMessage } from './NewsTicker';
import { UserStats } from './UserStatsPanel';

import mascotRight from '../../assets/images/mascot_v3.png';
import stadiumBg from '../../assets/images/stadium_bg.png';

// ==========================================
// KEYFRAMES
// ==========================================
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// ==========================================
// STYLED COMPONENTS
// ==========================================

const StadiumContainer = styled.div`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: ${fonts.retroText};
  background: url(${stadiumBg}) no-repeat center center fixed;
  background-size: cover;
  image-rendering: pixelated;
`;

const ContentOverlay = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  position: relative;
  z-index: 10;
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-bottom: 50px;
  z-index: 30;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
  }
`;

const Title = styled.h1`
  font-family: ${fonts.retroText}; 
  font-size: 52px;
  color: #fff;
  text-align: center;
  text-shadow: 
    4px 4px 0 #000,
    -4px -4px 0 #000,
    4px -4px 0 #000,
    -4px 4px 0 #000;
  margin: 0;
  ${crispText}
  z-index: 20; 
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const ScoreboardWrapper = styled.div`
  width: 90%;
  max-width: 800px;
  position: relative;
`;

const ScoreboardBox = styled.div`
  width: 100%;
  background: rgba(0, 0, 0, 0.7);
  border: 4px solid #fff;
  border-radius: 8px;
  outline: 4px solid #000;
  box-shadow: 10px 10px 20px rgba(0,0,0,0.5);
  position: relative;
  z-index: 20;
  padding: 4px;
`;

const ScoreboardInner = styled.div`
  border: 2px solid #fff;
  border-radius: 6px;
  padding: 10px;
  background: transparent;
  min-height: 500px;
  display: flex;
  flex-direction: column;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 100px 80px;
  padding: 12px 16px;
  border-bottom: 2px solid #fff;
  margin-bottom: 20px;
  gap: 10px;

  span {
    color: #fff;
    font-family: ${fonts.retroDisplay};
    font-size: 14px;
    letter-spacing: 1px;
    ${crispText}
    text-shadow: 2px 2px 0 #000;
  }

  span:nth-child(3), span:nth-child(4) {
    text-align: right;
  }

  @media (max-width: 640px) {
    grid-template-columns: 50px 1fr 80px;
    span:last-child { display: none; }
  }
`;

const CharacterFrame = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #fff;
  background-color: #87ceeb;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  z-index: 30;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation: ${float} 4s ease-in-out infinite reverse;

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`;

const CharacterSprite = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.5); 
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  object-position: center 20%; 
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  width: 100%;
  position: relative;
  padding-bottom: 10px;
`;

const RetroActionButton = styled.button`
  background: #000;
  color: #fff;
  border: 2px solid #fff;
  padding: 12px 24px;
  font-family: ${fonts.retroText}; 
  font-size: 16px; 
  cursor: pointer;
  box-shadow: 4px 4px 0 #000;
  transition: transform 0.1s;
  ${crispText}
  border-radius: 4px;

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #000;
    color: #ffff00;
    border-color: #ffff00;
  }

  &:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #000;
  }
`;

const LoadingText = styled.div`
  color: #fff;
  text-align: center;
  padding: 40px;
  font-size: 18px;
  animation: ${blink} 1s infinite;
  text-shadow: 2px 2px 0 #000;
  background: rgba(50, 50, 50, 0.8);
  border-radius: 8px;
  margin: auto;
  min-width: 300px;
  font-family: ${fonts.retroText};
`;

const EmptyStateContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const EmptyStateBox = styled.div`
  background: rgba(0, 0, 0, 0.4);
  padding: 40px 60px;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-family: ${fonts.retroText};
  text-shadow: 2px 2px 0 #000;
  animation: ${blink} 1.5s infinite;
  ${crispText}
`;

// New Styled Components for Rules Overlay
const InfoText = styled.div`
  font-family: ${fonts.retroText};
  font-size: 12px;
  color: #ccc;
  margin-top: 10px;
  margin-bottom: 15px;
  text-align: center;
  ${crispText}
  text-shadow: 1px 1px 0 #000;
  width: 100%;
`;

const RulesOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: 8px;
`;

const RulesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #fff;
  font-family: ${fonts.retroText};
  font-size: 14px;
  margin-bottom: 20px;

  th, td {
    border: 2px solid #fff;
    padding: 10px;
    text-align: center;
    ${crispText}
  }

  th {
    background: #333;
    color: #ffd700;
  }
`;

const CloseButton = styled.button`
  background: red;
  color: white;
  border: 2px solid white;
  padding: 8px 16px;
  font-family: ${fonts.retroText};
  cursor: pointer;
  box-shadow: 4px 4px 0 #000;
  
  &:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #000; }
  &:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #000; }
`;

// ==========================================
// TYPES & PROPS
// ==========================================
type LeaderboardType = 'season' | 'monthly' | 'weekly';

interface RetroLeaderboardProps {
  leaderboard?: LeaderboardEntry[];
  userStats?: UserStats | null;
  tickerMessages?: TickerMessage[];
  hotStreaks?: LeaderboardEntry[];
  powerups?: Record<string, number>;
  activePowerups?: string[];
  isLoading?: boolean;
  currentUserId?: number;
  onTypeChange?: (type: LeaderboardType) => void;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  onMyScore?: () => void;
  onPredict?: () => void;
  onUsePowerup?: (type: string) => Promise<void>;
  totalPages?: number;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function RetroLeaderboard({
  leaderboard,
  userStats,
  isLoading = false,
  currentUserId,
  onTypeChange,
  onPageChange,
  onRefresh,
  onMyScore,
  onPredict,
  totalPages = 5,
}: RetroLeaderboardProps) {

  const [showRules, setShowRules] = useState(false);

  const displayLeaderboard = leaderboard ?? [];

  return (
    <StadiumContainer>
      <ContentOverlay>
        <TitleWrapper>
          <Title>야구경기 예측 결과</Title>
          <CharacterFrame>
            <CharacterSprite src={mascotRight} alt="Mascot" />
          </CharacterFrame>
        </TitleWrapper>

        <ScoreboardWrapper>
          <ScoreboardBox>
            <ScoreboardInner>
              <AnimatePresence>
                {showRules && (
                  <RulesOverlay
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <h2 style={{ color: '#ffd700', fontFamily: fonts.retroText, marginBottom: '20px', textShadow: '2px 2px 0 #000' }}>
                      점수 산정 규칙
                    </h2>
                    <RulesTable>
                      <thead>
                        <tr>
                          <th>항목</th>
                          <th>점수</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>승리팀 적중</td>
                          <td>+100점</td>
                        </tr>
                        <tr>
                          <td>연승 보너스</td>
                          <td>기본점수 × 연승</td>
                        </tr>
                        <tr>
                          <td>이변 예측 (UPSET)</td>
                          <td>+50점</td>
                        </tr>
                        <tr>
                          <td>퍼펙트 데이</td>
                          <td>+200점</td>
                        </tr>
                      </tbody>
                    </RulesTable>
                    <p style={{ color: '#aaa', fontSize: '12px', fontFamily: fonts.retroText, marginBottom: '20px', textAlign: 'center' }}>
                      * 연승이 끊기면 연승 보너스는 초기화됩니다.<br />
                      * 파워업 아이템 사용 시 추가 배율이 적용됩니다.
                    </p>
                    <CloseButton onClick={() => setShowRules(false)}>닫기</CloseButton>
                  </RulesOverlay>
                )}
              </AnimatePresence>

              <TableHeader>
                <span>RANK</span>
                <span>PLAYER</span>
                <span>SCORE</span>
                <span>STREAK</span>
              </TableHeader>

              {isLoading ? (
                <EmptyStateContainer>
                  <EmptyStateBox>로딩중...</EmptyStateBox>
                </EmptyStateContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <AnimatePresence mode="popLayout">
                    {displayLeaderboard.map((entry, index) => (
                      <LeaderboardRow
                        key={entry.userId}
                        rank={index + 1}
                        entry={entry}
                        isCurrentUser={entry.userId === currentUserId}
                      />
                    ))}
                  </AnimatePresence>
                  {displayLeaderboard.length === 0 && (
                    <EmptyStateContainer>
                      <EmptyStateBox>데이터가 없습니다</EmptyStateBox>
                    </EmptyStateContainer>
                  )}
                </div>
              )}
            </ScoreboardInner>

            <ButtonGroup>
              <RetroActionButton onClick={onRefresh}>
                새로고침
              </RetroActionButton>
              <RetroActionButton onClick={() => setShowRules(true)}>
                규칙 확인
              </RetroActionButton>
              <RetroActionButton onClick={onPredict}>
                예측하기
              </RetroActionButton>
            </ButtonGroup>

            <InfoText>* 모든 점수는 경기 종료 후 30분 이내에 집계됩니다.</InfoText>

          </ScoreboardBox>

        </ScoreboardWrapper>
      </ContentOverlay>
    </StadiumContainer>
  );
}
