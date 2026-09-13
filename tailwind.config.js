/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        brandSoft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
        done: 'rgb(var(--c-done) / <alpha-value>)',
        doneSoft: 'rgb(var(--c-done-soft) / <alpha-value>)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px -12px rgb(0 0 0 / 0.18)',
        lift: '0 2px 6px rgb(0 0 0 / 0.06), 0 18px 40px -20px rgb(0 0 0 / 0.30)',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Segoe UI',
          'Roboto',
          'Noto Sans KR',
          'sans-serif',
        ],
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        stampIn: {
          '0%': { transform: 'scale(1.8) rotate(-14deg)', opacity: '0' },
          '55%': { transform: 'scale(0.92) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        nudge: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        sparkle: {
          '0%': { transform: 'translate(0,0) scale(0)', opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) scale(1)', opacity: '0' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        popIn: 'popIn 340ms cubic-bezier(.2,.9,.3,1.4)',
        stampIn: 'stampIn 420ms cubic-bezier(.2,.9,.3,1.3)',
        nudge: 'nudge 180ms ease-in-out 2',
        sparkle: 'sparkle 620ms ease-out forwards',
        fadeUp: 'fadeUp 320ms ease-out',
        fadeIn: 'fadeIn 240ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
