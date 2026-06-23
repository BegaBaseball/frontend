import { useState } from 'react';

import { LANDING_FEATURES } from '../constants/landing';
import { useLandingScroll } from '../hooks/useLandingScroll';
import FeatureCard from './FeatureCard';
import LaptopMockup from './LaptopMockup';
import { Container, Section, SectionHeader } from './ui/page-primitives';
import './LandingFeaturesRuntime.css';

export default function LandingFeaturesRuntime() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const {
    scrollProgress,
    scrollDistance,
    featureRefs,
    laptopRef,
    featuresContainerRef,
  } = useLandingScroll();

  const handleFeatureToggle = (index: number) => {
    setActiveFeature(index);
    setExpandedFeature((current) => (current === index ? null : index));
  };

  return (
    <Section id="features" className="bg-background" data-testid="landing-features">
      <Container>
        <SectionHeader
          eyebrow="주요 기능"
          title={
            <>
              비율과 간격을 정리해 한눈에 이해되는 야구 경험
            </>
          }
          description="모든 기능을 같은 리듬으로 배치해 무엇이 중요한지 빠르게 파악할 수 있도록 구성했습니다."
          measure="default"
          className="lg:mb-16"
        />

        <div
          className="landing-feature-layout"
          ref={featuresContainerRef}
          data-testid="landing-feature-layout"
        >
          <div className="space-y-6">
            {LANDING_FEATURES.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                isActive={activeFeature === index}
                isExpanded={expandedFeature === index}
                onToggle={() => handleFeatureToggle(index)}
                featureRef={(el) => {
                  featureRefs.current[index] = el;
                }}
              />
            ))}
          </div>

          <div className="hidden lg:block">
            <LaptopMockup
              activeFeature={activeFeature}
              features={LANDING_FEATURES}
              scrollProgress={scrollProgress}
              scrollDistance={scrollDistance}
              laptopRef={laptopRef}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
