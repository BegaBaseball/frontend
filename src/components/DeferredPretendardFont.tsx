import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PRETENDARD_STYLESHEET_ID = 'bega-pretendard-stylesheet';
const PRETENDARD_STYLESHEET_HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css';
const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';
const FONT_IDLE_TIMEOUT_MS = 3000;
const HOME_FONT_FALLBACK_DELAY_MS = 5000;

type HomeFirstCardReadyWindow = Window & {
  __begaHomeFirstCardReadyPathname?: string;
};

export default function DeferredPretendardFont() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    if (document.getElementById(PRETENDARD_STYLESHEET_ID)) {
      return;
    }

    let cancelled = false;
    let hasRequestedFont = false;
    let idleId: number | null = null;
    let fallbackId: number | null = null;
    let homeFallbackId: number | null = null;

    const appendStylesheet = () => {
      if (cancelled || document.getElementById(PRETENDARD_STYLESHEET_ID)) {
        return;
      }

      const stylesheet = document.createElement('link');
      stylesheet.id = PRETENDARD_STYLESHEET_ID;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = PRETENDARD_STYLESHEET_HREF;
      stylesheet.crossOrigin = 'anonymous';
      stylesheet.dataset.begaDeferredFont = 'true';
      document.head.appendChild(stylesheet);
    };

    const requestFontWhenReady = () => {
      if (cancelled || hasRequestedFont) {
        return;
      }

      hasRequestedFont = true;
      if (homeFallbackId !== null) {
        window.clearTimeout(homeFallbackId);
        homeFallbackId = null;
      }

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(appendStylesheet, { timeout: FONT_IDLE_TIMEOUT_MS });
        return;
      }

      fallbackId = window.setTimeout(appendStylesheet, 0);
    };

    const homeWindow = window as HomeFirstCardReadyWindow;
    const isHomeRoute = /^\/home\/?$/.test(pathname);
    const handleHomeFirstCardReady = () => {
      const readyPathname = homeWindow.__begaHomeFirstCardReadyPathname;
      if (readyPathname !== pathname) {
        return;
      }

      requestFontWhenReady();
    };

    // Keep external font fetches off the /home first-card critical path.
    if (isHomeRoute) {
      if (homeWindow.__begaHomeFirstCardReadyPathname === pathname) {
        requestFontWhenReady();
      } else {
        window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);
        homeFallbackId = window.setTimeout(requestFontWhenReady, HOME_FONT_FALLBACK_DELAY_MS);
      }
    } else {
      requestFontWhenReady();
    }

    return () => {
      cancelled = true;
      window.removeEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (fallbackId !== null) {
        window.clearTimeout(fallbackId);
      }
      if (homeFallbackId !== null) {
        window.clearTimeout(homeFallbackId);
      }
    };
  }, [pathname]);

  return null;
}
