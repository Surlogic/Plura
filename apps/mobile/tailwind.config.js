/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0C7A68',
        primaryStrong: '#095C50',
        primaryLight: '#57CAA7',
        secondary: '#102033',
        secondarySoft: '#1A3147',
        background: '#F5F1EB',
        backgroundSoft: '#EFE7DB',
        surface: '#FFFAF4',
        ink: '#0C1724',
        muted: '#56677A',
        faint: '#8493A5',
        border: '#E4D7C5',
        accent: '#2D9BF0',
        premium: '#B76ADB',
        glow: 'rgba(45, 155, 240, 0.16)',
      }
    },
  },
  plugins: [],
}
