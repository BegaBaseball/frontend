import { useEffect, useLayoutEffect } from 'react';
import type { SeatMapPan } from './seatMapCommonTypes';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface TrackedPointer {
  clientX: number;
  clientY: number;
  pointerType: string;
}

export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function clampPan(pan: SeatMapPan, zoom: number, viewport: ViewportSize): SeatMapPan {
  if (zoom <= 1 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 };
  }

  const maxX = (viewport.width * (zoom - 1)) / 2;
  const maxY = (viewport.height * (zoom - 1)) / 2;

  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

export function clampZoom(value: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

export function readViewportSize(node: HTMLDivElement | null): ViewportSize {
  if (!node) {
    return { width: 0, height: 0 };
  }

  const rect = node.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

export function getPointerDistance(first: TrackedPointer, second: TrackedPointer): number {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

export function getPointerMidpoint(
  first: TrackedPointer,
  second: TrackedPointer,
  node: HTMLDivElement,
): ViewportPoint {
  const rect = node.getBoundingClientRect();
  return {
    x: (first.clientX + second.clientX) / 2 - rect.left,
    y: (first.clientY + second.clientY) / 2 - rect.top,
  };
}

export function panForZoomAtPoint(
  currentPan: SeatMapPan,
  currentZoom: number,
  nextZoom: number,
  point: ViewportPoint,
  viewport: ViewportSize,
): SeatMapPan {
  if (nextZoom <= 1 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 };
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const pointDeltaX = point.x - centerX;
  const pointDeltaY = point.y - centerY;
  const safeCurrentZoom = Math.max(currentZoom, 0.01);
  const contentDeltaX = (pointDeltaX - currentPan.x) / safeCurrentZoom;
  const contentDeltaY = (pointDeltaY - currentPan.y) / safeCurrentZoom;

  return clampPan(
    {
      x: pointDeltaX - contentDeltaX * nextZoom,
      y: pointDeltaY - contentDeltaY * nextZoom,
    },
    nextZoom,
    viewport,
  );
}
