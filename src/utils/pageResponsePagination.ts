export type PageResponseLike = {
  content?: readonly unknown[];
  last?: boolean;
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  page?: PageResponseMetaLike;
};

export type NormalizedPageResponseMeta = {
  last: boolean;
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type PageResponseMetaLike = {
  number?: number | string;
  size?: number | string;
  totalElements?: number | string;
  totalPages?: number | string;
};

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeOptionalNumber = (value: unknown): number | undefined => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

export const normalizePageResponseMeta = (
  payload: PageResponseLike,
  contentLength: number,
): NormalizedPageResponseMeta => {
  const pageMeta = payload.page ?? {};
  const rawSize = pageMeta.size ?? payload.size;
  const rawTotalElements = pageMeta.totalElements ?? payload.totalElements;
  const rawTotalPages = pageMeta.totalPages ?? payload.totalPages;
  const size = normalizeNumber(rawSize, contentLength);
  const number = normalizeNumber(pageMeta.number ?? payload.number, 0);
  const explicitTotalElements = normalizeOptionalNumber(rawTotalElements);
  const explicitTotalPages = normalizeOptionalNumber(rawTotalPages);
  const derivedTotalPages = explicitTotalPages ?? (
    explicitTotalElements !== undefined && size > 0
      ? Math.ceil(explicitTotalElements / size)
      : undefined
  );
  const isShortPage = size > 0 && contentLength < size;
  const isEmptyUnknownPage = contentLength === 0 && derivedTotalPages === undefined;
  const computedLast = derivedTotalPages === 0
    || (derivedTotalPages !== undefined && number >= derivedTotalPages - 1)
    || isShortPage
    || isEmptyUnknownPage;
  const last = payload.last === true || computedLast;
  const totalElements = explicitTotalElements ?? (number * size + contentLength);
  const totalPages = derivedTotalPages ?? (last ? number + 1 : number + 2);

  return {
    last,
    number,
    size,
    totalElements,
    totalPages,
  };
};

export const getNextPageParamFromPageResponse = (
  lastPage: PageResponseLike | null | undefined,
  allPages: readonly PageResponseLike[] = [],
): number | undefined => {
  if (!lastPage) {
    return undefined;
  }

  const contentLength = Array.isArray(lastPage.content) ? lastPage.content.length : 0;
  const pageMeta = normalizePageResponseMeta(lastPage, contentLength);

  if (pageMeta.last) {
    return undefined;
  }

  const hasPageNumber = lastPage.number !== undefined || lastPage.page?.number !== undefined;
  const currentPage = hasPageNumber ? pageMeta.number : Math.max(allPages.length - 1, 0);
  const nextPage = currentPage + 1;

  return nextPage < pageMeta.totalPages ? nextPage : undefined;
};
