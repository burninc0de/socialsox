/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          400: '#7c8aeb',
          500: '#667eea',
          600: '#5a67d8',
          700: '#4c51bf',
          900: '#2d3748',
        },
      },
    },
  },
  plugins: [],
}