(() => {
  if (!document.querySelector('[data-performance-prerender="true"]')) {
    return;
  }

  const shellLoader = document.getElementById('app-shell-loader');
  if (shellLoader) {
    shellLoader.remove();
  }
})();
