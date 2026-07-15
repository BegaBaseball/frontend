import { TEAM_ASSETS } from '../landingAssets';
import { LANDING_GAME_DATA } from '../landingShowcaseData';

export default function LandingGameDataVignette() {
  const finalHomeScore = LANDING_GAME_DATA.scoreRoll.at(-1);

  return (
    <div className="landing-game-vignette">
      <article className="landing-vignette-card landing-game-score-card">
        <p className="landing-game-live">
          <i data-anim aria-hidden="true" />
          {LANDING_GAME_DATA.liveLabel}
        </p>

        <div
          className="landing-game-scoreboard"
          aria-label={`현재 점수 ${LANDING_GAME_DATA.homeLabel} ${finalHomeScore} 대 ${LANDING_GAME_DATA.awayLabel} ${LANDING_GAME_DATA.awayScore}`}
        >
          <span className="landing-vignette-team" aria-hidden="true">
            <img src={TEAM_ASSETS[LANDING_GAME_DATA.homeTeam]} alt="" width={36} height={36} />
            {LANDING_GAME_DATA.homeLabel}
          </span>

          <strong className="landing-game-score" aria-hidden="true">
            <span className="landing-game-score-window">
              <span className="landing-game-score-roll" data-anim>
                <span>{finalHomeScore}</span>
                {LANDING_GAME_DATA.scoreRoll.map((score, index) => (
                  <span key={`${score}-${index}`}>{score}</span>
                ))}
              </span>
            </span>
            <span className="landing-game-score-divider">:</span>
            <span>{LANDING_GAME_DATA.awayScore}</span>
          </strong>

          <span className="landing-vignette-team landing-vignette-team-away" aria-hidden="true">
            {LANDING_GAME_DATA.awayLabel}
            <img src={TEAM_ASSETS[LANDING_GAME_DATA.awayTeam]} alt="" width={36} height={36} />
          </span>
        </div>

        <div className="landing-game-innings" aria-label="9이닝 중 6이닝 진행">
          {LANDING_GAME_DATA.inningStates.map((completed, index) => (
            <i className={completed ? 'landing-game-inning-complete' : undefined} key={index} />
          ))}
        </div>
      </article>

      <article className="landing-vignette-card landing-game-standings-card">
        <h3>{LANDING_GAME_DATA.standingsLabel}</h3>
        <ol>
          {LANDING_GAME_DATA.standings.map((standing) => (
            <li key={standing.team}>
              <b>{standing.rank}</b>
              <img src={TEAM_ASSETS[standing.team]} alt="" width={22} height={22} />
              <strong>{standing.label}</strong>
              <span className="landing-game-standing-track" aria-hidden="true">
                <i data-bar={standing.barWidth} />
              </span>
              <span>{standing.rate}</span>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
