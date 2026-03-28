import { CSSProperties, useMemo } from 'react';

const retroText = "'Galmuri11', 'Galmuri9', sans-serif";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const newsTickerStyles = `
  @keyframes retroNewsTickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .retro-news-ticker-track:hover {
    animation-play-state: paused;
  }
`;

const getTickerColorStyle = (type: TickerMessage['type']): CSSProperties => {
  switch (type) {
    case 'fire':
      return {
        color: '#ff6600',
        textShadow: `${textOutline}, 0 0 8px rgba(255, 102, 0, 0.5)`,
      };
    case 'streak':
      return {
        color: '#00ff00',
        textShadow: `${textOutline}, 0 0 8px rgba(0, 255, 0, 0.5)`,
      };
    case 'upset':
      return {
        color: '#ff00ff',
        textShadow: `${textOutline}, 0 0 8px rgba(255, 0, 255, 0.5)`,
      };
    case 'perfect':
      return {
        color: '#ffd700',
        textShadow: `${textOutline}, 0 0 8px rgba(255, 215, 0, 0.5)`,
      };
    case 'levelup':
      return {
        color: '#00ffff',
        textShadow: `${textOutline}, 0 0 8px rgba(0, 255, 255, 0.5)`,
      };
    default:
      return {
        color: '#cccccc',
        textShadow: textOutline,
      };
  }
};

export interface TickerMessage {
  id: string;
  text: string;
  type: 'fire' | 'streak' | 'upset' | 'perfect' | 'levelup' | 'normal';
  timestamp?: number;
}

interface NewsTickerProps {
  messages: TickerMessage[];
  speed?: number;
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
  const duration = useMemo(() => {
    if (messages.length === 0) return 10;
    const totalChars = messages.reduce((acc, message) => acc + message.text.length, 0);
    const totalWidth = totalChars * 8 + messages.length * 60;
    return totalWidth / speed;
  }, [messages, speed]);

  const containerStyle: CSSProperties = {
    background: 'linear-gradient(180deg, #1a0a1a 0%, #0a0a0a 100%)',
    borderTop: '2px solid #ff00ff',
    borderBottom: '2px solid #ff00ff',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    padding: '10px 0',
    position: 'relative',
    width: '90%',
    maxWidth: '800px',
    marginBottom: '20px',
  };

  if (messages.length === 0) {
    return (
      <div style={containerStyle}>
        <style>{newsTickerStyles}</style>
        <div
          style={{
            fontFamily: retroText,
            fontSize: '12px',
            color: '#6a6a8a',
            textAlign: 'center',
            padding: '0 20px',
            letterSpacing: '-0.3px',
            textShadow: textOutline,
            imageRendering: 'pixelated',
          }}
        >
          📡 실시간 업데이트 대기 중...
        </div>
      </div>
    );
  }

  const duplicatedMessages = [...messages, ...messages];

  return (
    <div style={containerStyle}>
      <style>{newsTickerStyles}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: '40px',
          zIndex: 2,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, #0a0a0a 0%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 0 0 auto',
          width: '40px',
          zIndex: 2,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, #0a0a0a 100%)',
        }}
      />
      <div
        className="retro-news-ticker-track"
        style={{
          display: 'inline-flex',
          animation: `retroNewsTickerScroll ${duration}s linear infinite`,
        }}
      >
        <div style={{ display: 'inline-flex', paddingRight: '50px' }}>
          {duplicatedMessages.map((message, index) => (
            <span
              key={`${message.id}-${index}`}
              style={{
                ...getTickerColorStyle(message.type),
                fontFamily: retroText,
                fontSize: '12px',
                padding: '0 30px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '-0.3px',
                imageRendering: 'pixelated',
              }}
            >
              <span>{getTypeIcon(message.type)}</span>
              <span>{message.text}</span>
              {index < duplicatedMessages.length - 1 && (
                <span style={{ color: '#4a4a6a', margin: '0 10px' }}>◆</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
