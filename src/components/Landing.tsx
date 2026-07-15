import { useEffect } from 'react';

import landingCriticalCss from './Landing.css?inline';
import LandingAppPreview from './landing/LandingAppPreview';
import LandingHero from './landing/LandingHero';
import LandingTicker from './landing/LandingTicker';
import useLandingMotion from './landing/useLandingMotion';
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
    </main>
  );
}
