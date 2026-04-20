/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand palette extraída del logo ──────────────────────
        brand: {
          teal:        '#2ec4c8',
          'teal-light':'#5dd5d8',
          'teal-dark': '#1a9ea2',
          'teal-glow': 'rgba(46,196,200,0.15)',
          copper:        '#c4874a',
          'copper-light':'#d9a070',
          'copper-dark': '#9e6634',
          'copper-glow': 'rgba(196,135,74,0.15)',
          silver:        '#c0c0c0',
        },
        // ── Slate reemplazado por neutros cálidos (sin tinte azul) ─
        slate: {
          600: '#5a5e65',
          700: '#3a3d42',
          800: '#252729',
          900: '#161718',
          950: '#0d0e0f',
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
