import { useEffect } from 'react';

import { LANDING_OFFSEASON_DATA } from './landingShowcaseData';

const PRESS_START_FONT_ID = 'retro-font-press-start';
const PRESS_START_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';

export default function LandingOffseason() {
  useEffect(() => {
    if (document.getElementById(PRESS_START_FONT_ID)) return;

    const link = document.createElement('link');
    link.id = PRESS_START_FONT_ID;
    link.rel = 'stylesheet';
    link.href = PRESS_START_FONT_HREF;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);

  const { description, insight, label, retro, title } = LANDING_OFFSEASON_DATA;

  return (
    <section className="landing-offseason" data-testid="landing-offseason">
      <div className="landing-final-inner">
        <header className="landing-final-heading" data-reveal="0">
          <p className="landing-final-label">{label}</p>
          <h2>{title}</h2>
          <p className="landing-final-description">{description}</p>
        </header>

        <div className="landing-offseason-grid">
          <article
            className="landing-offseason-card landing-offseason-insight"
            data-fixed-theme
            data-reveal="0"
          >
            <div className="landing-offseason-card-glow" aria-hidden="true" />
            <div className="landing-offseason-card-content">
              <p className="landing-offseason-card-label">{insight.label}</p>
              <h3>{insight.title}</h3>
              <p>{insight.description}</p>
              <div className="landing-offseason-chips" aria-label="오프시즌 인사이트 종류">
                {insight.chips.map((chip) => (
                  <span data-testid="landing-offseason-chip" key={chip}>{chip}</span>
                ))}
              </div>
            </div>
          </article>

          <article
            className="landing-offseason-card landing-retro-card"
            data-fixed-theme
            data-reveal="120"
            data-testid="landing-retro-card"
          >
            <p className="landing-retro-label">{retro.label}</p>
            <h3>{retro.title}</h3>
            <p>{retro.description}</p>
            <ol className="landing-retro-leaderboard" data-testid="landing-retro-leaderboard">
              {retro.leaderboard.map((entry) => (
                <li className={`landing-retro-entry-${entry.tone}`} key={entry.rank}>
                  <span>{entry.rank}. {entry.handle}</span>
                  <span>{entry.rate}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  );
}
