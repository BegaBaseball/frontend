import LandingPhonePreview from './LandingPhonePreview';

const PREVIEW_POINTS = [
  '실시간 스코어 · 푸시처럼 빠른 갱신',
  '팀별 응원 피드 · 좋아요와 팔로우',
  '같이가요 매칭 · 신청부터 채팅까지',
] as const;

export default function LandingAppPreview() {
  return (
    <section className="landing-app-preview" data-testid="landing-app-preview">
      <div className="landing-app-preview-glow" aria-hidden="true" />
      <div className="landing-app-preview-inner">
        <div className="landing-app-preview-copy" data-reveal="0">
          <p className="landing-app-preview-kicker">APP PREVIEW</p>
          <h2>
            주머니 속의<br />
            야구장
          </h2>
          <p className="landing-app-preview-description">
            출근길엔 어젯밤 하이라이트, 점심엔 승리 확률, 퇴근길엔 오늘의 라인업.
            데스크톱과 모바일 어디서든 같은 경험입니다.
          </p>
          <ul>
            {PREVIEW_POINTS.map((point) => (
              <li key={point}>
                <i aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-app-preview-phone" data-reveal="120">
          <div className="landing-phone-scale">
            <figure className="landing-phone-frame" data-testid="landing-phone" aria-label="BEGA 앱 홈 화면 예시">
              <div className="landing-phone-notch" aria-hidden="true" />
              <div className="landing-phone-status" aria-hidden="true">
                <span>9:41</span>
                <span className="landing-phone-status-icons">
                  <i className="landing-phone-signal"><b /><b /><b /><b /></i>
                  <i className="landing-phone-network">5G</i>
                  <i className="landing-phone-battery"><b /></i>
                </span>
              </div>
              <div className="landing-phone-viewport">
                <LandingPhonePreview />
              </div>
              <div className="landing-phone-home-indicator" aria-hidden="true" />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
