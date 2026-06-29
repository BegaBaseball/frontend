import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../../lib/queryClient';

interface HomeQueryProviderProps {
  children: ReactNode;
}

export default function HomeQueryProvider({ children }: HomeQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
