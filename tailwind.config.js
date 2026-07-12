/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 'class' 방식으로 다크모드 활성화
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        native: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        retro: ['"Press Start 2P"', 'monospace'],
      },
      // Font-size tokens — plain strings = font-size ONLY (no paired line-height),
      // so they replace arbitrary `text-[NNpx]` without shifting cascade line-height.
      // 14/16 reuse the semantic SSOT tokens from index.css. See docs/design-tokens.md.
      fontSize: {
        body: 'var(--font-body-size)',        // 16px
        caption: 'var(--font-caption-size)',  // 14px
        '8': '8px', '9': '9px', '10': '10px', '11': '11px', '12': '12px',
        '13': '13px', '15': '15px', '17': '17px', '18': '18px', '19': '19px',
        '20': '20px', '22': '22px', '30': '30px', '32': '32px', '38': '38px',
        '120': '120px', '160': '160px',
      },
      // Radius tokens for sizes without an exact Tailwind default (8/12/16/24
      // reuse rounded-lg/xl/2xl/3xl). Replaces arbitrary `rounded-[NNpx]`.
      borderRadius: {
        '7': '7px', '9': '9px', '10': '10px', '11': '11px', '13': '13px',
        '14': '14px', '18': '18px', '20': '20px', '22': '22px', '26': '26px',
        '28': '28px', '30': '30px', '32': '32px', '40': '40px', '56': '56px',
      },
      boxShadow: {
        'cheer-mobile-chrome': 'var(--shadow-cheer-mobile-chrome)',
        'cheer-mobile-chrome-dark': 'var(--shadow-cheer-mobile-chrome-dark)',
        dialog: 'var(--shadow-dialog)',
        'home-board': 'var(--shadow-home-board)',
        'mobile-action': 'var(--shadow-mobile-action)',
        'mobile-chrome': 'var(--shadow-mobile-chrome)',
        'mobile-tab-active': 'var(--shadow-mobile-tab-active)',
        'navbar-capsule': 'var(--shadow-navbar-capsule)',
        'navbar-capsule-dark': 'var(--shadow-navbar-capsule-dark)',
        'navbar-pill': 'var(--shadow-navbar-pill)',
        'navbar-pill-dark': 'var(--shadow-navbar-pill-dark)',
        'navbar-pill-hover': 'var(--shadow-navbar-pill-hover)',
        surface: 'var(--shadow-surface)',
        floating: 'var(--shadow-floating)',
      },
      gridTemplateColumns: {
        'home-game-card': '5.5rem minmax(0,1.25fr) 5rem minmax(0,1.25fr) minmax(8rem,0.85fr) 7.5rem',
        'navbar-capsule': 'auto minmax(0,1fr) auto',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          // Brand green shades — defined once in index.css (single source of truth).
          hover: 'rgb(var(--brand-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--brand-primary-light) / <alpha-value>)',
          dark: 'rgb(var(--brand-primary-rest) / <alpha-value>)',
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out-down': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        'like-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.4)' },
          '70%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        'like-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'roll-in-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'roll-out-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-12px)', opacity: '0' },
        },
        'roll-in-down': {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'roll-out-down': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(12px)', opacity: '0' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'cheer-highlight-flash': {
          '0%': { backgroundColor: 'var(--cheer-highlight-bg)' },
          '100%': { backgroundColor: 'var(--cheer-card-bg)' },
        },
        // Retro leaderboard animations
        'crt-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.98' },
        },
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'score-pop': {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(5deg)' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'neon-pulse': {
          '0%, 100%': { textShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { textShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'combo-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'fade-out-down': 'fade-out-down 0.3s ease-in forwards',
        'like-pop': 'like-pop 0.45s ease-out',
        'like-ring': 'like-ring 0.45s ease-out',
        'roll-in-up': 'roll-in-up 0.3s ease-out',
        'roll-out-up': 'roll-out-up 0.3s ease-out',
        'roll-in-down': 'roll-in-down 0.3s ease-out',
        'roll-out-down': 'roll-out-down 0.3s ease-out',
        'skeleton-pulse': 'skeleton-pulse 1.1s ease-out infinite',
        'cheer-highlight-flash': 'cheer-highlight-flash 1.6s ease-out',
        // Retro leaderboard animations
        'crt-flicker': 'crt-flicker 0.15s infinite',
        'pixel-bounce': 'pixel-bounce 0.6s ease-in-out infinite',
        'score-pop': 'score-pop 0.5s ease-out',
        'neon-pulse': 'neon-pulse 2s infinite',
        'combo-shake': 'combo-shake 0.5s infinite',
      }
    },
  },
  plugins: [],
}
