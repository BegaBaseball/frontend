import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isValidPredictionDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export default function PredictionQueryGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/prediction' && location.pathname !== '/prediction/') {
      return;
    }

    const next = new URLSearchParams(location.search ?? '');
    let changed = false;
    const rawGameId = (next.get('gameId') || '').trim();

    if (rawGameId && !PREDICTION_GAME_ID_PATTERN.test(rawGameId)) {
      next.delete('gameId');
      changed = true;
    } else if (rawGameId && rawGameId !== next.get('gameId')) {
      next.set('gameId', rawGameId);
      changed = true;
    }

    const rawDate = (next.get('date') || '').trim();
    if (rawDate && !isValidPredictionDate(rawDate)) {
      next.delete('date');
      changed = true;
    } else if (rawDate && rawDate !== next.get('date')) {
      next.set('date', rawDate);
      changed = true;
    }

    if (!changed) {
      return;
    }

    const nextSearch = next.toString();
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
