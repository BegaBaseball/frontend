declare module 'react-helmet-async' {
  import type { PropsWithChildren, ReactNode } from 'react';

  export type HelmetProps = PropsWithChildren<{
    prioritizeSeoTags?: boolean;
  }>;

  export function HelmetProvider(props: PropsWithChildren): ReactNode;
  export function Helmet(props: HelmetProps): ReactNode;
}
