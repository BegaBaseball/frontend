import { LucideIcon } from 'lucide-react';

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  guide: string[];
}

export interface FeatureCardProps {
  feature: Feature;
  index: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  featureRef: (el: HTMLDivElement | null) => void;
}

export interface LaptopMockupProps {
  activeFeature: number;
  features: Feature[];
  scrollProgress: number;
  laptopRef: React.RefObject<HTMLDivElement | null>;
}