import { useState } from 'react';

import { LANDING_FEATURES } from '../constants/landing';
import FeatureCard from './FeatureCard';
import LaptopMockup from './LaptopMockup';
import { Container, Section, SectionHeader } from './ui/page-primitives';
import './LandingFeaturesRuntime.css';

export default function LandingFeaturesRuntime() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  const handleFeatureToggle = (index: number) => {
    setActiveFeature(index);
    setExpandedFeature((current) => (current === index ? null : index));
  };

  return (
    <Section id="features" className="landing-feature-section bg-background" data-testid="landing-features">
      <Container>
        <SectionHeader
          title={
            <>
              경기 전, 현장, 경기 후가 이어집니다
            </>
          }
          description="오늘 경기 확인, 예측, 메이트, 구장 가이드, 응원, 다이어리를 실제 사용 순서로 정리했습니다."
          measure="default"
          align="start"
          className="landing-feature-header lg:mb-16"
        />

        <div
          className="landing-feature-layout"
          data-testid="landing-feature-layout"
        >
          <div className="landing-feature-list">
            {LANDING_FEATURES.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                isActive={activeFeature === index}
                isExpanded={expandedFeature === index}
                onToggle={() => handleFeatureToggle(index)}
              />
            ))}
          </div>

          <div className="hidden lg:block">
            <LaptopMockup
              activeFeature={activeFeature}
              features={LANDING_FEATURES}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
