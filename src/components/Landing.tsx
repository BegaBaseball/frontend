import { useEffect } from 'react';

import landingCriticalCss from './Landing.css?inline';
import LandingHero from './landing/LandingHero';
import LandingTicker from './landing/LandingTicker';
import { requestLoadTrace } from '../utils/requestLoadTrace';

export default function Landing() {
  useEffect(() => {
    requestLoadTrace('Landing mount');
    return () => requestLoadTrace('Landing unmount');
  }, []);

  return (
    <main className="landing-page" data-testid="landing-page">
      <style>{landingCriticalCss}</style>
      <LandingTicker />
      <LandingHero />
    </main>
  );
}
