declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __BEGA_ADSENSE_SCRIPT_PROMISE__?: Promise<void>;
  }
}

const ADSENSE_SCRIPT_ID = 'bega-adsense-script';
const ADSENSE_SCRIPT_ORIGIN = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

const getAdSenseScriptSrc = (client: string): string => {
  return `${ADSENSE_SCRIPT_ORIGIN}?client=${encodeURIComponent(client)}`;
};

export const loadAdSenseScript = async (client: string): Promise<void> => {
  if (typeof document === 'undefined') {
    return;
  }

  if (!client) {
    throw new Error('adsense_client_missing');
  }

  if (window.__BEGA_ADSENSE_SCRIPT_PROMISE__) {
    return window.__BEGA_ADSENSE_SCRIPT_PROMISE__;
  }

  const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    window.__BEGA_ADSENSE_SCRIPT_PROMISE__ = Promise.resolve();
    return window.__BEGA_ADSENSE_SCRIPT_PROMISE__;
  }

  window.__BEGA_ADSENSE_SCRIPT_PROMISE__ = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = getAdSenseScriptSrc(client);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('adsense_script_load_failed'));
    document.head.appendChild(script);
  });

  return window.__BEGA_ADSENSE_SCRIPT_PROMISE__;
};

export const requestAdSenseFill = (adElement: HTMLElement): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (adElement.dataset.adsenseRequested === 'true') {
    return true;
  }

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    adElement.dataset.adsenseRequested = 'true';
    return true;
  } catch {
    return false;
  }
};
