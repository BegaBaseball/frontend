import type { ReactNode } from 'react';

import { LANDING_FEATURE_LABELS } from './landingShowcaseData';

export interface LandingFeatureSectionProps {
  number: '01' | '02' | '03' | '04' | '05' | '06';
  title: string;
  description: string;
  visual: ReactNode;
  visualFirst?: boolean;
  tone: 'muted' | 'plain';
}

export default function LandingFeatureSection({
  number,
  title,
  description,
  visual,
  visualFirst = false,
  tone,
}: LandingFeatureSectionProps) {
  const copyBlock = (
    <div className="landing-feature-copy" data-reveal="0" key="copy">
      <p className="landing-feature-label">
        {number} · {LANDING_FEATURE_LABELS[number]}
      </p>
      <h2 id={`landing-feature-${number}-title`}>{title}</h2>
      <p className="landing-feature-description">{description}</p>
    </div>
  );
  const visualBlock = (
    <div className="landing-feature-visual" data-reveal="120" key="visual">
      {visual}
    </div>
  );

  return (
    <section
      className={`landing-feature landing-feature-${tone}`}
      data-testid={`landing-feature-${number}`}
      aria-labelledby={`landing-feature-${number}-title`}
    >
      <div className="landing-feature-watermark" aria-hidden="true">{number}</div>
      <div className="landing-feature-inner" data-visual-first={visualFirst || undefined}>
        {visualFirst ? [visualBlock, copyBlock] : [copyBlock, visualBlock]}
      </div>
    </section>
  );
}
