import type { ComponentType, SVGProps } from 'react';

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
export type StadiumCategoryIconKey = 'utensils' | 'truck' | 'shoppingBag' | 'parkingCircle';
export type StadiumIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface CategoryConfig {
  key: CategoryType;
  label: string;
  iconKey: StadiumCategoryIconKey;
  color: string;
  bgColor: string;
  borderColor: string;
}
