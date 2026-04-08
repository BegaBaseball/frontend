import { lazy, Suspense } from 'react';

const ComboAnimation = lazy(() => import('../retro/ComboAnimation'));

export default function PredictionComboAnimationRuntime() {
  return (
    <Suspense fallback={null}>
      <ComboAnimation />
    </Suspense>
  );
}
