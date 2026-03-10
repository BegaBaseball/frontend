export type AdDeviceType = 'mobile' | 'desktop';
export type AdCreativeType = 'native_card' | 'sponsor_card' | 'banner';
export type AdExperimentVariant = 'control' | 'ads_wave1' | 'ads_wave2';
export type AdRolloutWave = Exclude<AdExperimentVariant, 'control'>;
export type AdEventName =
  | 'ad_slot_requested'
  | 'ad_slot_rendered'
  | 'ad_slot_viewable'
  | 'ad_slot_clicked'
  | 'ad_slot_no_fill';

export interface AdEventPayload {
  slotId: string;
  slotExposureId: string;
  pageType: string;
  contentId?: string | null;
  listIndex?: number | null;
  creativeType?: AdCreativeType;
  variant?: AdExperimentVariant;
  abBucket?: string;
  pagePath?: string;
  deviceType?: AdDeviceType;
  loggedIn?: boolean;
  userId?: string | null;
  sessionId?: string;
  scrollDepthPct?: number;
  requestProvider?: string;
  adProvider?: string;
  creativeId?: string;
  destinationDomain?: string;
  viewportPct?: number;
  viewableMs?: number;
  reason?: string;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SESSION_STORAGE_KEY = 'bega:ads:session-id';
const EXPERIMENT_STORAGE_KEY_PREFIX = 'bega:ads:bucket:';
const DEFAULT_TEST_RATIO = 0.5;

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

const compactPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );
};

const generateRandomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getStorage = (type: 'localStorage' | 'sessionStorage'): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[type];
  } catch {
    return null;
  }
};

const getCurrentPagePath = (): string => {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search || ''}`;
};

const getOrCreateSessionId = (): string => {
  const storage = getStorage('sessionStorage');

  if (!storage) {
    return generateRandomId();
  }

  const existing = storage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = generateRandomId();
  storage.setItem(SESSION_STORAGE_KEY, next);
  return next;
};

export const createSlotExposureId = (slotId = 'ad-slot'): string => {
  const normalizedSlotId = slotId.trim().replace(/\s+/g, '-').toLowerCase() || 'ad-slot';
  return `${normalizedSlotId}:${generateRandomId()}`;
};

export const getDeviceType = (): AdDeviceType => {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  return window.innerWidth < 1024 ? 'mobile' : 'desktop';
};

export const getScrollDepthPct = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const doc = document.documentElement;
  const scrollTop = Math.max(window.scrollY, doc.scrollTop, 0);
  const viewportHeight = window.innerHeight || doc.clientHeight || 0;
  const scrollHeight = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  const maxScrollable = Math.max(scrollHeight - viewportHeight, 0);

  if (maxScrollable === 0) {
    return 100;
  }

  return Math.round(clamp((scrollTop / maxScrollable) * 100, 0, 100));
};

export const getAdExperimentVariant = (wave: AdRolloutWave = 'ads_wave1'): AdExperimentVariant => {
  const forcedVariant = (import.meta.env.VITE_ADS_FORCE_VARIANT || '').trim();
  if (forcedVariant === 'control') {
    return 'control';
  }

  if (forcedVariant === wave) {
    return wave;
  }

  if (forcedVariant === 'ads_wave1' || forcedVariant === 'ads_wave2') {
    return 'control';
  }

  const storage = getStorage('localStorage');
  if (!storage) {
    return wave;
  }

  const key = `${EXPERIMENT_STORAGE_KEY_PREFIX}${wave}`;
  const existing = storage.getItem(key);
  if (existing === 'control' || existing === wave) {
    return existing;
  }

  const nextVariant: AdExperimentVariant = Math.random() < DEFAULT_TEST_RATIO ? wave : 'control';
  storage.setItem(key, nextVariant);
  return nextVariant;
};

export const resolveAdDestinationDomain = (href?: string | null): string | undefined => {
  if (!href || typeof window === 'undefined') {
    return undefined;
  }

  try {
    return new URL(href, window.location.origin).hostname || undefined;
  } catch {
    return undefined;
  }
};

export const trackAdEvent = (eventName: AdEventName, payload: AdEventPayload): boolean => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false;
  }

  const variant = payload.variant ?? 'control';

  window.gtag(
    'event',
    eventName,
    compactPayload({
      event_name: eventName,
      occurred_at: new Date().toISOString(),
      session_id: payload.sessionId ?? getOrCreateSessionId(),
      user_id: payload.userId ?? undefined,
      logged_in: payload.loggedIn ?? false,
      device_type: payload.deviceType ?? getDeviceType(),
      page_path: payload.pagePath ?? getCurrentPagePath(),
      page_type: payload.pageType,
      slot_id: payload.slotId,
      slot_exposure_id: payload.slotExposureId,
      variant,
      creative_type: payload.creativeType,
      scroll_depth_pct: payload.scrollDepthPct ?? getScrollDepthPct(),
      content_id: payload.contentId,
      list_index: payload.listIndex,
      ab_bucket: payload.abBucket ?? variant,
      request_provider: payload.requestProvider,
      ad_provider: payload.adProvider,
      creative_id: payload.creativeId,
      destination_domain: payload.destinationDomain,
      viewport_pct: payload.viewportPct,
      viewable_ms: payload.viewableMs,
      reason: payload.reason,
    }),
  );

  return true;
};
