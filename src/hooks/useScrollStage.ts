import { useEffect, useState } from 'react';

export function useScrollStage(): 0 | 1 | 2 {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const next: 0 | 1 | 2 = y < 20 ? 0 : y < 80 ? 1 : 2;
      setStage((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return stage;
}
