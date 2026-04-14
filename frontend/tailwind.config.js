/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ffffff',
          100: '#e8e8e8',
          200: '#c8c8c8',
          300: '#a8a8a8',
          400: '#c0c0c0',
          500: '#a0a0a0',
          600: '#787878',
          700: '#505050',
          800: '#282828',
          900: '#101010',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
