import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ambar: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Amarillo oro del logo Ámbar
          600: '#d97706',
          700: '#b45309',
        },
        magenta: {
          500: '#e11d48', // Fucsia/magenta del logo
          600: '#be123c',
        },
        lima: {
          500: '#84cc16', // Verde lima del logo
          600: '#65a30d',
        },
        glass: {
          surface: 'rgba(255, 255, 255, 0.65)',
          'surface-subtle': 'rgba(255, 255, 255, 0.45)',
          'surface-prominent': 'rgba(255, 255, 255, 0.82)',
          border: 'rgba(255, 255, 255, 0.85)',
          'border-subtle': 'rgba(255, 255, 255, 0.5)',
        },
      },
      backdropBlur: {
        'glass-sm': '8px',
        'glass-md': '16px',
        'liquid': '17px', // Calibrated Liquid Glass Master default
        'glass-lg': '24px',
        'glass-xl': '40px',
      },
      borderRadius: {
        'organic': '2.5rem',
      },
      boxShadow: {
        'liquid-pill': '0 8px 24px -2px rgba(15, 23, 42, 0.08), 0 2px 6px 0 rgba(15, 23, 42, 0.03), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.95)',
        'liquid-card': '0 12px 36px -4px rgba(15, 23, 42, 0.07), 0 4px 12px -2px rgba(15, 23, 42, 0.03), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95)',
        'liquid-glass': 'inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.1), 0 20px 40px -15px rgba(0, 0, 0, 0.2)',
        'specular-rim': 'inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.1), 0 20px 40px -15px rgba(0, 0, 0, 0.2)',
        'specular-well': 'inset 0 1px 1px rgba(255, 255, 255, 0.3)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
