import type { CSSProperties } from 'react';

import { LaptopMockupProps } from '../types/landing';

export default function LaptopMockup({
  activeFeature,
  features,
  scrollProgress,
  scrollDistance,
  laptopRef
}: LaptopMockupProps) {
  const scrollOffset = `${scrollProgress * scrollDistance}px`;
  const sourceImage = features[activeFeature].mobileImage || features[activeFeature].image;
  const fallbackImage = features[activeFeature].image;

  return (
    <div
      ref={laptopRef}
      className="landing-scroll-frame sticky top-28"
      data-testid="landing-laptop-mockup"
      style={{ '--landing-scroll-offset': scrollOffset } as CSSProperties}
    >
      <div className="landing-mockup-shell">
        <div className="landing-mockup-accent" />

        <div className="landing-mockup-frame">
          <div className="landing-device-shell">
            <div className="landing-device-notch" />

            <div className="landing-mockup-screen">
              <img
                key={activeFeature}
                src={sourceImage}
                alt={features[activeFeature].title}
                className="h-full w-full object-contain animate-fade-in"
                onError={(event) => {
                  const target = event.currentTarget;
                  if (target.dataset.fallbacked !== '1') {
                    target.dataset.fallbacked = '1';
                    target.src = fallbackImage;
                  }
                }}
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
