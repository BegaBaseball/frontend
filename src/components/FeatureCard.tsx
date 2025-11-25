import { ChevronDown } from 'lucide-react';
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
    <div ref={featureRef}>
      <button
        onClick={onToggle}
        className="w-full text-left p-6 transition-all duration-300"
        style={{
          borderRadius: '1rem',
          backgroundColor: '#ffffff',
          boxShadow: isActive ? '0 4px 20px -5px rgba(0, 0, 0, 0.1)' : 'none',
          borderLeft: isActive ? '4px solid #10b981' : '4px solid transparent',
          border: isActive ? undefined : '1px solid #f3f4f6'
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="p-3 flex-shrink-0 transition-all duration-300"
            style={{
              borderRadius: '0.75rem',
              background: isActive
                ? 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)'
                : '#e5e7eb'
            }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: isActive ? 'white' : '#9ca3af' }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3
                className="mb-2"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#1a1a1a'
                }}
              >
                {feature.title}
              </h3>
              <ChevronDown
                className="w-5 h-5 transition-transform duration-300"
                style={{
                  color: '#9ca3af',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {feature.description}
            </p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div
          className="mt-4 p-6 animate-fade-in"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            marginLeft: '0'
          }}
        >
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>
            사용 가이드
          </h4>
          <ul className="space-y-4">
            {feature.guide.map((step, stepIndex) => (
              <li key={stepIndex} className="flex items-start gap-3" style={{ fontSize: '0.875rem', color: '#374151' }}>
                <span
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center"
                  style={{
                    borderRadius: '9999px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {stepIndex + 1}
                </span>
                <span style={{ paddingTop: '0.125rem', lineHeight: '1.5' }}>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}