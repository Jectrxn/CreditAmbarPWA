/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(255, 255, 255, 0.08)',
          'bg-subtle': 'rgba(255, 255, 255, 0.04)',
          'bg-prominent': 'rgba(255, 255, 255, 0.14)',
          'bg-dark': 'rgba(15, 23, 42, 0.65)',
          'bg-modal': 'rgba(15, 23, 42, 0.8)',
          border: 'rgba(255, 255, 255, 0.18)',
          'border-subtle': 'rgba(255, 255, 255, 0.08)',
          'border-glow': 'rgba(99, 102, 241, 0.35)',
        },
      },
      backdropBlur: {
        'glass-sm': '8px',
        'glass-md': '16px',
        'glass-lg': '24px',
        'glass-xl': '40px',
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.45)',
        'glass-glow': '0 0 20px 2px rgba(99, 102, 241, 0.3)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      },
    },
  },
  plugins: [],
};
