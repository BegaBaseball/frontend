import { STADIUM_ASSET } from '../landingAssets';
import { LANDING_STADIUM_CHIPS, LANDING_STADIUM_DATA } from '../landingShowcaseData';

export default function LandingStadiumVignette() {
  return (
    <div className="landing-stadium-vignette">
      <ul className="landing-stadium-chips" aria-label="KBO 구장 가이드 예시">
        {LANDING_STADIUM_CHIPS.map((stadium, index) => (
          <li key={stadium}>
            <span
              className={index === 0 ? 'landing-stadium-chip-active' : undefined}
              data-testid="landing-stadium-chip"
            >
              {stadium}
            </span>
          </li>
        ))}
      </ul>

      <figure className="landing-vignette-card landing-stadium-card">
        <div className="landing-stadium-art">
          <img
            data-parallax="0.05"
            src={STADIUM_ASSET}
            alt={LANDING_STADIUM_DATA.imageAlt}
            width={640}
            height={360}
          />
          <figcaption>{LANDING_STADIUM_DATA.venue}</figcaption>
        </div>
        <dl className="landing-stadium-stats">
          {LANDING_STADIUM_DATA.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </figure>
    </div>
  );
}
