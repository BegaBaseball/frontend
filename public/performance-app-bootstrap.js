(() => {
  const currentScript = document.currentScript;
  if (!(currentScript instanceof HTMLScriptElement)) {
    return;
  }

  const moduleSrc = currentScript.dataset.moduleSrc;
  if (!moduleSrc) {
    return;
  }

  document.querySelectorAll('link[data-performance-app-style="true"]').forEach((link) => {
    if (link instanceof HTMLLinkElement && link.rel !== 'stylesheet') {
      link.rel = 'stylesheet';
    }
  });

  const startAppModule = () => {
    void import(moduleSrc);
  };

  globalThis.requestAnimationFrame(() => {
    globalThis.setTimeout(startAppModule, 0);
  });
})();
