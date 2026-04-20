/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0d2137', light: '#1a3a5c' },
        brand: { DEFAULT: '#1a56db', light: '#e8f0fe' },
      },
      fontFamily: {
        arabic: ['Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
