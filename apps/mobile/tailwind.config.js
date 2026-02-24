/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#1FB6A6',
        secondary: '#0E2A47',
        background: '#F4F6F8',
        surface: '#FFFFFF',
      }
    },
  },
  plugins: [],
}