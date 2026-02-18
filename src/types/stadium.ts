// src/types/stadium.ts
export interface Stadium {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

export interface Place {
  id: number;
  stadiumName: string;
  category: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  rating: number | null;
  openTime: string;
  closeTime: string;
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