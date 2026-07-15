import { LANDING_START_GUIDE } from './landingShowcaseData';

export default function LandingStartGuide() {
  return (
    <section className="landing-start-guide" data-testid="landing-start-guide">
      <div className="landing-final-inner">
        <header className="landing-final-heading" data-reveal="0">
          <p className="landing-final-label">HOW TO START</p>
          <h2>시작은 3분이면 충분해요</h2>
        </header>

        <div className="landing-start-grid">
          {LANDING_START_GUIDE.map((step, index) => (
            <article data-reveal={String(index * 100)} key={step.number}>
              <span className="landing-start-number" aria-hidden="true">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
