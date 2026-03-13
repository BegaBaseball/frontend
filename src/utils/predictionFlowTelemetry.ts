import type { PredictionRunEvent, PredictionFlowEventName } from '../types/predictionFlow';

export type PredictionFlowEventPayload = Omit<PredictionRunEvent, 'eventName'>;

export const emitPredictionFlowEvent = (
  eventName: PredictionFlowEventName,
  event: PredictionFlowEventPayload
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('prediction-flow:event', {
      detail: {
        eventName,
        ...event,
        timestamp: new Date().toISOString(),
        source: 'prediction-page',
      },
    })
  );
};
