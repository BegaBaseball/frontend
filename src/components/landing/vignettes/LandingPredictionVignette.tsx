import { TEAM_ASSETS } from '../landingAssets';
import { LANDING_PREDICTION_DATA } from '../landingShowcaseData';

export default function LandingPredictionVignette() {
  return (
    <article className="landing-vignette-card landing-prediction-vignette">
      <header>
        <span>{LANDING_PREDICTION_DATA.heading}</span>
        <b>{LANDING_PREDICTION_DATA.badge}</b>
      </header>

      <div className="landing-prediction-matchup">
        <span className="landing-prediction-team landing-prediction-team-favored">
          <img
            src={TEAM_ASSETS[LANDING_PREDICTION_DATA.firstTeam]}
            alt={LANDING_PREDICTION_DATA.firstLabel}
            width={32}
            height={32}
          />
          <strong
            data-count={LANDING_PREDICTION_DATA.firstProbability}
            data-suffix="%"
          >
            {LANDING_PREDICTION_DATA.firstProbability}%
          </strong>
        </span>
        <i>VS</i>
        <span className="landing-prediction-team landing-prediction-team-away">
          <strong>{LANDING_PREDICTION_DATA.secondProbability}%</strong>
          <img
            src={TEAM_ASSETS[LANDING_PREDICTION_DATA.secondTeam]}
            alt={LANDING_PREDICTION_DATA.secondLabel}
            width={32}
            height={32}
          />
        </span>
      </div>

      <div
        className="landing-prediction-track"
        aria-label={`${LANDING_PREDICTION_DATA.firstLabel} 승리 확률 ${LANDING_PREDICTION_DATA.firstProbability}%`}
      >
        <i data-bar={`${LANDING_PREDICTION_DATA.firstProbability}%`} />
      </div>

      <ul className="landing-prediction-facts">
        {LANDING_PREDICTION_DATA.facts.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>
    </article>
  );
}
