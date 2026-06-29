import { cn } from '../lib/utils';
import type { FeatureCardProps } from '../types/landing';
import {
  BookOpenIcon,
  ChevronDownIcon,
  HomeIcon,
  LineChartIcon,
  MapPinIcon,
  MegaphoneIcon,
  UsersIcon,
} from './icons/PublicShellIcons';

const featureIconMap = {
  home: HomeIcon,
  megaphone: MegaphoneIcon,
  map: MapPinIcon,
  linechart: LineChartIcon,
  users: UsersIcon,
  book: BookOpenIcon,
} as const;

export default function FeatureCard({
  feature,
  index,
  isActive,
  isExpanded,
  onToggle,
  featureRef
}: FeatureCardProps) {
  const Icon = featureIconMap[feature.iconKey];
  const imageSource = feature.mobileImage || feature.image;
  const fallbackImage = feature.image;

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
              <ChevronDownIcon
                className={cn(
                  'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
                  isExpanded && 'rotate-180',
                )}
              />
            </div>
            <p className="mt-2 text-body leading-6 text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="landing-feature-guide animate-fade-in">
          <img
            src={imageSource}
            alt={feature.title}
            width={390}
            height={844}
            loading="lazy"
            decoding="async"
            className="landing-feature-mobile-image mb-3 h-auto w-full rounded-lg border border-white/10 bg-gray-100 object-contain lg:hidden"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.dataset.fallbacked !== '1') {
                target.dataset.fallbacked = '1';
                target.src = fallbackImage;
              }
            }}
          />
          <h4 className="mb-4 text-base font-bold text-foreground">
            사용 가이드
          </h4>
          <ul className="space-y-4">
            {feature.guide.map((step, stepIndex) => (
              <li key={stepIndex} className="flex items-start gap-3 text-body leading-6 text-foreground/80">
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
