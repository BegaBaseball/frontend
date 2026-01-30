import styled, { keyframes } from 'styled-components';
import { useMemo } from 'react';
import { fonts, crispText, textOutline } from './RetroTheme';

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const TickerContainer = styled.div`
  background: linear-gradient(180deg, #1a0a1a 0%, #0a0a0a 100%);
  border-top: 2px solid #ff00ff;
  border-bottom: 2px solid #ff00ff;
  overflow: hidden;
  white-space: nowrap;
  padding: 10px 0;
  position: relative;

  /* Gradient fade on edges */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    z-index: 2;
    pointer-events: none;
  }

  &::before {
    left: 0;
    background: linear-gradient(90deg, #0a0a0a 0%, transparent 100%);
  }

  &::after {
    right: 0;
    background: linear-gradient(90deg, transparent 0%, #0a0a0a 100%);
  }
`;

const TickerTrack = styled.div<{ $duration: number }>`
  display: inline-flex;
  animation: ${scroll} ${props => props.$duration}s linear infinite;

  &:hover {
    animation-play-state: paused;
  }
`;

const TickerContent = styled.div`
  display: inline-flex;
  padding-right: 50px;
`;

const TickerItem = styled.span<{ $type: string }>`
  font-family: ${fonts.retroText};
  font-size: 12px;
  padding: 0 30px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.3px;
  ${crispText}
  ${textOutline}

  ${props => {
    switch (props.$type) {
      case 'fire':
        return `
          color: #ff6600;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(255, 102, 0, 0.5);
        `;
      case 'streak':
        return `
          color: #00ff00;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0, 255, 0, 0.5);
        `;
      case 'upset':
        return `
          color: #ff00ff;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(255, 0, 255, 0.5);
        `;
      case 'perfect':
        return `
          color: #ffd700;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(255, 215, 0, 0.5);
        `;
      case 'levelup':
        return `
          color: #00ffff;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0, 255, 255, 0.5);
        `;
      default:
        return `
          color: #cccccc;
        `;
    }
  }}

  .separator {
    color: #4a4a6a;
    margin: 0 10px;
  }
`;

const EmptyTicker = styled.div`
  font-family: ${fonts.retroText};
  font-size: 12px;
  color: #6a6a8a;
  text-align: center;
  padding: 0 20px;
  letter-spacing: -0.3px;
  ${crispText}
  ${textOutline}
`;

export interface TickerMessage {
  id: string;
  text: string;
  type: 'fire' | 'streak' | 'upset' | 'perfect' | 'levelup' | 'normal';
  timestamp?: number;
}

interface NewsTickerProps {
  messages: TickerMessage[];
  speed?: number; // pixels per second
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'fire': return '🔥';
    case 'streak': return '⚡';
    case 'upset': return '💥';
    case 'perfect': return '✨';
    case 'levelup': return '🆙';
    default: return '📢';
  }
}

export default function NewsTicker({ messages, speed = 50 }: NewsTickerProps) {
  // Calculate animation duration based on content length
  const duration = useMemo(() => {
    if (messages.length === 0) return 10;
    const totalChars = messages.reduce((acc, m) => acc + m.text.length, 0);
    // Roughly 8px per character + padding
    const totalWidth = totalChars * 8 + messages.length * 60;
    return totalWidth / speed;
  }, [messages, speed]);

  if (messages.length === 0) {
    return (
      <TickerContainer>
        <EmptyTicker>
          📡 실시간 업데이트 대기 중...
        </EmptyTicker>
      </TickerContainer>
    );
  }

  // Duplicate messages for seamless loop
  const duplicatedMessages = [...messages, ...messages];

  return (
    <TickerContainer>
      <TickerTrack $duration={duration}>
        <TickerContent>
          {duplicatedMessages.map((msg, index) => (
            <TickerItem key={`${msg.id}-${index}`} $type={msg.type}>
              <span>{getTypeIcon(msg.type)}</span>
              <span>{msg.text}</span>
              {index < duplicatedMessages.length - 1 && (
                <span className="separator">◆</span>
              )}
            </TickerItem>
          ))}
        </TickerContent>
      </TickerTrack>
    </TickerContainer>
  );
}
