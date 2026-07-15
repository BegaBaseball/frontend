import { useEffect } from 'react';

import landingCriticalCss from './Landing.css?inline';
import LandingAppPreview from './landing/LandingAppPreview';
import LandingClosing from './landing/LandingClosing';
import LandingFeatureSection from './landing/LandingFeatureSection';
import LandingHero from './landing/LandingHero';
import LandingOffseason from './landing/LandingOffseason';
import LandingStartGuide from './landing/LandingStartGuide';
import LandingTicker from './landing/LandingTicker';
import {
  LANDING_PRIMARY_FEATURE_COPY,
  LANDING_SECONDARY_FEATURE_COPY,
} from './landing/landingShowcaseData';
import useLandingMotion from './landing/useLandingMotion';
import LandingCheerVignette from './landing/vignettes/LandingCheerVignette';
import LandingDiaryVignette from './landing/vignettes/LandingDiaryVignette';
import LandingGameDataVignette from './landing/vignettes/LandingGameDataVignette';
import LandingMateVignette from './landing/vignettes/LandingMateVignette';
import LandingPredictionVignette from './landing/vignettes/LandingPredictionVignette';
import LandingStadiumVignette from './landing/vignettes/LandingStadiumVignette';
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
      <LandingFeatureSection
        number="04"
        title={LANDING_SECONDARY_FEATURE_COPY['04'].title}
        description={LANDING_SECONDARY_FEATURE_COPY['04'].description}
        visual={<LandingMateVignette />}
        visualFirst
        tone="plain"
      />
      <LandingFeatureSection
        number="05"
        title={LANDING_SECONDARY_FEATURE_COPY['05'].title}
        description={LANDING_SECONDARY_FEATURE_COPY['05'].description}
        visual={<LandingStadiumVignette />}
        tone="muted"
      />
      <LandingFeatureSection
        number="06"
        title={LANDING_SECONDARY_FEATURE_COPY['06'].title}
        description={LANDING_SECONDARY_FEATURE_COPY['06'].description}
        visual={<LandingDiaryVignette />}
        visualFirst
        tone="plain"
      />
      <LandingOffseason />
      <LandingStartGuide />
      <LandingClosing />
    </main>
  );
}
