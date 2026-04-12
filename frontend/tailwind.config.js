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
          200: '#d4d4d4',
          300: '#b8b8b8',
          400: '#a0a0a0',
          500: '#888888',
          600: '#6e6e6e',
          700: '#545454',
          800: '#3a3a3a',
          900: '#202020',
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
