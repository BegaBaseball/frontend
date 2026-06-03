(function () {
  const normalizeTheme = (value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const stripQuotes = (raw) => {
      const trimmed = raw.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1).trim();
      }
      return trimmed;
    };

    const getDirectTheme = (rawValue) => {
      const normalized = stripQuotes(rawValue).toLowerCase();
      if (normalized === 'dark' || normalized === 'light') {
        return normalized;
      }
      return null;
    };

    let normalized = getDirectTheme(value);
    if (normalized) {
      return normalized;
    }

    let candidate = value;
    for (let i = 0; i < 3; i += 1) {
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed === 'string') {
          candidate = parsed;
          normalized = getDirectTheme(candidate);
          if (normalized) {
            return normalized;
          }
          continue;
        }

        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.theme === 'string'
        ) {
          candidate = parsed.theme;
          normalized = getDirectTheme(candidate);
          if (normalized) {
            return normalized;
          }
          continue;
        }
      } catch (error) {
        break;
      }
      break;
    }

    return null;
  };

  const storedTheme = normalizeTheme(localStorage.getItem('kbo-theme'));
  const legacyTheme = normalizeTheme(localStorage.getItem('bega-theme'));
  const previousTheme = normalizeTheme(localStorage.getItem('theme'));
  const migrationTheme = legacyTheme || previousTheme;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const theme = storedTheme || migrationTheme || (systemPrefersDark ? 'dark' : 'light');
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  const bgColor = theme === 'dark' ? '#000000' : '#ffffff';
  if (theme === 'dark') {
    document.body && (document.body.style.backgroundColor = '#000000');
    root.style.backgroundColor = '#000000';
  } else {
    if (document.body) {
      document.body.style.backgroundColor = '#ffffff';
    }
    root.style.backgroundColor = '';
  }

  const loader = document.getElementById('app-shell-loader');
  if (loader) {
    loader.style.backgroundColor = bgColor;
  }

  if (!storedTheme && migrationTheme) {
    localStorage.setItem('kbo-theme', migrationTheme);
    localStorage.removeItem('bega-theme');
    localStorage.removeItem('theme');
  } else if (storedTheme && localStorage.getItem('kbo-theme') !== storedTheme) {
    localStorage.setItem('kbo-theme', storedTheme);
  } else if (!storedTheme && !migrationTheme) {
    localStorage.removeItem('kbo-theme');
    localStorage.removeItem('bega-theme');
    localStorage.removeItem('theme');
  }
})();
