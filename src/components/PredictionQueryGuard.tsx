import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { sanitizePredictionDeepLinkParams } from '@/utils/predictionDeepLink';

export default function PredictionQueryGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/prediction' && location.pathname !== '/prediction/') {
      return;
    }

    const next = new URLSearchParams(location.search ?? '');
    const rawGameId = (next.get('gameId') || '').trim();
    const rawDate = (next.get('date') || '').trim();
    const { nextSearchParams, hasChange } = sanitizePredictionDeepLinkParams(next, rawGameId, rawDate);

    if (!hasChange) {
      return;
    }

    const nextSearch = nextSearchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  return null;
}
