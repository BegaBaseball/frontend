import { useEffect } from 'react';

import landingCriticalCss from './Landing.css?inline';
import LandingAppPreview from './landing/LandingAppPreview';
import LandingFeatureSection from './landing/LandingFeatureSection';
import LandingHero from './landing/LandingHero';
import LandingTicker from './landing/LandingTicker';
import { LANDING_PRIMARY_FEATURE_COPY } from './landing/landingShowcaseData';
import useLandingMotion from './landing/useLandingMotion';
import LandingCheerVignette from './landing/vignettes/LandingCheerVignette';
import LandingGameDataVignette from './landing/vignettes/LandingGameDataVignette';
import LandingPredictionVignette from './landing/vignettes/LandingPredictionVignette';
import { requestLoadTrace } from '../utils/requestLoadTrace';

export default function Landing() {
  useLandingMotion();

  useEffect(() => {
    requestLoadTrace('Landing mount');
    return () => requestLoadTrace('Landing unmount');
  }, []);

  return (
    <main className="landing-page" data-testid="landing-page">
      <style>{landingCriticalCss}</style>
      <LandingTicker />
      <LandingHero />
      <LandingAppPreview />
      <LandingFeatureSection
        number="01"
        title={LANDING_PRIMARY_FEATURE_COPY['01'].title}
        description={LANDING_PRIMARY_FEATURE_COPY['01'].description}
        visual={<LandingGameDataVignette />}
        tone="muted"
      />
      <LandingFeatureSection
        number="02"
        title={LANDING_PRIMARY_FEATURE_COPY['02'].title}
        description={LANDING_PRIMARY_FEATURE_COPY['02'].description}
        visual={<LandingPredictionVignette />}
        visualFirst
        tone="plain"
      />
      <LandingFeatureSection
        number="03"
        title={LANDING_PRIMARY_FEATURE_COPY['03'].title}
        description={LANDING_PRIMARY_FEATURE_COPY['03'].description}
        visual={<LandingCheerVignette />}
        tone="muted"
      />
    </main>
  );
}
