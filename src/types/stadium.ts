// src/types/stadium.ts
export interface Stadium {
  stadiumId: string;
  stadiumName: string;
  team?: string | null;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  phone?: string | null;
}

export interface Place {
  id: number;
  stadiumName: string;
  category: CategoryType | string;
  name: string;
  description?: string | null;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  phone?: string | null;
  rating: number | null;
  openTime?: string | null;
  closeTime?: string | null;
}

export type CategoryType = 'food' | 'delivery' | 'store' | 'parking';

export interface CategoryConfig {
  key: CategoryType;
  label: string;
  icon: import('lucide-react').LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}
