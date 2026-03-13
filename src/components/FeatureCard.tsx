import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { FeatureCardProps } from '../types/landing';

export default function FeatureCard({
  feature,
  index,
  isActive,
  isExpanded,
  onToggle,
  featureRef
}: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <div ref={featureRef} className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        data-testid={`landing-feature-card-${index}`}
        className={cn(
          'landing-feature-card',
          isActive && 'landing-feature-card-active',
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'landing-feature-icon flex-shrink-0',
              isActive && 'landing-feature-icon-active',
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <h3 className="ds-card-title text-left">{feature.title}</h3>
              <ChevronDown
                className={cn(
                  'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
                  isExpanded && 'rotate-180',
                )}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="landing-feature-guide animate-fade-in">
          <h4 className="mb-4 text-base font-bold text-foreground">
            사용 가이드
          </h4>
          <ul className="space-y-4">
            {feature.guide.map((step, stepIndex) => (
              <li key={stepIndex} className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
                <span className="landing-step-badge flex-shrink-0">
                  {stepIndex + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
