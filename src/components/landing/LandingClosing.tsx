import { BEGA_LOGO_ASSET, BEGA_MASCOT_ASSET } from './landingAssets';
import { LANDING_CLOSING_COPY } from './landingShowcaseData';

export default function LandingClosing() {
  return (
    <section
      className="landing-closing"
      data-fixed-theme
      data-testid="landing-closing"
    >
      <div className="landing-closing-glow" aria-hidden="true" />
      <div className="landing-closing-inner" data-reveal="0">
        <img
          className="landing-closing-mascot"
          data-anim
          data-testid="landing-closing-mascot"
          src={BEGA_MASCOT_ASSET}
          alt="BEGA 마스코트"
          width={104}
          height={109}
        />
        <h2>{LANDING_CLOSING_COPY.title}</h2>
        <p>{LANDING_CLOSING_COPY.description}</p>
        <div className="landing-closing-logo-chip" data-testid="landing-closing-logo-chip">
          <img src={BEGA_LOGO_ASSET} alt="BEGA" width={21} height={22} />
          <span>BASEBALL GUIDE</span>
        </div>
      </div>
    </section>
  );
}
