import type { CSSProperties } from 'react';

import { LaptopMockupProps } from '../types/landing';

export default function LaptopMockup({
  activeFeature,
  features,
  scrollProgress,
  laptopRef
}: LaptopMockupProps) {
  return (
    <div
      ref={laptopRef}
      className="landing-scroll-frame sticky top-28"
      data-testid="landing-laptop-mockup"
      style={{ '--landing-scroll-offset': `${scrollProgress * 130}px` } as CSSProperties}
    >
      <div className="landing-mockup-shell">
        <div className="landing-mockup-accent" />

        <div className="landing-mockup-frame">
          <div className="landing-device-shell">
            <div className="landing-device-notch" />

            <div className="landing-mockup-screen">
              <img
                key={activeFeature}
                src={features[activeFeature].image}
                alt={features[activeFeature].title}
                className="h-full w-full object-contain animate-fade-in"
              />
            </div>
          </div>

          <div className="landing-device-base" />

          <div className="landing-device-shadow" />
        </div>
      </div>
    </div>
  );
}
