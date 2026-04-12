/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f8f8f8',
          100: '#e8e8e8',
          200: '#d0d0d0',
          300: '#b0b0b0',
          400: '#909090',
          500: '#707070',
          600: '#505050',
          700: '#383838',
          800: '#242424',
          900: '#141414',
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
