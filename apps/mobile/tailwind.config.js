/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0A7A43',
        primaryStrong: '#086537',
        primaryLight: '#8EDB63',
        secondary: '#0F172A',
        secondarySoft: '#162033',
        background: '#F5F1EB',
        backgroundSoft: '#EFE7DB',
        backgroundMuted: '#FCF8F2',
        surface: '#FFFAF4',
        ink: '#0F172A',
        muted: '#516072',
        faint: '#7D8DA1',
        border: '#E4D7C5',
        accent: '#36C8F4',
        premium: '#C88AF3',
        glow: 'rgba(54, 200, 244, 0.12)',
      }
    },
  },
  plugins: [],
}
