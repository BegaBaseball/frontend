/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 'class' 방식으로 다크모드 활성화
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 프로젝트 메인 컬러
        primary: {
          DEFAULT: '#2d5f4f',
          light: '#3a7760',
          dark: '#1f4436',
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
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
