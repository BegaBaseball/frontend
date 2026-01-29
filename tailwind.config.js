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
        retro: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: '#2d5f4f',
          light: '#3a7760',
          dark: '#1f4436',
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
        // 다크모드용 배경색
        dark: {
          bg: '#1a1a1a',
          card: '#2a2a2a',
          border: '#3a3a3a',
        }
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
