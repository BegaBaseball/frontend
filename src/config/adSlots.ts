import type { AdCreativeType, AdExperimentVariant, AdRolloutWave } from '../utils/adAnalytics';

export type ManagedAdSlotId =
  | 'cheer_feed_1'
  | 'home_mid_1'
  | 'stadium_partner_1'
  | 'cheer_detail_1'
  | 'mate_list_1'
  | 'mate_detail_1';

export interface ManagedAdSlotConfig {
  slotId: ManagedAdSlotId;
  wave: AdRolloutWave;
  creativeType: AdCreativeType;
  adFormat: 'auto' | 'fluid';
  adLayout?: 'in-article';
  fullWidthResponsive?: boolean;
  minHeight?: number;
}

const env = import.meta.env as Record<string, string | undefined>;

const parseEnabledFlag = (value: string | undefined, fallback = true): boolean => {
  if (value == null || value.trim() === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
};

const normalizeSlotEnvKey = (slotId: string): string => {
  return slotId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
};

export const AD_SLOT_CONFIGS: Record<ManagedAdSlotId, ManagedAdSlotConfig> = {
  cheer_feed_1: {
    slotId: 'cheer_feed_1',
    wave: 'ads_wave1',
    creativeType: 'native_card',
    adFormat: 'fluid',
    adLayout: 'in-article',
    fullWidthResponsive: true,
    minHeight: 156,
  },
  home_mid_1: {
    slotId: 'home_mid_1',
    wave: 'ads_wave1',
    creativeType: 'banner',
    adFormat: 'auto',
    fullWidthResponsive: true,
    minHeight: 164,
  },
  stadium_partner_1: {
    slotId: 'stadium_partner_1',
    wave: 'ads_wave1',
    creativeType: 'banner',
    adFormat: 'auto',
    fullWidthResponsive: true,
    minHeight: 176,
  },
  cheer_detail_1: {
    slotId: 'cheer_detail_1',
    wave: 'ads_wave2',
    creativeType: 'native_card',
    adFormat: 'fluid',
    adLayout: 'in-article',
    fullWidthResponsive: true,
    minHeight: 152,
  },
  mate_list_1: {
    slotId: 'mate_list_1',
    wave: 'ads_wave2',
    creativeType: 'native_card',
    adFormat: 'fluid',
    adLayout: 'in-article',
    fullWidthResponsive: true,
    minHeight: 188,
  },
  mate_detail_1: {
    slotId: 'mate_detail_1',
    wave: 'ads_wave2',
    creativeType: 'banner',
    adFormat: 'auto',
    fullWidthResponsive: true,
    minHeight: 176,
  },
};

export const getAdSlotConfig = (slotId: string): ManagedAdSlotConfig | null => {
  if (slotId in AD_SLOT_CONFIGS) {
    return AD_SLOT_CONFIGS[slotId as ManagedAdSlotId];
  }

  return null;
};

export const isAdSlotEnabled = (slotId: string): boolean => {
  const config = getAdSlotConfig(slotId);

  if (!parseEnabledFlag(env.VITE_ADS_ENABLED, true)) {
    return false;
  }

  if (!config) {
    return true;
  }

  const waveFlagKey = config.wave === 'ads_wave1' ? 'VITE_ADS_WAVE1_ENABLED' : 'VITE_ADS_WAVE2_ENABLED';
  if (!parseEnabledFlag(env[waveFlagKey], true)) {
    return false;
  }

  const slotFlagKey = `VITE_AD_SLOT_${normalizeSlotEnvKey(slotId)}_ENABLED`;
  return parseEnabledFlag(env[slotFlagKey], true);
};

export const getForcedAdVariant = (wave: AdRolloutWave): AdExperimentVariant | null => {
  const raw = (env.VITE_ADS_FORCE_VARIANT || '').trim();
  if (!raw) {
    return null;
  }

  if (raw === 'control') {
    return 'control';
  }

  if (raw === wave) {
    return wave;
  }

  return 'control';
};

export const getAdSenseClient = (): string => {
  return (env.VITE_ADSENSE_CLIENT || '').trim();
};

export const getAdSenseSlotUnit = (slotId: string): string => {
  const envKey = `VITE_ADSENSE_SLOT_${normalizeSlotEnvKey(slotId)}`;
  return (env[envKey] || '').trim();
};

export const isAdSenseTestMode = (): boolean => {
  return parseEnabledFlag(env.VITE_ADSENSE_TEST_MODE, false);
};
