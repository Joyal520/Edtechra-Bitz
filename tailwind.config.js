/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f6',
          500: '#0e8ce4',
          600: '#026fc3',
          700: '#03589e',
          800: '#074c82',
          900: '#0c3f6c',
          950: '#082847',
        },
        accent: {
          teal: '#0d9488',
          amber: '#f59e0b',
          purple: '#8b5cf6',
          rose: '#f43f5e',
          emerald: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        reading: ['Lora', 'Georgia', 'serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        ui: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
