import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
  }
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
  }
}
