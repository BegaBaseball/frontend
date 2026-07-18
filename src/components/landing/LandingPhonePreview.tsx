import { BEGA_LOGO_ASSET, TEAM_ASSETS } from './landingAssets';
import { LANDING_PHONE_PREVIEW } from './landingShowcaseData';

export default function LandingPhonePreview() {
  return (
    <div className="landing-phone-screen">
      <div className="landing-phone-app-header">
        <img src={BEGA_LOGO_ASSET} alt="BEGA" width={38} height={20} />
        <span className="landing-phone-live">
          <i data-anim aria-hidden="true" />
          {LANDING_PHONE_PREVIEW.liveLabel}
        </span>
      </div>

      <article className="landing-phone-card landing-phone-score-card">
        <p className="landing-phone-card-kicker">{LANDING_PHONE_PREVIEW.game.status}</p>
        <div className="landing-phone-score-row">
          <span className="landing-phone-team">
            <img src={TEAM_ASSETS[LANDING_PHONE_PREVIEW.game.homeTeam]} alt="" width={26} height={26} />
            {LANDING_PHONE_PREVIEW.game.homeLabel}
          </span>
          <strong>
            {LANDING_PHONE_PREVIEW.game.homeScore} : {LANDING_PHONE_PREVIEW.game.awayScore}
          </strong>
          <span className="landing-phone-team landing-phone-team-away">
            {LANDING_PHONE_PREVIEW.game.awayLabel}
            <img src={TEAM_ASSETS[LANDING_PHONE_PREVIEW.game.awayTeam]} alt="" width={26} height={26} />
          </span>
        </div>
      </article>

      <article className="landing-phone-card landing-phone-prediction-card">
        <div className="landing-phone-card-heading">
          <span>{LANDING_PHONE_PREVIEW.prediction.heading}</span>
          <b>{LANDING_PHONE_PREVIEW.prediction.badge}</b>
        </div>
        <div className="landing-phone-prediction-value">
          <strong data-count={LANDING_PHONE_PREVIEW.prediction.probability} data-suffix="%">
            {LANDING_PHONE_PREVIEW.prediction.probability}%
          </strong>
          <span>{LANDING_PHONE_PREVIEW.prediction.resultLabel}</span>
        </div>
        <div
          className="landing-phone-progress"
          aria-label={`${LANDING_PHONE_PREVIEW.prediction.resultLabel} 확률 ${LANDING_PHONE_PREVIEW.prediction.probability}%`}
        >
          <i data-bar={`${LANDING_PHONE_PREVIEW.prediction.probability}%`} />
        </div>
      </article>

      <article className="landing-phone-card landing-phone-mate-card">
        <div className="landing-phone-card-heading">
          <span className="landing-phone-mate-title">
            <img src={TEAM_ASSETS[LANDING_PHONE_PREVIEW.mate.team]} alt="" width={18} height={18} />
            {LANDING_PHONE_PREVIEW.mate.matchup}
          </span>
          <b>{LANDING_PHONE_PREVIEW.mate.status}</b>
        </div>
        <p>{LANDING_PHONE_PREVIEW.mate.details}</p>
      </article>

      <article className="landing-phone-card landing-phone-cheer-card">
        <div className="landing-phone-author">
          <span aria-hidden="true">{LANDING_PHONE_PREVIEW.cheer.avatarLabel}</span>
          <strong>{LANDING_PHONE_PREVIEW.cheer.author}</strong>
          <time>{LANDING_PHONE_PREVIEW.cheer.time}</time>
        </div>
        <p>{LANDING_PHONE_PREVIEW.cheer.body}</p>
      </article>

      <article className="landing-phone-card landing-phone-standings-card">
        <p className="landing-phone-card-title">{LANDING_PHONE_PREVIEW.standings.heading}</p>
        <ol>
          {LANDING_PHONE_PREVIEW.standings.entries.map((entry) => (
            <li key={entry.rank}>
              <b>{entry.rank}</b>
              <img src={TEAM_ASSETS[entry.team]} alt="" width={16} height={16} />
              <span>{entry.label}</span>
              <strong>{entry.rate}</strong>
            </li>
          ))}
        </ol>
      </article>

      <nav className="landing-phone-tabs" aria-label="앱 화면 예시 메뉴">
        {LANDING_PHONE_PREVIEW.tabs.map((tab, index) => (
          <span className={index === 0 ? 'landing-phone-tab-active' : undefined} key={tab}>
            {tab}
          </span>
        ))}
      </nav>
    </div>
  );
}
