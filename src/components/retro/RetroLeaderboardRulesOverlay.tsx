interface RetroLeaderboardRulesOverlayProps {
  onClose: () => void;
}

export default function RetroLeaderboardRulesOverlay({
  onClose,
}: RetroLeaderboardRulesOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        borderRadius: '8px',
      }}
    >
      <h2
        style={{
          color: '#ffd700',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          margin: '0 0 20px',
          textShadow: '2px 2px 0 #000',
        }}
      >
        점수 산정 규칙
      </h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          color: '#fff',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          fontSize: '14px',
          marginBottom: '20px',
        }}
      >
        <thead>
          <tr>
            <th style={{ border: '2px solid #fff', padding: '10px', textAlign: 'center', background: '#333', color: '#ffd700' }}>항목</th>
            <th style={{ border: '2px solid #fff', padding: '10px', textAlign: 'center', background: '#333', color: '#ffd700' }}>점수</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['승리팀 적중', '+100점'],
            ['연승 보너스', '기본점수 × 연승'],
            ['이변 예측 (UPSET)', '+50점'],
            ['퍼펙트 데이', '+200점'],
            ['📸 좌석 시야 공유', '+50점 (첫 기여 +100점)'],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ border: '2px solid #fff', padding: '10px', textAlign: 'center' }}>{label}</td>
              <td style={{ border: '2px solid #fff', padding: '10px', textAlign: 'center' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          color: '#aaa',
          fontSize: '12px',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          margin: '0 0 20px',
          textAlign: 'center',
          lineHeight: 1.7,
        }}
      >
        * 연승이 끊기면 연승 보너스는 초기화됩니다.
        <br />
        * 파워업 아이템 사용 시 추가 배율이 적용됩니다.
        <br />
        * 다이어리에서 좌석 시야 사진을 올리면 포인트를 획득합니다.
      </p>
      <button
        type="button"
        className="retro-leaderboard-action-button"
        onClick={onClose}
        style={{ background: 'red' }}
      >
        닫기
      </button>
    </div>
  );
}
