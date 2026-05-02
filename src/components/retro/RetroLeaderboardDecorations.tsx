import stadiumBg from '../../assets/images/stadium_bg.webp';

export default function RetroLeaderboardDecorations() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${stadiumBg})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
