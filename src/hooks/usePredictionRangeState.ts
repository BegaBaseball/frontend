import { useCallback, useRef, useState } from 'react';
import type { RangeLoadState } from './predictionHookShared';

/**
 * Manages the range loading UI state for the prediction schedule:
 * past/future load states, error messages, and whether more data can be loaded.
 *
 * All state is self-contained — no external refs are accepted. The hook exposes
 * both the React state values (for rendering) and the backing refs (for use
 * inside async callbacks that run after potential unmounts / re-renders).
 */
export const usePredictionRangeState = () => {
  const [pastRangeLoadState, setPastRangeLoadState] = useState<RangeLoadState>('idle');
  const [pastRangeLoadErrorMessage, setPastRangeLoadErrorMessage] = useState<string | null>(null);
  const [futureRangeLoadState, setFutureRangeLoadState] = useState<RangeLoadState>('idle');
  const [futureRangeLoadErrorMessage, setFutureRangeLoadErrorMessage] = useState<string | null>(null);
  const [canLoadMorePast, setCanLoadMorePast] = useState(true);
  const [canLoadMoreFuture, setCanLoadMoreFuture] = useState(true);

  const canLoadMoreFutureRef = useRef(true);
  const canLoadMorePastRef = useRef(true);
  const pastLoadActiveRef = useRef(false);
  const futureLoadActiveRef = useRef(false);

  const setCanLoadMoreFutureState = useCallback((next: boolean) => {
    canLoadMoreFutureRef.current = next;
    setCanLoadMoreFuture(next);
  }, []);

  const setCanLoadMorePastState = useCallback((next: boolean) => {
    canLoadMorePastRef.current = next;
    setCanLoadMorePast(next);
  }, []);

  const setPastRangeEnd = useCallback((message: string = '더 이상 이전 경기가 없습니다.') => {
    setCanLoadMorePastState(false);
    setPastRangeLoadErrorMessage(message);
    setPastRangeLoadState('end');
  }, [setCanLoadMorePastState]);

  const setFutureRangeEnd = useCallback((message: string = '더 이상 예정 경기가 없습니다.') => {
    setCanLoadMoreFutureState(false);
    setFutureRangeLoadErrorMessage(message);
    setFutureRangeLoadState('end');
  }, [setCanLoadMoreFutureState]);

  const restorePastRangeLoadState = useCallback(() => {
    setPastRangeLoadState(canLoadMorePastRef.current ? 'ready' : 'end');
    setPastRangeLoadErrorMessage(canLoadMorePastRef.current ? null : '더 이상 이전 경기가 없습니다.');
  }, []);

  const restoreFutureRangeLoadState = useCallback(() => {
    setFutureRangeLoadState(canLoadMoreFutureRef.current ? 'ready' : 'end');
    setFutureRangeLoadErrorMessage(canLoadMoreFutureRef.current ? null : '더 이상 예정 경기가 없습니다.');
  }, []);

  return {
    // React state — use these in JSX/rendering
    pastRangeLoadState,
    setPastRangeLoadState,
    pastRangeLoadErrorMessage,
    setPastRangeLoadErrorMessage,
    futureRangeLoadState,
    setFutureRangeLoadState,
    futureRangeLoadErrorMessage,
    setFutureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    // Refs — use these inside async callbacks to avoid stale closures
    canLoadMoreFutureRef,
    canLoadMorePastRef,
    pastLoadActiveRef,
    futureLoadActiveRef,
    // Actions
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    setPastRangeEnd,
    setFutureRangeEnd,
    restorePastRangeLoadState,
    restoreFutureRangeLoadState,
  };
};
