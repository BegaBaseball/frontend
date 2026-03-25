import styled from 'styled-components';
import { motion } from 'framer-motion';

const GaugeContainer = styled.div`
  margin: 20px 0;
  padding: 0 10px;
`;

const GaugeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 8px;

  @media (max-width: 640px) {
    align-items: flex-start;
    gap: 8px;
  }
`;

const TeamInfo = styled.div<{ $color: string; $align: 'left' | 'right' }>`
  flex: 1 1 0;
  min-width: 0;
  text-align: ${(props) => props.$align};

  .name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #9ca3af;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .countRow {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: ${(props) => (props.$align === 'right' ? 'flex-end' : 'flex-start')};
    gap: 4px;
  }

  .countValue {
    font-size: 1.2rem;
    font-weight: 800;
    color: ${(props) => props.$color};
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .percent {
    font-size: 0.9rem;
    opacity: 0.7;
    line-height: 1;
  }

  @media (max-width: 640px) {
    .name {
      font-size: 0.76rem;
    }

    .countRow {
      flex-direction: column;
      align-items: ${(props) => (props.$align === 'right' ? 'flex-end' : 'flex-start')};
      gap: 2px;
    }

    .countValue {
      font-size: 1rem;
    }

    .percent {
      font-size: 0.72rem;
    }
  }
`;

const ProgressBarWrapper = styled.div`
  height: 16px;
  background: #2a2d35;
  border-radius: 20px;
  display: flex;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
`;

const GaugeBar = styled(motion.div)<{ color: string }>`
  height: 100%;
  background: ${(props) => props.color};
  position: relative;
`;

const CenterSlash = styled(motion.div)`
  position: absolute;
  top: 0;
  transform: translateX(-50%) skewX(-20deg);
  width: 4px;
  height: 100%;
  background: white;
  z-index: 2;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

interface VotePercentageGaugeProps {
  awayColor: string;
  homeColor: string;
  awayTeamName: string;
  homeTeamName: string;
  awayVotes: number;
  homeVotes: number;
  awayPercent: number;
  homePercent: number;
  cheeringCaption: string;
  cheeringTotal: number;
}

export function VotePercentageGauge({
  awayColor,
  homeColor,
  awayTeamName,
  homeTeamName,
  awayVotes,
  homeVotes,
  awayPercent,
  homePercent,
  cheeringCaption,
  cheeringTotal,
}: VotePercentageGaugeProps) {
  return (
    <GaugeContainer>
      <GaugeHeader>
        <TeamInfo $color={awayColor} $align="left">
          <div className="name">{awayTeamName} 응원</div>
          <div className="countRow">
            <span className="countValue">{awayVotes.toLocaleString()}</span>
            <span className="percent">({awayPercent.toFixed(1)}%)</span>
          </div>
        </TeamInfo>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ fontSize: '1.2rem', paddingBottom: '5px' }}
          aria-hidden
        >
          🔥
        </motion.div>
        <TeamInfo $color={homeColor} $align="right">
          <div className="name">{homeTeamName} 응원</div>
          <div className="countRow">
            <span className="countValue">{homeVotes.toLocaleString()}</span>
            <span className="percent">({homePercent.toFixed(1)}%)</span>
          </div>
        </TeamInfo>
      </GaugeHeader>
      <ProgressBarWrapper>
        <GaugeBar
          color={awayColor}
          initial={{ width: '50%' }}
          animate={{ width: `${awayPercent}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <CenterSlash
          initial={{ left: '50%' }}
          animate={{ left: `${awayPercent}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <GaugeBar
          color={homeColor}
          initial={{ width: '50%' }}
          animate={{ width: `${homePercent}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
      </ProgressBarWrapper>
      <div data-testid="cheering-gauge-caption" className="mt-2 text-center text-[12px] text-gray-500 dark:text-gray-300">
        {cheeringCaption}: {cheeringTotal.toLocaleString()}명
      </div>
    </GaugeContainer>
  );
}
