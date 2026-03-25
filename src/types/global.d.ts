interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

type IdleRequestCallback = (deadline: IdleDeadline) => void;

interface IdleRequestOptions {
  timeout?: number;
}

interface Window {
  requestIdleCallback(callback: IdleRequestCallback, options?: IdleRequestOptions): number;
  cancelIdleCallback(handle: number): void;
}
