import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PRETENDARD_STYLESHEET_ID = 'bega-pretendard-stylesheet';
const PRETENDARD_STYLESHEET_HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css';

export default function DeferredPretendardFont() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(PRETENDARD_STYLESHEET_ID)) {
      return;
    }

    const stylesheet = document.createElement('link');
    stylesheet.id = PRETENDARD_STYLESHEET_ID;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = PRETENDARD_STYLESHEET_HREF;
    stylesheet.crossOrigin = 'anonymous';
    stylesheet.dataset.begaDeferredFont = 'true';
    document.head.appendChild(stylesheet);
  }, [pathname]);

  return null;
}
