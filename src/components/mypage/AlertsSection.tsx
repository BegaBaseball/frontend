import NotificationPanel from '../NotificationPanel';

export default function AlertsSection() {
  return (
    <section data-screen-label="알림" data-testid="mypage-alerts-section">
      <div className="mypage-season-head">
        <div>
          <h1>알림</h1>
          <p>메이트, 응원석, 계정 보안 알림을 확인해요</p>
        </div>
      </div>

      <div className="mypage-season-panel p-0">
        <NotificationPanel />
      </div>
    </section>
  );
}
