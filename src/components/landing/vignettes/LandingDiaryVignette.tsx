import { LANDING_DIARY_DATA } from '../landingShowcaseData';

export default function LandingDiaryVignette() {
  return (
    <article className="landing-vignette-card landing-diary-vignette">
      <header>
        <h3>{LANDING_DIARY_DATA.heading}</h3>
        <strong>{LANDING_DIARY_DATA.summary}</strong>
      </header>

      <ol className="landing-diary-results" aria-label={`${LANDING_DIARY_DATA.heading} 결과`}>
        {LANDING_DIARY_DATA.results.map((result, index) => (
          <li
            className={`landing-diary-result-${result.tone}`}
            data-testid="landing-diary-result"
            key={`${result.label}-${index}`}
          >
            {result.label}
          </li>
        ))}
      </ol>

      <blockquote className="landing-diary-quote">
        <span>{LANDING_DIARY_DATA.quoteDate} · </span>
        <strong>{LANDING_DIARY_DATA.quoteResult}</strong>
        <span> — “{LANDING_DIARY_DATA.quote}”</span>
      </blockquote>
    </article>
  );
}
