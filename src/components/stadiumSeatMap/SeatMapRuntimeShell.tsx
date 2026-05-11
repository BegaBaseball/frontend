import { type ReactNode, Suspense } from 'react';

import {
  StadiumSeatMapErrorBoundary,
  StadiumSeatMapErrorFallback,
  StadiumSeatMapLoadingSkeleton,
} from '../StadiumSeatMapStates';
import type { StadiumSeatMapShellTemplate } from '../stadiumSeatMapRegistry';

interface SeatMapRuntimeShellProps {
  template: StadiumSeatMapShellTemplate;
  usesCoordinateGeometry: boolean;
  badgeLabel: string;
  stadiumName: string | null | undefined;
  resetKey: string;
  children: ReactNode;
}

export function SeatMapRuntimeShell({
  template,
  usesCoordinateGeometry,
  badgeLabel,
  stadiumName,
  resetKey,
  children,
}: SeatMapRuntimeShellProps) {
  const isJamsilTemplate = template === 'jamsil-template' && !usesCoordinateGeometry;

  if (isJamsilTemplate || template === 'legacy') {
    return (
      <StadiumSeatMapErrorBoundary
        resetKey={resetKey}
        fallback={(onRetry) => (
          <div data-testid="stadium-seat-map">
            <StadiumSeatMapErrorFallback
              stadiumName={stadiumName}
              onRetry={onRetry}
            />
          </div>
        )}
      >
        <Suspense
          fallback={(
            <div data-testid="stadium-seat-map">
              <StadiumSeatMapLoadingSkeleton
                label={badgeLabel}
                stadiumName={stadiumName}
              />
            </div>
          )}
        >
          {children}
        </Suspense>
      </StadiumSeatMapErrorBoundary>
    );
  }

  throw new Error('등록되지 않은 seat map shell template');
}
