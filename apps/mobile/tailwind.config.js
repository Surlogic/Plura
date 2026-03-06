/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#1FB6A6',
        secondary: '#0E2A47',
        background: '#F5F8F7',
        surface: '#FFFFFF',
        ink: '#171717',
        muted: '#64748B',
        glow: 'rgba(31, 182, 166, 0.2)',
      }
    },
  },
  plugins: [],
}