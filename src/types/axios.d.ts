import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
    skipErrorReporting?: boolean;
    allowManualRetry?: boolean;
    skipAuthSessionHandling?: boolean;
  }
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
    skipErrorReporting?: boolean;
    allowManualRetry?: boolean;
    skipAuthSessionHandling?: boolean;
  }
}
