/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          900: '#023E8A',
          800: '#0077B6',
          700: '#00B4D8',
          600: '#48CAE4',
          500: '#90E0EF',
        },
        sand: {
          800: '#B8956A',
          700: '#D4A574',
          600: '#E8D4B8',
          500: '#FAF9F6',
        },
      },
    },
  },
  plugins: [],
}