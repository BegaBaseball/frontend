import { BEGA_LOGO_ASSET, TEAM_ASSETS } from './landingAssets';

const PHONE_TABS = ['홈', '경기', '같이가요', '응원', 'MY'] as const;

export default function LandingPhonePreview() {
  return (
    <div className="landing-phone-screen">
      <div className="landing-phone-app-header">
        <img src={BEGA_LOGO_ASSET} alt="BEGA" width={38} height={20} />
        <span className="landing-phone-live">
          <i data-anim aria-hidden="true" />
          LIVE
        </span>
      </div>

      <article className="landing-phone-card landing-phone-score-card">
        <p className="landing-phone-card-kicker">LIVE · 7회말 · 잠실</p>
        <div className="landing-phone-score-row">
          <span className="landing-phone-team">
            <img src={TEAM_ASSETS.lg} alt="" width={26} height={26} />
            LG
          </span>
          <strong>5 : 2</strong>
          <span className="landing-phone-team landing-phone-team-away">
            두산
            <img src={TEAM_ASSETS.doosan} alt="" width={26} height={26} />
          </span>
        </div>
      </article>

      <article className="landing-phone-card landing-phone-prediction-card">
        <div className="landing-phone-card-heading">
          <span>오늘의 승리 확률</span>
          <b>AI 코치</b>
        </div>
        <div className="landing-phone-prediction-value">
          <strong data-count="64" data-suffix="%">64%</strong>
          <span>LG 승리</span>
        </div>
        <div className="landing-phone-progress" aria-label="LG 승리 확률 64%">
          <i data-bar="64%" />
        </div>
      </article>

      <article className="landing-phone-card landing-phone-mate-card">
        <div className="landing-phone-card-heading">
          <span className="landing-phone-mate-title">
            <img src={TEAM_ASSETS.lg} alt="" width={18} height={18} />
            LG vs 두산 · 잠실
          </span>
          <b>모집 중</b>
        </div>
        <p>10.26(일) 18:30 · 2/4명 · 3루 응원석</p>
      </article>

      <article className="landing-phone-card landing-phone-cheer-card">
        <div className="landing-phone-author">
          <span aria-hidden="true">직</span>
          <strong>직관러버</strong>
          <time>21:42</time>
        </div>
        <p>9회말 끝내기라니. 오늘 잠실 온 보람 있다 진짜</p>
      </article>

      <article className="landing-phone-card landing-phone-standings-card">
        <p className="landing-phone-card-title">팀 순위</p>
        <ol>
          <li>
            <b>1</b>
            <img src={TEAM_ASSETS.lg} alt="" width={16} height={16} />
            <span>LG</span>
            <strong>0.618</strong>
          </li>
          <li>
            <b>2</b>
            <img src={TEAM_ASSETS.kia} alt="" width={16} height={16} />
            <span>KIA</span>
            <strong>0.577</strong>
          </li>
        </ol>
      </article>

      <nav className="landing-phone-tabs" aria-label="앱 화면 예시 메뉴">
        {PHONE_TABS.map((tab, index) => (
          <span className={index === 0 ? 'landing-phone-tab-active' : undefined} key={tab}>
            {tab}
          </span>
        ))}
      </nav>
    </div>
  );
}
