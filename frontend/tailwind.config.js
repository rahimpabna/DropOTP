/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf7',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb6',
          400: '#4ade94',
          500: '#22c56e',
          600: '#16a355',
          700: '#00674f',
          800: '#00503d',
          900: '#003a2c',
        },
        accent: {
          orange: '#ff6f00',
          'orange-hover': '#e65c00',
        },
        mint: {
          light: '#e9f4ee',
          surface: '#ffffff',
          card: '#f4fbf7',
          border: '#cfe2d7',
        },
      },
    },
  },
  plugins: [],
};
