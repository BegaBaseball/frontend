export const normalizePredictionDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.match(/^\s*(\d{4})(?:[.\-/])(\d{1,2})(?:[.\-/])(\d{1,2})(?:[T\s].*)?\s*$/);
  const candidate = normalized
    ? `${normalized[1]}-${normalized[2].padStart(2, '0')}-${normalized[3].padStart(2, '0')}`
    : trimmed;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }

  const parsedDate = new Date(`${candidate}T00:00:00.000`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const [year, month, day] = candidate.split('-').map(Number);
  if (
    parsedDate.getFullYear() !== year
    || parsedDate.getMonth() + 1 !== month
    || parsedDate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
};
