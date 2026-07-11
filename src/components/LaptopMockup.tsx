import type { LaptopMockupProps } from '../types/landing';

export default function LaptopMockup({
  activeFeature,
  features,
}: LaptopMockupProps) {
  const feature = features[activeFeature];
  const sourceImage = feature.mobileImage || feature.image;
  const fallbackImage = feature.image;

  return (
    <div
      className="landing-scroll-frame sticky top-28"
      data-testid="landing-laptop-mockup"
    >
      <div className="landing-preview-shell">
        <div className="landing-preview-header">
          <span>{feature.title}</span>
          <p>{feature.description}</p>
        </div>

        <div className="landing-preview-screen">
          <img
            key={activeFeature}
            src={sourceImage}
            alt={feature.title}
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
    </div>
  );
}
